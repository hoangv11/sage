from flask import request, jsonify
from services.anomaly_detector import detect_spending_anomalies

def register_routes(app):
    @app.route('/api/anomalies', methods=['POST'])
    def get_anomalies():
        try:
            data = request.json

            if not all(key in data for key in ['userId', 'startDate', 'endDate']):
                return jsonify({
                    'error': 'Missing required parameters. Please provide userId, startDate, and endDate.'
                }), 400

            result = detect_spending_anomalies(
                user_id=data['userId'],
                start_date=data['startDate'],
                end_date=data['endDate']
            )

            return jsonify(result)

        except Exception as e:
            return jsonify({
                'error': f'Server error: {str(e)}'
            }), 500
