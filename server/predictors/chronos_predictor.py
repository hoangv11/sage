"""
Chronos-based spending predictor using pretrained Amazon time-series model.
No training required - works out of the box!
"""

import torch
import numpy as np
import pandas as pd
from chronos import ChronosPipeline
from datetime import datetime, timedelta


class ChronosPredictor:
    """
    Wrapper around Amazon's Chronos pretrained time-series model.

    Advantages:
    - Zero training needed (pretrained on 100B+ time-series)
    - Works with minimal data (50+ transactions)
    - Provides confidence intervals
    - Fast inference
    """

    def __init__(self, model_size='small', device='cpu'):
        """
        Initialize Chronos predictor.

        Args:
            model_size: 'tiny', 'small', 'base', or 'large'
                       (larger = better accuracy but slower)
            device: 'cpu' or 'cuda'
        """
        self.model_size = model_size
        self.device = device
        self.pipeline = None
        print(f"[Chronos] Initializing with model size: {model_size}")

    def load(self):
        """Load the pretrained Chronos model from HuggingFace"""
        if self.pipeline is None:
            print(f"[Chronos] Downloading model from HuggingFace (first time only)...")
            self.pipeline = ChronosPipeline.from_pretrained(
                f"amazon/chronos-t5-{self.model_size}",
                device_map=self.device,
                dtype=torch.float32,
            )
            print(f"[Chronos] Model loaded successfully!")
        return self

    def prepare_historical_data(self, transactions_df, aggregation='daily'):
        """
        Prepare transaction data for Chronos.

        Args:
            transactions_df: DataFrame with 'datetime' and 'amount' columns
            aggregation: 'daily' or 'weekly'

        Returns:
            torch.Tensor of historical spending amounts
        """
        # Ensure datetime column is datetime type
        if 'datetime' not in transactions_df.columns:
            raise ValueError("DataFrame must have 'datetime' column")

        if 'amount' not in transactions_df.columns:
            raise ValueError("DataFrame must have 'amount' column")

        # Convert to datetime if needed
        transactions_df['datetime'] = pd.to_datetime(transactions_df['datetime'])

        # Aggregate by day
        if aggregation == 'daily':
            daily_spending = transactions_df.groupby(
                transactions_df['datetime'].dt.date
            )['amount'].sum().reset_index()
            daily_spending.columns = ['date', 'amount']

            # Fill missing dates with 0
            date_range = pd.date_range(
                start=daily_spending['date'].min(),
                end=daily_spending['date'].max(),
                freq='D'
            )
            full_dates = pd.DataFrame({'date': date_range.date})
            daily_spending = full_dates.merge(
                daily_spending,
                on='date',
                how='left'
            ).fillna(0)

            historical_values = daily_spending['amount'].values

        elif aggregation == 'weekly':
            # Aggregate by week
            transactions_df['week'] = transactions_df['datetime'].dt.to_period('W')
            weekly_spending = transactions_df.groupby('week')['amount'].sum()
            historical_values = weekly_spending.values

        else:
            raise ValueError("aggregation must be 'daily' or 'weekly'")

        return torch.tensor(historical_values, dtype=torch.float32)

    def predict(self, historical_data, prediction_length=30, num_samples=20):
        """
        Generate predictions with confidence intervals.

        Args:
            historical_data: torch.Tensor of historical values or DataFrame
            prediction_length: Number of days to predict
            num_samples: Number of forecast samples (more = better confidence intervals)

        Returns:
            dict with 'predictions', 'confidence_low', 'confidence_high'
        """
        # Load model if not already loaded
        if self.pipeline is None:
            self.load()

        # Handle DataFrame input
        if isinstance(historical_data, pd.DataFrame):
            historical_data = self.prepare_historical_data(historical_data)

        # Ensure it's a tensor
        if not isinstance(historical_data, torch.Tensor):
            historical_data = torch.tensor(historical_data, dtype=torch.float32)

        # Add batch dimension if needed
        if len(historical_data.shape) == 1:
            historical_data = historical_data.unsqueeze(0)

        print(f"[Chronos] Predicting {prediction_length} days ahead...")
        print(f"[Chronos] Using {len(historical_data[0])} historical data points")

        # Generate forecast
        forecast = self.pipeline.predict(
            inputs=historical_data,
            prediction_length=prediction_length,
            num_samples=num_samples,
        )

        # Extract quantiles for confidence intervals
        # forecast shape: [num_samples, batch_size, prediction_length]
        forecast_np = forecast[0].numpy()  # Get first batch

        low, median, high = np.quantile(
            forecast_np,
            [0.1, 0.5, 0.9],  # 10th, 50th, 90th percentiles
            axis=0
        )

        return {
            'predictions': median,
            'confidence_low': low,
            'confidence_high': high,
            'mean': forecast_np.mean(axis=0),
            'std': forecast_np.std(axis=0),
        }

    def predict_by_category(self, transactions_df, dates, categories=None):
        """
        Predict spending for each category separately.

        Args:
            transactions_df: DataFrame with 'datetime', 'amount', 'category' columns
            dates: List of dates to predict for
            categories: List of categories to predict (None = all categories)

        Returns:
            dict mapping category -> {date -> prediction}
        """
        if categories is None:
            categories = transactions_df['category'].unique()

        predictions_by_category = {}

        for category in categories:
            print(f"[Chronos] Predicting for category: {category}")

            # Filter transactions for this category
            category_data = transactions_df[
                transactions_df['category'] == category
            ].copy()

            if len(category_data) < 10:
                print(f"[Chronos] Skipping {category} - insufficient data ({len(category_data)} transactions)")
                continue

            try:
                # Prepare historical data
                historical = self.prepare_historical_data(category_data)

                # Predict
                forecast = self.predict(
                    historical,
                    prediction_length=len(dates)
                )

                # Map predictions to dates
                predictions_by_category[category] = {
                    date: float(pred)
                    for date, pred in zip(dates, forecast['predictions'])
                }

            except Exception as e:
                print(f"[Chronos] Error predicting for {category}: {e}")
                continue

        return predictions_by_category


# Example usage
if __name__ == '__main__':
    # Initialize predictor
    predictor = ChronosPredictor(model_size='small')
    predictor.load()

    # Create sample data
    dates = pd.date_range(start='2024-01-01', end='2024-03-01', freq='D')
    amounts = 50 + 20 * np.sin(np.arange(len(dates)) * 2 * np.pi / 30) + np.random.randn(len(dates)) * 10

    sample_data = pd.DataFrame({
        'datetime': dates,
        'amount': np.abs(amounts)
    })

    # Predict next 30 days
    forecast = predictor.predict(sample_data, prediction_length=30)

    print(f"\nPredictions for next 30 days:")
    print(f"Mean prediction: ${forecast['predictions'].mean():.2f}")
    print(f"Range: ${forecast['predictions'].min():.2f} - ${forecast['predictions'].max():.2f}")
    print(f"\nFirst 7 days:")
    for i, (pred, low, high) in enumerate(zip(
        forecast['predictions'][:7],
        forecast['confidence_low'][:7],
        forecast['confidence_high'][:7]
    ), 1):
        print(f"Day {i}: ${pred:.2f} (${low:.2f} - ${high:.2f})")
