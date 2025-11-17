import sys
import os
from dotenv import load_dotenv

load_dotenv()

sys.path.append('.')
from flask import Flask
from flask_cors import CORS

from predictors import ChronosPredictor

app = Flask(__name__)
CORS(app, supports_credentials=True)

MODEL_TYPE = os.environ.get('MODEL_TYPE', 'chronos')
predictor = None

print(f"[INFO] Using model type: {MODEL_TYPE}")

if MODEL_TYPE == 'chronos':
    try:
        print("[Chronos] Initializing predictor...")
        predictor = ChronosPredictor(model_size='small')
        predictor.load()
        print("[OK] Chronos predictor loaded and ready!")
    except Exception as e:
        print(f"[ERROR] Could not load Chronos predictor: {e}")
elif MODEL_TYPE == 'lstm':
    try:
        from predictors.lstm import feature_transformer
        sys.modules['feature_transformer'] = feature_transformer
        from predictors.lstm.model_pipeline import ModelPipeline
        model_path = 'models/oracle_v1'
        predictor = ModelPipeline.load(model_path)
        print(f"[OK] LSTM model loaded from {model_path}")
    except Exception as e:
        print(f"[WARNING] Could not load LSTM model: {e}")
else:
    print(f"[ERROR] Unknown model type: {MODEL_TYPE}")

from api.routes import health, anomalies, predictions

health.register_routes(app)
anomalies.register_routes(app)
predictions.register_routes(app, predictor, MODEL_TYPE)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
