import unittest
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
import os
import json

from services import detect_spending_anomalies

class TestAnomalyDetector(unittest.TestCase):
    def setUp(self):
        self.user_id = "user123"
        self.start_date = "2023-01-01"
        self.end_date = "2023-12-31"
        
        self.mock_transactions = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05", "amount": 50.0},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-12", "amount": 45.0},
            {"_id": "tx003", "userId": "user123", "date": "2023-01-19", "amount": 55.0},
            {"_id": "tx004", "userId": "user123", "date": "2023-01-26", "amount": 150.0},
            {"_id": "tx005", "userId": "user123", "date": "2023-02-02", "amount": 48.0},
            {"_id": "tx006", "userId": "user123", "date": "2023-01-15", "amount": 52.0},
            {"_id": "tx007", "userId": "user123", "date": "2023-01-22", "amount": 47.0},
            {"_id": "tx008", "userId": "user123", "date": "2023-01-29", "amount": 53.0},
            {"_id": "tx009", "userId": "user123", "date": "2023-02-05", "amount": 10.0},
        ]
        
        os.environ['CONVEX_URL'] = 'https://example-test-url.convex.cloud'

    @patch('services.anomaly_detector.ConvexClient')
    def test_standard_case(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        mock_client.query.return_value = self.mock_transactions
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== STANDARD TEST RESULTS ===")
        print(json.dumps(result, indent=2, default=str))
        
        self.assertIn('high_spending_anomalies', result)
        self.assertIn('low_spending_anomalies', result)
        
        self.assertEqual(len(result['high_spending_anomalies']), 1)
        self.assertEqual(len(result['low_spending_anomalies']), 1)
        
        high_anomaly = result['high_spending_anomalies'][0]
        self.assertEqual(high_anomaly['amount'], 150.0)
        self.assertIn('normal_range', high_anomaly)
        self.assertIn('percent_deviation', high_anomaly)
        
        low_anomaly = result['low_spending_anomalies'][0]
        self.assertEqual(low_anomaly['amount'], 10.0)
        self.assertIn('normal_range', low_anomaly)
        self.assertIn('percent_deviation', low_anomaly)

    @patch('services.anomaly_detector.ConvexClient')
    def test_missing_convex_url(self, mock_convex_client):
        original_url = os.environ.get('CONVEX_URL')
        if 'CONVEX_URL' in os.environ:
            del os.environ['CONVEX_URL']
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Missing Convex URL in environment variables')
        
        if original_url:
            os.environ['CONVEX_URL'] = original_url

    @patch('services.anomaly_detector.ConvexClient')
    def test_missing_amount_field(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        bad_data = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05"},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-12"}
        ]
        mock_client.query.return_value = bad_data
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Transaction data missing required fields')

    @patch('services.anomaly_detector.ConvexClient')
    def test_empty_transactions(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        mock_client.query.return_value = []
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        self.assertIn('high_spending_anomalies', result)
        self.assertIn('low_spending_anomalies', result)
        self.assertEqual(len(result['high_spending_anomalies']), 0)
        self.assertEqual(len(result['low_spending_anomalies']), 0)

    @patch('services.anomaly_detector.ConvexClient')
    def test_all_same_amount(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        same_amount_data = [
            {"_id": f"tx{i}", "userId": "user123", "date": f"2023-01-{i+1}", "amount": 50.0}
            for i in range(10)
        ]
        mock_client.query.return_value = same_amount_data
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        self.assertIn('high_spending_anomalies', result)
        self.assertIn('low_spending_anomalies', result)

    @patch('services.anomaly_detector.ConvexClient')
    def test_extreme_outliers(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        extreme_data = self.mock_transactions.copy()
        extreme_data.append({"_id": "tx_extreme_high", "userId": "user123", 
                             "date": "2023-03-01", "amount": 10000.0})
        extreme_data.append({"_id": "tx_extreme_low", "userId": "user123", 
                             "date": "2023-03-05", "amount": 0.01})
        
        mock_client.query.return_value = extreme_data
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== EXTREME OUTLIERS TEST ===")
        print(json.dumps(result, indent=2, default=str))
        
        high_amounts = [item['amount'] for item in result['high_spending_anomalies']]
        low_amounts = [item['amount'] for item in result['low_spending_anomalies']]
        
        self.assertIn(10000.0, high_amounts)
        self.assertIn(0.01, low_amounts)

    @patch('services.anomaly_detector.ConvexClient')
    def test_few_transactions(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        few_transactions = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05", "amount": 50.0},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-12", "amount": 55.0},
            {"_id": "tx003", "userId": "user123", "date": "2023-01-19", "amount": 150.0}
        ]
        mock_client.query.return_value = few_transactions
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== FEW TRANSACTIONS TEST ===")
        print(json.dumps(result, indent=2, default=str))
        
        self.assertIn('high_spending_anomalies', result)
        self.assertIn('low_spending_anomalies', result)

    @patch('services.anomaly_detector.ConvexClient')
    def test_convex_api_error(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        mock_client.query.side_effect = Exception("API connection error")
        
        try:
            result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
            self.assertIn('error', result)
        except Exception as e:
            self.fail(f"Function didn't handle the API error properly: {str(e)}")

    @patch('services.anomaly_detector.ConvexClient')
    def test_preserve_transaction_data(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        rich_data = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05", 
             "amount": 50.0, "description": "Groceries"},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-12", 
             "amount": 1000.0, "description": "Big Purchase"}
        ]
        mock_client.query.return_value = rich_data
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        if result['high_spending_anomalies']:
            high_anomaly = result['high_spending_anomalies'][0]
            self.assertIn('transaction_id', high_anomaly)
            self.assertIn('date', high_anomaly)

    @patch('services.anomaly_detector.ConvexClient')
    def test_negative_amounts(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        transactions_with_negatives = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05", "amount": 50.0},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-12", "amount": 45.0},
            {"_id": "tx003", "userId": "user123", "date": "2023-01-19", "amount": 55.0},
            {"_id": "tx004", "userId": "user123", "date": "2023-01-26", "amount": -150.0},
            {"_id": "tx005", "userId": "user123", "date": "2023-02-02", "amount": 48.0}
        ]
        mock_client.query.return_value = transactions_with_negatives
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== NEGATIVE AMOUNTS TEST ===")
        print(json.dumps(result, indent=2, default=str))
        
        all_amounts = [item['amount'] for item in result['high_spending_anomalies'] + result['low_spending_anomalies']]
        self.assertIn(-150.0, all_amounts)

    @patch('services.anomaly_detector.ConvexClient')
    def test_micro_transactions(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        micro_transactions = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05", "amount": 50.0},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-12", "amount": 45.0},
            {"_id": "tx003", "userId": "user123", "date": "2023-01-19", "amount": 55.0},
            {"_id": "tx004", "userId": "user123", "date": "2023-01-26", "amount": 0.05},
            {"_id": "tx005", "userId": "user123", "date": "2023-02-02", "amount": 0.10},
            {"_id": "tx006", "userId": "user123", "date": "2023-02-09", "amount": 0.03}
        ]
        mock_client.query.return_value = micro_transactions
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== MICRO TRANSACTIONS TEST ===")
        print(json.dumps(result, indent=2, default=str))
        
        self.assertIn('high_spending_anomalies', result)
        self.assertIn('low_spending_anomalies', result)

    @patch('services.anomaly_detector.ConvexClient')
    def test_bimodal_distribution(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        bimodal_data = [
            {"_id": f"tx{i}", "userId": "user123", "date": f"2023-01-{i+1}", "amount": 10.0}
            for i in range(10)
        ] + [
            {"_id": f"tx{i+10}", "userId": "user123", "date": f"2023-02-{i+1}", "amount": 100.0}
            for i in range(10)
        ]
        mock_client.query.return_value = bimodal_data
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== BIMODAL DISTRIBUTION TEST ===")
        print(json.dumps(result, indent=2, default=str))
        
        self.assertIn('high_spending_anomalies', result)
        self.assertIn('low_spending_anomalies', result)

    @patch('services.anomaly_detector.ConvexClient')
    def test_duplicate_values(self, mock_convex_client):
        mock_client = MagicMock()
        mock_convex_client.return_value = mock_client
        
        duplicate_data = [
            {"_id": "tx001", "userId": "user123", "date": "2023-01-05", "amount": 50.0},
            {"_id": "tx002", "userId": "user123", "date": "2023-01-06", "amount": 50.0},
            {"_id": "tx003", "userId": "user123", "date": "2023-01-07", "amount": 50.0},
            {"_id": "tx004", "userId": "user123", "date": "2023-01-08", "amount": 50.0},
            {"_id": "tx005", "userId": "user123", "date": "2023-01-09", "amount": 150.0},
            {"_id": "tx006", "userId": "user123", "date": "2023-01-10", "amount": 50.0}
        ]
        mock_client.query.return_value = duplicate_data
        
        result = detect_spending_anomalies(self.user_id, self.start_date, self.end_date)
        
        print("\n=== DUPLICATE VALUES TEST ===")
        print(json.dumps(result, indent=2, default=str))
        
        self.assertIn('high_spending_anomalies', result)
        high_anomaly_amounts = [a['amount'] for a in result['high_spending_anomalies']]
        self.assertIn(150.0, high_anomaly_amounts)

if __name__ == '__main__':
    unittest.main()