import pandas as pd
import matplotlib.pyplot as plt
from model_pipeline import ModelPipeline
from model_pipeline import read_financial_transactions

def predict_future_amounts(dates, model_path='../models/oracle_v1'):
    """
    Predict total transaction amounts for given dates
    
    Args:
        dates: List of dates to predict for
        model_path: Path to the saved model
    
    Returns:
        predictions: Dictionary with dates as keys and predicted amounts as values
    """
    # Load the trained predictor
    predictor = ModelPipeline.load(model_path)
    print("Model loaded successfully")
    
    # Make predictions
    predictions = predictor.predict(dates)
    
    # Print predictions
    print("\nPredictions:")
    for date, amount in predictions.items():
        print(f"{date}: {amount:.2f}")
    
    print(f"\nPrediction plot saved in {model_path}/plots/future_predictions.png")
    
    return predictions

def predict_and_plot(dates, model_path='../models/oracle_v1'):
    """Predict future amounts and plot with historical data"""
    # Load historical data
    df = read_financial_transactions()
    df = df[df['type'] == 'expense']
    historical = df.groupby('datetime')['amount'].sum().reset_index()
    historical = historical.sort_values('datetime')
    
    # Get predictions
    predictor = ModelPipeline.load(model_path)
    predictions = predict_future_amounts(dates)
    
    # Convert predictions to DataFrame
    pred_df = pd.DataFrame({
        'datetime': predictions.keys(),
        'amount': predictions.values()
    })
    
    # Create the plot
    plt.figure(figsize=(15, 8))
    plt.style.use('ggplot')
    
    # Plot historical data
    plt.plot(historical['datetime'], historical['amount'], 
             label='Historical', color='blue', alpha=0.7)
    
    # Plot predictions
    plt.plot(pred_df['datetime'], pred_df['amount'], 
             label='Predicted', color='red', linestyle='--')
    
    # Add vertical line at the transition point
    transition_date = historical['datetime'].max()
    plt.axvline(x=transition_date, color='gray', linestyle=':',
                label='Prediction Start')
    
    plt.title('Transaction Amounts: Historical vs Predicted')
    plt.xlabel('Date')
    plt.ylabel('Amount')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # Rotate x-axis labels for better readability
    plt.xticks(rotation=45)
    
    # Add prediction statistics
    stats_text = f"Prediction Statistics:\n"
    stats_text += f"Mean: {pred_df['amount'].mean():.2f}\n"
    stats_text += f"Min: {pred_df['amount'].min():.2f}\n"
    stats_text += f"Max: {pred_df['amount'].max():.2f}"
    
    plt.figtext(0.02, 0.02, stats_text, fontsize=10,
                bbox=dict(facecolor='white', alpha=0.8))
    
    plt.tight_layout()
    plt.show()
    
    return predictions

def main():
    # Example usage
    # You can modify these dates as needed
    test_dates = pd.date_range(start='2025-04-01', end='2025-04-30', freq='D')
    
    # Make predictions and plot
    predictions = predict_and_plot(test_dates)
    
    # predictions = predict_future_amounts(test_dates)
    

if __name__ == "__main__":
    main() 