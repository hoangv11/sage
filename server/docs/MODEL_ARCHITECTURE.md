# Model Architecture & Improvements

## Current Implementation

### Model: Custom PyTorch LSTM

**Architecture:**
```python
class LSTMModel(nn.Module):
    - Input: (batch, sequence_length=4, features=12)
    - LSTM Layer 1: 12 → 50 hidden units
    - Dropout: 0.2
    - LSTM Layer 2: 50 → 50 hidden units
    - Dropout: 0.2
    - Linear: 50 → 1 (prediction)
```

**Features:**
- Day of week (sin/cos encoding)
- Day of month (sin/cos encoding)
- Month (sin/cos encoding)
- Year (normalized)
- Week of year

**Training:**
- Optimizer: Adam (lr=0.001)
- Loss: MSE
- Early stopping: patience=10
- Per-category models

---

## Problems with Current Approach

### 1. **Limited Features**
Only temporal features, missing:
- Transaction metadata (merchant, location)
- User behavior patterns
- External context (holidays, events)

### 2. **Static Architecture**
- Fixed 4-step lookback
- No hyperparameter tuning
- Simple LSTM (outdated for time-series)

### 3. **Training Complexity**
- Requires manual retraining
- No incremental learning
- Per-category overhead (8+ models)

### 4. **No Transfer Learning**
- Trains from scratch every time
- Can't leverage pretrained knowledge
- Limited data per category

---

## Recommended Changes

### Option 1: Keep Custom Model, Improve Features

```python
# Add richer features
class ImprovedFeatureTransformer:
    def transform(self, df):
        features = {
            # Current
            'temporal': self.get_temporal_features(df),

            # NEW: User behavior
            'user_stats': {
                'rolling_avg_7d': df['amount'].rolling(7).mean(),
                'rolling_std_7d': df['amount'].rolling(7).std(),
                'days_since_last_tx': (df['datetime'].diff().dt.days),
            },

            # NEW: Transaction context
            'tx_context': {
                'is_weekend': df['datetime'].dt.dayofweek >= 5,
                'is_month_start': df['datetime'].dt.day <= 7,
                'is_month_end': df['datetime'].dt.day >= 25,
            },

            # NEW: Category patterns
            'category_stats': {
                'category_rank': df.groupby('category')['amount'].rank(),
                'pct_of_category_spending': df['amount'] / df.groupby('category')['amount'].transform('sum'),
            }
        }
        return pd.concat(features.values(), axis=1)
```

**Changes needed in server:**
```python
# app.py - Add feature versioning
model_config = {
    'version': 'v2',
    'features': 'enhanced',
    'architecture': 'lstm'
}

@app.route('/api/model/info', methods=['GET'])
def get_model_info():
    return jsonify({
        'config': model_config,
        'categories': list(predictor.models.keys()),
        'last_trained': predictor.metadata['last_trained']
    })
```

---

### Option 2: Use Modern Time-Series Models

#### A. **Prophet (Facebook)**
**Pros:** Built for forecasting, handles seasonality automatically
**Cons:** Not great for multivariate inputs

```python
from prophet import Prophet

class ProphetPredictor:
    def train(self, df):
        # Prophet expects 'ds' (date) and 'y' (value) columns
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False
        )
        model.fit(df.rename(columns={'datetime': 'ds', 'amount': 'y'}))
        return model

    def predict(self, dates):
        future = pd.DataFrame({'ds': dates})
        forecast = self.model.predict(future)
        return forecast[['ds', 'yhat']].set_index('ds')['yhat'].to_dict()
```

**Changes to server:**
```python
# app.py
from prophet_predictor import ProphetPredictor

# Add model type selection
model_type = os.environ.get('MODEL_TYPE', 'lstm')

if model_type == 'prophet':
    predictor = ProphetPredictor.load(model_path)
elif model_type == 'lstm':
    predictor = ModelPipeline.load(model_path)
```

---

#### B. **XGBoost for Time-Series**
**Pros:** Fast, handles tabular data well, interpretable
**Cons:** Requires careful feature engineering

```python
import xgboost as xgb

class XGBoostPredictor:
    def __init__(self):
        self.model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            objective='reg:squarederror'
        )

    def create_lag_features(self, df, lags=[1, 7, 14, 30]):
        """Create lagged features"""
        for lag in lags:
            df[f'amount_lag_{lag}'] = df['amount'].shift(lag)
        return df

    def train(self, df):
        df = self.create_lag_features(df)
        X = df.drop(['amount', 'datetime'], axis=1)
        y = df['amount']
        self.model.fit(X, y)

    def predict(self, dates):
        # Predict iteratively, using predictions as lagged features
        predictions = {}
        for date in dates:
            X_pred = self.create_features(date)
            pred = self.model.predict(X_pred)[0]
            predictions[date] = pred
        return predictions
```

---

### Option 3: HuggingFace Transformer Models

#### **TimeSeriesTransformer**

```python
from transformers import TimeSeriesTransformerForPrediction, TimeSeriesTransformerConfig

class HuggingFacePredictor:
    def __init__(self):
        config = TimeSeriesTransformerConfig(
            prediction_length=30,  # Predict 30 days ahead
            context_length=90,     # Use 90 days of history
            num_time_features=5,   # Our temporal features
            lags_sequence=[1, 2, 3, 7, 14, 30],
        )
        self.model = TimeSeriesTransformerForPrediction(config)

    def train(self, df):
        from gluonts.dataset.pandas import PandasDataset

        # Convert to GluonTS format
        dataset = PandasDataset(
            dataframes=df,
            target='amount',
            timestamp='datetime',
            freq='D'
        )

        # Train
        from gluonts.torch import PyTorchPredictor
        predictor = PyTorchPredictor(
            model=self.model,
            prediction_length=30,
        )
        predictor.train(dataset)

    def predict(self, dates):
        # Generate forecast
        forecast = self.model.predict(dates)
        return forecast
```

**Installation:**
```bash
pip install transformers gluonts torch
```

---

#### **Chronos (Amazon)**
Pretrained foundation model for time-series (released 2024)

```python
from chronos import ChronosPipeline
import torch

class ChronosPredictor:
    def __init__(self, model_size='small'):
        # Load pretrained model
        self.pipeline = ChronosPipeline.from_pretrained(
            f"amazon/chronos-t5-{model_size}",  # small, base, large
            device_map="auto",
            torch_dtype=torch.bfloat16,
        )

    def predict(self, historical_data, prediction_length=30):
        """
        historical_data: torch tensor of shape (batch, time)
        """
        forecast = self.pipeline.predict(
            context=torch.tensor(historical_data),
            prediction_length=prediction_length,
        )

        # Get median prediction
        low, median, high = np.quantile(forecast[0].numpy(), [0.1, 0.5, 0.9], axis=0)

        return {
            'predictions': median,
            'confidence_low': low,
            'confidence_high': high
        }
```

**Changes to server:**
```python
# app.py
from chronos_predictor import ChronosPredictor

# Load pretrained model (no training needed!)
predictor = ChronosPredictor(model_size='small')

@app.route('/api/oracle/predict', methods=['POST'])
def predict_spending():
    data = request.json

    # Get historical data from Convex
    historical = get_user_transactions(data['user_id'], days=90)

    # Predict with pretrained model
    forecast = predictor.predict(
        historical_data=historical['amount'].values,
        prediction_length=30
    )

    return jsonify({
        'predictions': forecast['predictions'].tolist(),
        'confidence_interval': {
            'low': forecast['confidence_low'].tolist(),
            'high': forecast['confidence_high'].tolist()
        }
    })
```

**Advantages:**
- ✅ No training required
- ✅ Pretrained on 100B+ time-series
- ✅ Works with limited data
- ✅ Confidence intervals included
- ✅ Fast inference

---

## Model Comparison

| Model | Training Time | Inference Speed | Accuracy | Data Required | Complexity |
|-------|--------------|-----------------|----------|---------------|------------|
| Current LSTM | Hours | Fast | Medium | High (1000+ points) | High |
| Prophet | Minutes | Fast | Medium | Medium (100+ points) | Low |
| XGBoost | Minutes | Very Fast | High | Medium | Medium |
| TimeSeriesTransformer | Hours | Medium | High | High | High |
| **Chronos (HF)** | **None** | **Fast** | **High** | **Low (50+ points)** | **Low** |

**Recommendation:** Start with **Chronos** from HuggingFace
- No training needed (pretrained)
- Works with limited data
- Easy to integrate
- Better than custom LSTM

---

## Implementation Roadmap

### Phase 1: Add Chronos Support (1 week)

1. Install dependencies:
```bash
cd server
pip install chronos-forecasting transformers torch
```

2. Create `chronos_predictor.py`:
```python
# See code above
```

3. Update `app.py`:
```python
# Add model type environment variable
MODEL_TYPE = os.environ.get('MODEL_TYPE', 'chronos')

if MODEL_TYPE == 'chronos':
    from chronos_predictor import ChronosPredictor
    predictor = ChronosPredictor()
elif MODEL_TYPE == 'lstm':
    predictor = ModelPipeline.load('models/oracle_v1')
```

4. Update `.env`:
```env
MODEL_TYPE=chronos
CHRONOS_MODEL_SIZE=small  # or base, large
```

### Phase 2: A/B Testing (2 weeks)

```python
# Run both models, compare results
predictions_lstm = lstm_predictor.predict(dates)
predictions_chronos = chronos_predictor.predict(dates)

# Log metrics
log_predictions(
    user_id=user_id,
    lstm_mae=calculate_mae(actual, predictions_lstm),
    chronos_mae=calculate_mae(actual, predictions_chronos)
)
```

### Phase 3: Ensemble (1 month)

```python
# Combine multiple models
class EnsemblePredictor:
    def __init__(self):
        self.lstm = LSTMPredictor()
        self.chronos = ChronosPredictor()
        self.xgboost = XGBoostPredictor()

    def predict(self, dates):
        # Get predictions from all models
        preds = {
            'lstm': self.lstm.predict(dates),
            'chronos': self.chronos.predict(dates),
            'xgboost': self.xgboost.predict(dates),
        }

        # Weighted average (learned from validation data)
        weights = {'lstm': 0.3, 'chronos': 0.5, 'xgboost': 0.2}

        ensemble = sum(
            preds[model] * weight
            for model, weight in weights.items()
        )

        return ensemble
```

---

## Next Steps

1. **Quick Win:** Try Chronos (pretrained, no training)
2. **Medium-term:** Add Prophet for interpretability
3. **Long-term:** Build ensemble with multiple models

Want me to implement the Chronos integration?
