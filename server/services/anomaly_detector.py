import pandas as pd
import numpy as np
from convex import ConvexClient
from dotenv import load_dotenv
import os

load_dotenv()

def detect_spending_anomalies(user_id, start_date, end_date):
    convex_url = os.environ.get('CONVEX_URL')
    
    if not convex_url:
        return {"error": "Missing Convex URL in environment variables"}
    
    client = ConvexClient(convex_url)
    
    try:
        transactions = client.query('transactions:getTransactions', {
            'userId': user_id,
            'startDate': start_date,
            'endDate': end_date
        })
        print("transactions:",transactions)
        if not transactions:
            return {
                'high_spending_anomalies': [],
                'low_spending_anomalies': []
            }
        
        df = pd.DataFrame(transactions)

        if 'amount' not in df.columns:
            return {"error": "Transaction data missing required fields"}

        # Filter out income transactions - only detect anomalies in spending
        df = df[df['category'] != 'income']

        if len(df) < 3:
            return {
                'high_spending_anomalies': [],
                'low_spending_anomalies': []
            }
        
        q1 = df['amount'].quantile(0.25)
        q3 = df['amount'].quantile(0.75)
        iqr = q3 - q1
        
        high_threshold = q3 + 1.5 * iqr
        low_threshold = max(0, q1 - 1.5 * iqr)
        
        median = df['amount'].median()
        normal_min = max(0, median - iqr)
        normal_max = median + iqr
        normal_range = (normal_min, normal_max)
        
        high_outliers = df[df['amount'] > high_threshold]
        low_outliers = df[df['amount'] < low_threshold]
        
        high_anomalies = []
        low_anomalies = []
        
        for _, outlier in high_outliers.iterrows():
            amount = outlier['amount']
            percent_deviation = ((amount - median) / median) * 100
            
            anomaly_data = {
                'amount': amount,
                'normal_range': normal_range,
                'percent_deviation': percent_deviation
            }
            
            if 'date' in outlier:
                anomaly_data['date'] = outlier['date']
            
            if '_id' in outlier:
                anomaly_data['transaction_id'] = outlier['_id']
            elif 'transactionId' in outlier:
                anomaly_data['transaction_id'] = outlier['transactionId']
            
            high_anomalies.append(anomaly_data)
        
        for _, outlier in low_outliers.iterrows():
            amount = outlier['amount']
            percent_deviation = ((amount - median) / median) * 100
            
            anomaly_data = {
                'amount': amount,
                'normal_range': normal_range,
                'percent_deviation': percent_deviation
            }
            
            if 'date' in outlier:
                anomaly_data['date'] = outlier['date']
            
            if '_id' in outlier:
                anomaly_data['transaction_id'] = outlier['_id']
            elif 'transactionId' in outlier:
                anomaly_data['transaction_id'] = outlier['transactionId']
            
            low_anomalies.append(anomaly_data)
        
        return {
            'high_spending_anomalies': high_anomalies,
            'low_spending_anomalies': low_anomalies
        }
    
    except Exception as e:
        return {
            'error': f"Error detecting anomalies: {str(e)}"
        }