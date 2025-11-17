import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import numpy as np
from datetime import datetime
import os
import json
import pickle
from sklearn.metrics import mean_absolute_error, mean_squared_error
import pandas as pd
from feature_transformer import FeatureTransformer
import matplotlib.pyplot as plt


def create_sequences(data, seq_length, n_features):
    xs, ys = [], []
    for i in range(len(data) - seq_length):
        # Input features (all columns except the last one)
        x = data[i:i+seq_length, :n_features]
        # Target variable (last column)
        y = data[i+seq_length, -1]
        xs.append(x)
        ys.append(y)
    return np.array(xs), np.array(ys)


def read_financial_transactions():
    df = pd.read_csv('../data/financial_transactions.csv')
    df['datetime'] = pd.to_datetime(df['date'] + ' ' + df['time'])
    df.drop(columns=['account_id', 'transaction_id', 'date', 'time'], inplace=True)
    return df


# Define LSTM model using PyTorch
class LSTMModel(nn.Module):
    def __init__(self, input_size=12, hidden_size=50, num_layers=2, output_size=1):
        super(LSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm1 = nn.LSTM(input_size, hidden_size, num_layers=1, batch_first=True)
        self.dropout1 = nn.Dropout(0.2)
        self.lstm2 = nn.LSTM(hidden_size, hidden_size, num_layers=1, batch_first=True)
        self.dropout2 = nn.Dropout(0.2)
        self.fc = nn.Linear(hidden_size, output_size)
        
    def forward(self, x):
        h0_1 = torch.zeros(1, x.size(0), self.hidden_size).to(x.device)
        c0_1 = torch.zeros(1, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm1(x, (h0_1, c0_1))
        out = self.dropout1(out)
        
        h0_2 = torch.zeros(1, x.size(0), self.hidden_size).to(x.device)
        c0_2 = torch.zeros(1, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm2(out, (h0_2, c0_2))
        out = self.dropout2(out)
        
        # Take only the last time step output
        out = out[:, -1, :]  # Shape: [batch_size, hidden_size]
        out = self.fc(out)   # Shape: [batch_size, output_size]
        return out


class ModelPipeline:
    def __init__(self, sequence_length=4, hidden_size=50, num_layers=2):
        self.sequence_length = sequence_length
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Dictionaries to store models and scalers for each category
        self.models = {}
        self.scalers = {}
        
         # Add metadata tracking
        self.metadata = {
            'last_trained': None,
            'training_history': {},
            'model_version': '1.0'
        }
        
    def preprocess_data(self, df, category):
        """Preprocess data for a specific category"""
        # Filter data for category and sort by datetime
        category_data = df[df['category'] == category].sort_values('datetime')
        category_data = category_data.drop(columns=['category'])
        
        # Add error checking for empty category data
        if len(category_data) == 0:
            raise ValueError(f"No data found for category: {category}")
        
        # Separate features and target
        numeric_columns = category_data.select_dtypes(include=[np.number]).columns
        feature_columns = [col for col in numeric_columns if col != 'amount']
        
        # Add error checking for empty feature columns
        if not feature_columns:
            raise ValueError(f"No numeric feature columns found for category: {category}")
        
        # Scale features and target
        feature_scaler = MinMaxScaler(feature_range=(0, 1))
        target_scaler = MinMaxScaler(feature_range=(0, 1))
        
        scaled_features = feature_scaler.fit_transform(category_data[feature_columns])
        scaled_target = target_scaler.fit_transform(category_data[['amount']])
        
        # Store scalers
        self.scalers[category] = {
            'feature_scaler': feature_scaler,
            'target_scaler': target_scaler,
            'feature_columns': feature_columns
        }
        
        return np.hstack((scaled_features, scaled_target))
    
    def train(self, df_train, categories=None, num_epochs=100, batch_size=32, patience=10):
        """Train models for all categories or specified categories"""
        # Apply feature transformation
        feature_transformer = FeatureTransformer()
        df_train = feature_transformer.fit_transform(df_train)
        
        # Store all unique dates and get all columns except 'amount', 'category', and 'datetime'
        feature_cols = [col for col in df_train.columns if col not in ['amount', 'category', 'datetime']]
        all_dates = df_train['datetime'].unique()
        
        if categories is None:
            categories = df_train['category'].unique()
            
        for category in categories:
            print(f"\nTraining model for category: {category}")
            
            # Create base DataFrame with all dates
            full_dates_df = pd.DataFrame({'datetime': all_dates})
            # print(f"Full dates df shape: {full_dates_df.shape}")
            # print(f"Full dates df columns: {full_dates_df.columns}")
            # print(f"Full dates df: {full_dates_df}")
            # First merge with df_train to get all feature values for each datetime
            full_dates_df = full_dates_df.merge(
                df_train[['datetime'] + feature_cols].drop_duplicates(),
                on='datetime',
                how='left'
            )
            
            # Then merge with category specific data to get amounts
            category_data = df_train[df_train['category'] == category]
            category_df = full_dates_df.merge(
                category_data[['datetime', 'amount']],
                on='datetime',
                how='left'
            )
            # print(f"Category df shape: {category_df.shape}")
            # print(f"Category df columns: {category_df.columns}")
            # print(f"Category df: {category_df}")
            
            # Sort by datetime to ensure temporal order
            category_df = category_df.sort_values('datetime')
            
            # Fill missing amount with 0
            category_df['amount'] = category_df['amount'].fillna(0)
            
            # print(f"Missing values:{category_df[category_df.isna().any(axis=1)]}")
            
            # Add category column back
            category_df['category'] = category
            
            # print(f'Category columns: {category_df.columns}')
            # print(f"Category df shape: {category_df.shape}")
            
            # Preprocess data
            scaled_data = self.preprocess_data(category_df, category)
            n_features = scaled_data.shape[1] - 1  # Exclude target column
            
            # Create sequences
            X, y = create_sequences(scaled_data, self.sequence_length, n_features)
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, shuffle=False)
            
            # Convert to tensors
            X_train_tensor = torch.FloatTensor(X_train).to(self.device)
            y_train_tensor = torch.FloatTensor(y_train).to(self.device)
            X_val_tensor = torch.FloatTensor(X_val).to(self.device)
            y_val_tensor = torch.FloatTensor(y_val).to(self.device)
            
            # Create model and training components
            model = LSTMModel(input_size=n_features, 
                            hidden_size=self.hidden_size, 
                            num_layers=self.num_layers).to(self.device)
            criterion = nn.MSELoss()
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            
            # Training loop with early stopping
            best_val_loss = float('inf')
            counter = 0
            best_model_state = None
            
            train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
            
            print(f"Starting training with {len(X_train)} training samples")
            print(f"Input feature size: {n_features}")
            
            for epoch in range(num_epochs):
                model.train()
                epoch_loss = 0.0
                
                for batch_X, batch_y in train_loader:
                    # Reshape batch_y to match output shape
                    batch_y = batch_y.view(-1, 1)
                    
                    outputs = model(batch_X)
                    loss = criterion(outputs, batch_y)
                    
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()
                    
                    epoch_loss += loss.item()
                
                # Validation
                model.eval()
                with torch.no_grad():
                    val_outputs = model(X_val_tensor)
                    # Reshape validation targets
                    y_val_tensor_reshaped = y_val_tensor.view(-1, 1)
                    val_loss = criterion(val_outputs, y_val_tensor_reshaped)
                
                print(f"Epoch {epoch+1}/{num_epochs}, "
                      f"Training Loss: {epoch_loss/len(train_loader):.4f}, "
                      f"Validation Loss: {val_loss:.4f}")
            
                # Always save the first state
                if best_model_state is None:
                    best_val_loss = val_loss
                    best_model_state = model.state_dict().copy()
                    print("Saved initial model state")
                elif val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_model_state = model.state_dict().copy()
                    counter = 0
                    print("Found better model state")
                else:
                    counter += 1
                    if counter >= patience:
                        print(f"Early stopping triggered after {epoch+1} epochs")
                        break
            
            # Save best model
            model.load_state_dict(best_model_state)
            self.models[category] = model
            
             # Track training metrics
            self.metadata['training_history'][category] = {
                'trained_at': datetime.now().isoformat(),
                'epochs_trained': epoch + 1,
                'final_validation_loss': float(best_val_loss),
                'training_samples': len(X_train),
                'validation_samples': len(X_val)
            }
            
            # Calculate and store validation metrics
            model.eval()
            with torch.no_grad():
                val_predictions = model(X_val_tensor).cpu().numpy()
                val_predictions = self.scalers[category]['target_scaler'].inverse_transform(
                    val_predictions.reshape(-1, 1)
                )
                y_val_actual = self.scalers[category]['target_scaler'].inverse_transform(
                    y_val.reshape(-1, 1)
                )
                
                mae = mean_absolute_error(y_val_actual, val_predictions)
                rmse = np.sqrt(mean_squared_error(y_val_actual, val_predictions))
                
                self.metadata['training_history'][category].update({
                    'mae': float(mae),
                    'rmse': float(rmse)
                })
            
        # After training is complete, create and save plots
        self.create_training_plots(df_train, save_dir='../models/oracle_v1')
        
        # Store the feature transformer for later use
        self.feature_transformer = feature_transformer

    def predict(self, dates):
        """Make predictions for all categories for given dates"""
        if not isinstance(dates, pd.DataFrame):
            dates = pd.DataFrame({'datetime': pd.to_datetime(dates)})
        
        # Set feature transformer to prediction mode
        self.feature_transformer.set_mode(training=False)
        transformed_data = self.feature_transformer.transform(dates)
        
        # Store predictions for each category
        predictions_by_date = {}
        
        for date in transformed_data['datetime'].unique():
            date_data = transformed_data[transformed_data['datetime'] == date]
            total_prediction = 0
            
            for category in self.models.keys():
                try:
                    # Filter data for category
                    category_data = date_data.copy()
                    category_data['category'] = category
                    
                    # Get prediction for this category
                    model = self.models[category]
                    scalers = self.scalers[category]
                    feature_columns = scalers['feature_columns']
                    
                    # Preprocess input data
                    scaled_features = scalers['feature_scaler'].transform(category_data[feature_columns])
                    
                    # Create sequence
                    X = torch.FloatTensor(scaled_features).unsqueeze(0).to(self.device)
                    
                    # Make prediction
                    model.eval()
                    with torch.no_grad():
                        prediction = model(X)
                        
                    # Inverse transform prediction
                    prediction = scalers['target_scaler'].inverse_transform(
                        prediction.cpu().numpy().reshape(-1, 1)
                    )
                    
                    total_prediction += prediction[0][0]
                    
                except Exception as e:
                    print(f"Warning: Error predicting for category {category} on {date}: {str(e)}")
                    continue
            
            predictions_by_date[date] = total_prediction
        
        # Reset feature transformer to training mode
        self.feature_transformer.set_mode(training=True)
        
        # Create and save prediction plot
        # self._create_prediction_plot(predictions_by_date)
        
        return predictions_by_date

    def predict_by_category(self, dates):
        """Make predictions for each category separately for given dates"""
        if not isinstance(dates, pd.DataFrame):
            dates = pd.DataFrame({'datetime': pd.to_datetime(dates)})
        
        # Set feature transformer to prediction mode
        self.feature_transformer.set_mode(training=False)
        transformed_data = self.feature_transformer.transform(dates)
        
        # Store predictions for each category
        predictions_by_category = {}
        
        for category in self.models.keys():
            predictions_by_category[category] = {}
            try:
                for date in transformed_data['datetime'].unique():
                    date_data = transformed_data[transformed_data['datetime'] == date].copy()
                    date_data['category'] = category
                    
                    # Get prediction for this category
                    model = self.models[category]
                    scalers = self.scalers[category]
                    feature_columns = scalers['feature_columns']
                    
                    # Preprocess input data
                    scaled_features = scalers['feature_scaler'].transform(date_data[feature_columns])
                    
                    # Create sequence
                    X = torch.FloatTensor(scaled_features).unsqueeze(0).to(self.device)
                    
                    # Make prediction
                    model.eval()
                    with torch.no_grad():
                        prediction = model(X)
                        
                    # Inverse transform prediction
                    prediction = scalers['target_scaler'].inverse_transform(
                        prediction.cpu().numpy().reshape(-1, 1)
                    )
                    
                    predictions_by_category[category][date] = float(prediction[0][0])
                    
            except Exception as e:
                print(f"Warning: Error predicting for category {category}: {str(e)}")
                continue
        
        # Reset feature transformer to training mode
        self.feature_transformer.set_mode(training=True)
        
        return predictions_by_category

    def _create_prediction_plot(self, predictions_by_date, save_dir='../models/oracle_v1'):
        """Create and save plot of predictions"""
        plt.figure(figsize=(15, 8))
        plt.style.use('ggplot')
        
        dates = list(predictions_by_date.keys())
        values = list(predictions_by_date.values())
        
        plt.plot(dates, values, marker='o', linestyle='-', linewidth=2)
        plt.title('Predicted Total Transaction Amount')
        plt.xlabel('Date')
        plt.ylabel('Predicted Amount')
        plt.grid(True, alpha=0.3)
        
        # Rotate x-axis labels for better readability
        plt.xticks(rotation=45)
        
        # Add prediction statistics
        stats_text = f"Prediction Statistics:\n"
        stats_text += f"Mean: {np.mean(values):.2f}\n"
        stats_text += f"Min: {np.min(values):.2f}\n"
        stats_text += f"Max: {np.max(values):.2f}"
        
        plt.figtext(0.02, 0.02, stats_text, fontsize=10,
                    bbox=dict(facecolor='white', alpha=0.8))
        
        # Adjust layout and save
        plt.tight_layout()
        os.makedirs(os.path.join(save_dir, 'plots'), exist_ok=True)
        plt.savefig(os.path.join(save_dir, 'plots', 'future_predictions.png'), 
                    dpi=300, bbox_inches='tight')
        plt.close()

    def save(self, save_dir='../models/oracle_v1', ):
        """Save the trained models, scalers, and metadata"""
        os.makedirs(save_dir, exist_ok=True)
        
        # Save feature transformer
        transformer_path = os.path.join(save_dir, 'feature_transformer.pkl')
        with open(transformer_path, 'wb') as f:
            pickle.dump(self.feature_transformer, f)
        
        # Save metadata
        self.metadata['last_trained'] = datetime.now().isoformat()
        with open(os.path.join(save_dir, 'metadata.json'), 'w') as f:
            json.dump(self.metadata, f, indent=4)
        
        # Save models and scalers for each category
        for category in self.models:
            category_dir = os.path.join(save_dir, 'category', category)
            os.makedirs(category_dir, exist_ok=True)
            
            # Save model state
            model_path = os.path.join(category_dir, 'model.pth')
            torch.save(self.models[category].state_dict(), model_path)
            
            # Save scalers
            scalers_path = os.path.join(category_dir, 'scalers.pkl')
            with open(scalers_path, 'wb') as f:
                pickle.dump(self.scalers[category], f)
                
        # Create plots directory if it doesn't exist
        plots_dir = os.path.join(save_dir, 'plots')
        os.makedirs(plots_dir, exist_ok=True)
        
        # # Create and save aggregated plot
        # self.create_aggregated_plot(df_train, save_dir)
        
        print(f"Models and metadata saved to {save_dir}")
    
    @classmethod
    def load(cls, save_dir='../models/oracle_v1'):
        """Load a saved predictor instance"""
        predictor = cls()
        
        # Load feature transformer
        transformer_path = os.path.join(save_dir, 'feature_transformer.pkl')
        with open(transformer_path, 'rb') as f:
            predictor.feature_transformer = pickle.load(f)
        
        # Load metadata
        with open(os.path.join(save_dir, 'metadata.json'), 'r') as f:
            predictor.metadata = json.load(f)
        
        # Load models and scalers for each category
        category_dir = os.path.join(save_dir, 'category')
        for category in os.listdir(category_dir):
            category_path = os.path.join(category_dir, category)
            if not os.path.isdir(category_path):
                continue
            
            # Load scalers first to get feature information
            scalers_path = os.path.join(category_path, 'scalers.pkl')
            with open(scalers_path, 'rb') as f:
                predictor.scalers[category] = pickle.load(f)
            
            # Initialize and load model
            n_features = len(predictor.scalers[category]['feature_columns'])
            model = LSTMModel(input_size=n_features,
                            hidden_size=predictor.hidden_size,
                            num_layers=predictor.num_layers).to(predictor.device)
            
            model_path = os.path.join(category_path, 'model.pth')
            model.load_state_dict(torch.load(model_path, 
                                map_location=predictor.device))
            model.eval()
            
            predictor.models[category] = model
            
        print(f"Loaded predictor from {save_dir}")
        print(f"Last trained: {predictor.metadata['last_trained']}")
        return predictor
    
    def retrain(self, df_train, categories=None, num_epochs=100, 
                batch_size=32, patience=10, retain_history=True):
        """Retrain models with new data while optionally keeping training history"""
        if not retain_history:
            # Reset models and scalers if not retaining history
            self.models = {}
            self.scalers = {}
        
        # Store previous performance metrics if retaining history
        previous_metrics = self.metadata.get('training_history', {}).copy()
        
        # Train models with new data
        self.train(df_train, categories, num_epochs, batch_size, patience)
        
        # Update metadata
        if retain_history and previous_metrics:
            # Merge previous metrics with new ones
            for category, metrics in previous_metrics.items():
                if category in self.metadata['training_history']:
                    self.metadata['training_history'][category]['retraining_history'] = metrics
        
        # Update version
        version_parts = self.metadata['model_version'].split('.')
        self.metadata['model_version'] = f"{version_parts[0]}.{int(version_parts[1]) + 1}"
        
        print(f"Models retrained. New version: {self.metadata['model_version']}")
    
    def create_training_plots(self, df_train, save_dir):
        """Create and save training plots for each category"""
        
        os.makedirs(os.path.join(save_dir, 'plots'), exist_ok=True)
        plt.style.use('ggplot')
        
        for category in self.models.keys():
            print(f"Creating plots for category: {category}")
            
            # Prepare data
            category_data = df_train[df_train['category'] == category].copy()
            scaled_data = self.preprocess_data(df_train, category)
            n_features = scaled_data.shape[1] - 1
            
            # Create sequences
            X, y = create_sequences(scaled_data, self.sequence_length, n_features)
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, shuffle=False)
            
            # Convert to tensors and get predictions
            X_train_tensor = torch.FloatTensor(X_train).to(self.device)
            X_val_tensor = torch.FloatTensor(X_val).to(self.device)
            
            model = self.models[category]
            model.eval()
            with torch.no_grad():
                train_predictions = model(X_train_tensor).cpu().numpy()
                val_predictions = model(X_val_tensor).cpu().numpy()
            
            # Inverse transform predictions and actual values
            train_predictions = self.scalers[category]['target_scaler'].inverse_transform(
                train_predictions.reshape(-1, 1)
            )
            val_predictions = self.scalers[category]['target_scaler'].inverse_transform(
                val_predictions.reshape(-1, 1)
            )
            y_train_actual = self.scalers[category]['target_scaler'].inverse_transform(
                y_train.reshape(-1, 1)
            )
            y_val_actual = self.scalers[category]['target_scaler'].inverse_transform(
                y_val.reshape(-1, 1)
            )
            
            # Calculate prediction intervals (using standard deviation)
            train_std = np.std(np.abs(train_predictions - y_train_actual))
            val_std = np.std(np.abs(val_predictions - y_val_actual))
            
            # Create confidence bands (±2 standard deviations for ~95% confidence)
            train_upper = train_predictions + 2 * train_std
            train_lower = train_predictions - 2 * train_std
            val_upper = val_predictions + 2 * val_std
            val_lower = val_predictions - 2 * val_std
            
            # Create figure
            plt.figure(figsize=(15, 8))
            
            # Plot training data with confidence interval
            plt.plot(range(len(y_train_actual)), y_train_actual, 
                    label='Train Actual', alpha=0.5, color='blue')
            plt.plot(range(len(train_predictions)), train_predictions, 
                    label='Train Predicted', alpha=0.5, color='lightblue')
            plt.fill_between(range(len(train_predictions)), 
                            train_lower.flatten(), 
                            train_upper.flatten(), 
                            color='lightblue', alpha=0.2, 
                            label='Train Prediction Range')
            
            # Plot validation data with confidence interval
            offset = len(y_train_actual)
            plt.plot(range(offset, offset + len(y_val_actual)), y_val_actual, 
                    label='Val Actual', color='red')
            plt.plot(range(offset, offset + len(val_predictions)), val_predictions, 
                    label='Val Predicted', color='lightcoral')
            plt.fill_between(range(offset, offset + len(val_predictions)), 
                            val_lower.flatten(), 
                            val_upper.flatten(), 
                            color='red', alpha=0.2, 
                            label='Val Prediction Range')
            
            plt.title(f'Actual vs Predicted Values for {category}')
            plt.xlabel('Time Steps')
            plt.ylabel('Amount')
            plt.legend()
            plt.grid(True)
            
            # Add metrics as text
            metrics = self.metadata['training_history'][category]
            metrics_text = f"MAE: {metrics['mae']:.2f}\n"
            metrics_text += f"RMSE: {metrics['rmse']:.2f}\n"
            metrics_text += f"Training Samples: {metrics['training_samples']}\n"
            metrics_text += f"Validation Samples: {metrics['validation_samples']}\n"
            metrics_text += f"Prediction Range: ±{2*val_std:.2f}"  # Added prediction range info
            
            plt.figtext(0.02, 0.02, metrics_text, fontsize=10, 
                       bbox=dict(facecolor='white', alpha=0.8))
            
            # Adjust layout and save
            plt.tight_layout()
            plt.savefig(os.path.join(save_dir, 'plots', f'{category}_prediction.png'), 
                       dpi=300, bbox_inches='tight')
            plt.close()
            
        print(f"Plots saved in {os.path.join(save_dir, 'plots')}")

    def create_aggregated_plot(self, df_train, save_dir):
        """Create a plot showing sum of predictions across all categories"""
        
        plt.figure(figsize=(20, 10))
        plt.style.use('ggplot')
        
        # First, find the minimum length across all predictions
        min_length = float('inf')
        predictions_by_category = {}
        actuals_by_category = {}
        
        for category in self.models.keys():
            print(f"Processing category: {category}")
            
            # Prepare data
            scaled_data = self.preprocess_data(df_train, category)
            n_features = scaled_data.shape[1] - 1
            
            # Create sequences
            X, y = create_sequences(scaled_data, self.sequence_length, n_features)
            X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, shuffle=False)
            
            # Get predictions
            model = self.models[category]
            model.eval()
            with torch.no_grad():
                val_predictions = model(torch.FloatTensor(X_val).to(self.device)).cpu().numpy()
            
            # Inverse transform predictions and actual values
            val_predictions = self.scalers[category]['target_scaler'].inverse_transform(
                val_predictions.reshape(-1, 1)
            )
            y_val_actual = self.scalers[category]['target_scaler'].inverse_transform(
                y_val.reshape(-1, 1)
            )
            
            # Store predictions and actuals
            predictions_by_category[category] = val_predictions
            actuals_by_category[category] = y_val_actual
            
            # Update minimum length
            min_length = min(min_length, len(val_predictions))
        
        # Truncate all predictions and actuals to minimum length and sum them
        all_predictions = []
        all_actuals = []
        
        for category in self.models.keys():
            all_predictions.append(predictions_by_category[category][:min_length])
            all_actuals.append(actuals_by_category[category][:min_length])
        
        # Convert to numpy arrays and sum
        summed_predictions = np.sum(all_predictions, axis=0)
        summed_actuals = np.sum(all_actuals, axis=0)
        
        # Calculate prediction intervals for summed values
        prediction_std = np.std(np.abs(summed_predictions - summed_actuals))
        
        # Create confidence bands
        upper_bound = summed_predictions + 2 * prediction_std
        lower_bound = summed_predictions - 2 * prediction_std
        
        # Plot summed data
        plt.plot(range(len(summed_actuals)), summed_actuals, 
                label='Actual Total', color='blue', alpha=0.5)
        plt.plot(range(len(summed_predictions)), summed_predictions, 
                label='Predicted Total', color='red', linewidth=2)
        plt.fill_between(range(len(summed_predictions)), 
                        lower_bound.flatten(), 
                        upper_bound.flatten(), 
                        color='red', alpha=0.2,
                        label='Prediction Range')
        
        plt.title('Total Transaction Amount: Actual vs Predicted')
        plt.xlabel('Time Steps')
        plt.ylabel('Total Amount')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        # Calculate and add overall metrics
        mae = mean_absolute_error(summed_actuals, summed_predictions)
        rmse = np.sqrt(mean_squared_error(summed_actuals, summed_predictions))
        
        metrics_text = f"Overall Metrics:\n"
        metrics_text += f"MAE: {mae:.2f}\n"
        metrics_text += f"RMSE: {rmse:.2f}\n"
        metrics_text += f"Prediction Range: ±{2*prediction_std:.2f}"
        
        plt.figtext(0.02, 0.02, metrics_text, fontsize=10,
                    bbox=dict(facecolor='white', alpha=0.8))
        
        # Adjust layout and save
        plt.tight_layout()
        plt.savefig(os.path.join(save_dir, 'plots', 'total_predictions.png'), 
                    dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"Total predictions plot saved in {os.path.join(save_dir, 'plots')}")

