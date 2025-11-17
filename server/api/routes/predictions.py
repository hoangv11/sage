import os
import pandas as pd
import numpy as np
from flask import request, jsonify
from convex import ConvexClient
from dotenv import load_dotenv

load_dotenv()

def register_routes(app, predictor, MODEL_TYPE):
    @app.route('/api/oracle/predict', methods=['POST'])
    def predict_spending():
        if predictor is None:
            return jsonify({
                'error': 'Prediction model not loaded.'
            }), 503

        try:
            data = request.json

            if not all(key in data for key in ['user_id', 'time_range']):
                return jsonify({
                    'error': 'Missing required parameters. Please provide user_id and time_range.'
                }), 400

            try:
                start_date, end_date = data['time_range'].split('_to_')
                prediction_dates = pd.date_range(start=start_date, end=end_date, freq='D')
            except ValueError:
                return jsonify({
                    'error': 'Invalid time_range format. Expected format: YYYY-MM-DD_to_YYYY-MM-DD'
                }), 400

            historical_dates = pd.date_range(end=start_date, periods=90, freq='D')
            base_spending = 50
            seasonal = 20 * np.sin(np.arange(len(historical_dates)) * 2 * np.pi / 30)
            noise = np.random.randn(len(historical_dates)) * 10
            historical_amounts = base_spending + seasonal + noise

            historical_data = pd.DataFrame({
                'datetime': historical_dates,
                'amount': np.abs(historical_amounts)
            })

            if MODEL_TYPE == 'chronos':
                forecast = predictor.predict(
                    historical_data,
                    prediction_length=len(prediction_dates)
                )

                response = {
                    'user_id': data['user_id'],
                    'predictions': {
                        str(date.date()): {
                            'amount': float(pred),
                            'confidence_low': float(low),
                            'confidence_high': float(high)
                        }
                        for date, pred, low, high in zip(
                            prediction_dates,
                            forecast['predictions'],
                            forecast['confidence_low'],
                            forecast['confidence_high']
                        )
                    }
                }
            else:
                predictions = predictor.predict(prediction_dates)
                response = {
                    'user_id': data['user_id'],
                    'predictions': {
                        str(date): float(amount)
                        for date, amount in predictions.items()
                    }
                }

            return jsonify(response)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({
                'error': f'Server error: {str(e)}'
            }), 500


    @app.route('/api/oracle/predict_params', methods=['POST'])
    def predict_params():
        if predictor is None:
            return jsonify({
                'error': 'Prediction model not loaded. Please train the model first.'
            }), 503

        try:
            data = request.json
            print(data)

            if not all(key in data for key in ['user_id', 'time_range', 'scenario']):
                return jsonify({
                    'error': 'Missing required parameters. Please provide user_id, time_range, and scenario.'
                }), 400

            try:
                start_date, end_date = data['time_range'].split('_to_')
                dates = pd.date_range(start=start_date, end=end_date, freq='D')
            except (ValueError, KeyError):
                return jsonify({
                    'error': 'Invalid time_range format. Expected format: {\"start\": \"YYYY-MM-DD\", \"end\": \"YYYY-MM-DD\"}'
                }), 400

            print(dates)

            # Fetch transaction data from Convex
            convex_url = os.environ.get('CONVEX_URL')
            if not convex_url:
                return jsonify({
                    'error': 'Convex URL not configured'
                }), 500

            client = ConvexClient(convex_url)

            # Fetch historical transactions (last 90 days before prediction start)
            historical_start = pd.Timestamp(start_date) - pd.Timedelta(days=90)
            historical_end = start_date

            transactions = client.query('transactions:getTransactions', {
                'userId': data['user_id'],
                'startDate': historical_start.strftime('%Y-%m-%d'),
                'endDate': historical_end
            })

            if not transactions or len(transactions) < 10:
                return jsonify({
                    'error': 'Insufficient transaction data for predictions. Need at least 10 transactions.'
                }), 400

            # Convert to DataFrame with required columns
            df = pd.DataFrame(transactions)

            # Ensure required columns exist
            if 'date' not in df.columns or 'amount' not in df.columns or 'category' not in df.columns:
                return jsonify({
                    'error': 'Transaction data missing required fields (date, amount, category)'
                }), 400

            # Convert date to datetime
            df['datetime'] = pd.to_datetime(df['date'])

            # Filter out income transactions for spending predictions
            df = df[df['category'] != 'income']

            print(f"[Predict] Using {len(df)} transactions for predictions")

            predictions_by_category = predictor.predict_by_category(df, dates)
            print(predictions_by_category)

            predictions_without_param = {}
            for date in dates:
                date_str = str(date.date())
                predictions_without_param[date_str] = float(sum(
                    predictions.get(date, 0)
                    for predictions in predictions_by_category.values()
                ))

            predictions_with_param = predictions_without_param.copy()
            print(predictions_with_param)

            scenario = data['scenario']

            if scenario.get('skip_expense', {}).get('active'):
                category = scenario['skip_expense']['category']
                if category in predictions_by_category:
                    for date in dates:
                        date_str = str(date.date())
                        predictions_with_param[date_str] -= predictions_by_category[category].get(date, 0)

            if scenario.get('new_expense', {}).get('active'):
                category = scenario['new_expense']['category']
                percent = float(scenario['new_expense']['percent'])
                if category in predictions_by_category:
                    for date in dates:
                        date_str = str(date.date())
                        predictions_with_param[date_str] += predictions_by_category[category].get(date, 0) * percent

            if scenario.get('reduce_expense', {}).get('active'):
                category = scenario['reduce_expense']['category']
                percent = float(scenario['reduce_expense']['percent'])
                if category in predictions_by_category:
                    for date in dates:
                        date_str = str(date.date())
                        predictions_with_param[date_str] -= predictions_by_category[category].get(date, 0) * percent

            response = {
                'user_id': data['user_id'],
                'predictions_without_param': predictions_without_param,
                'predictions_with_param': predictions_with_param
            }

            return jsonify(response)

        except Exception as e:
            return jsonify({
                'error': f'Server error: {str(e)}'
            }), 500
