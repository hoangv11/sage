import numpy as np
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder


class FeatureTransformer(BaseEstimator, TransformerMixin):
    def __init__(self):
        self.training_mode = True
        self.feature_stats = {}
        self.mean_year_ = None
        self.std_year_ = None
        # self.onehot_encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        
    def fit(self, X, y=None):
        # Calculate year statistics for normalization
        dates = X['datetime']
        self.mean_year_ = dates.dt.year.mean()
        self.std_year_ = dates.dt.year.std()
        
        # Fit one-hot encoder on categories
        # self.onehot_encoder.fit(X[['category']])
        return self
        
    def fit_transform(self, X):
        """Fit and transform training data"""
        # Initialize year statistics during fit
        self.mean_year_ = X['datetime'].dt.year.mean()
        self.std_year_ = X['datetime'].dt.year.std()
        if self.std_year_ == 0:
            self.std_year_ = 1  # Prevent division by zero
            
        return self.transform(X)
        
    def transform(self, X):
        """Transform data differently based on training vs prediction mode"""
        result = X.copy()
        
        # Always add these temporal features, regardless of mode
        result.loc[:, 'day_of_week'] = result['datetime'].dt.dayofweek
        result.loc[:, 'day_of_week_sin'] = np.sin(result['day_of_week'] * (2 * np.pi / 7))
        result.loc[:, 'day_of_week_cos'] = np.cos(result['day_of_week'] * (2 * np.pi / 7))
        
        result.loc[:, 'day_of_month'] = result['datetime'].dt.day
        result.loc[:, 'day_of_month_sin'] = np.sin(result['day_of_month'] * (2 * np.pi / 31))
        result.loc[:, 'day_of_month_cos'] = np.cos(result['day_of_month'] * (2 * np.pi / 31))
        
        result.loc[:, 'month'] = result['datetime'].dt.month
        result.loc[:, 'month_sin'] = np.sin(result['month'] * (2 * np.pi / 12))
        result.loc[:, 'month_cos'] = np.cos(result['month'] * (2 * np.pi / 12))
        
        # Add normalized year feature
        if self.mean_year_ is not None and self.std_year_ is not None:
            result.loc[:, 'year_norm'] = (result['datetime'].dt.year - self.mean_year_) / self.std_year_
        
        if self.training_mode:
            # Additional training-only transformations
            result = result[~result['type'].isin(['income', 'transfer'])]
        else:
            # Add default type for prediction if needed
            if 'type' not in result.columns:
                result.loc[:, 'type'] = 'expense'
        
        return result
    
    def _transform_training_data(self, X):
        """Transform training data with full feature engineering"""
        # Filter out income and transfers
        X = X[~X['type'].isin(['income', 'transfer'])].copy()  # Create explicit copy
        
        # Add temporal features using .loc to avoid warnings
        X.loc[:, 'day_of_week'] = X['datetime'].dt.dayofweek
        X.loc[:, 'day_of_week_sin'] = np.sin(X['day_of_week'] * (2 * np.pi / 7))
        X.loc[:, 'day_of_week_cos'] = np.cos(X['day_of_week'] * (2 * np.pi / 7))
        
        X.loc[:, 'day_of_month'] = X['datetime'].dt.day
        X.loc[:, 'day_of_month_sin'] = np.sin(X['day_of_month'] * (2 * np.pi / 31))
        X.loc[:, 'day_of_month_cos'] = np.cos(X['day_of_month'] * (2 * np.pi / 31))
        
        X.loc[:, 'month'] = X['datetime'].dt.month
        X.loc[:, 'month_sin'] = np.sin(X['month'] * (2 * np.pi / 12))
        X.loc[:, 'month_cos'] = np.cos(X['month'] * (2 * np.pi / 12))
        
        # Add normalized year feature
        if self.mean_year_ is not None and self.std_year_ is not None:
            X.loc[:, 'year_norm'] = (X['datetime'].dt.year - self.mean_year_) / self.std_year_
        
        # Add week of year
        X['week_of_year'] = X['datetime'].dt.isocalendar().week
        
        # Drop the original category column
        X = X.drop(columns=['type'])
        
        return X
    
    def _transform_prediction_data(self, X):
        """Transform prediction data with minimal features"""
        # Only add temporal features for prediction
        X['day_of_week'] = X['datetime'].dt.dayofweek
        X['day_of_month'] = X['datetime'].dt.day
        X['month'] = X['datetime'].dt.month
        X['week_of_year'] = X['datetime'].dt.isocalendar().week
        
        # Add placeholder values for required columns
        if 'type' not in X.columns:
            X['type'] = 'expense'  # Default type for predictions
        
        # Use stored statistics if needed
        if self.feature_stats:
            # Apply any stored statistics for feature normalization
            pass
        
        return X
    
    def _store_feature_stats(self, X):
        """Store relevant statistics from training data"""
        self.feature_stats = {
            'mean_by_day': X.groupby('day_of_week')['amount'].mean().to_dict(),
            'mean_by_month': X.groupby('month')['amount'].mean().to_dict(),
            # Add other relevant statistics
        }
    
    def set_mode(self, training=True):
        """Set the transformer mode"""
        self.training_mode = training
