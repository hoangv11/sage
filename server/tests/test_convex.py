import os
import json
import sys
from datetime import datetime

try:
    from anomaly_detector import detect_spending_anomalies
except ImportError:
    print("Error: Could not import 'detect_spending_anomalies' from 'anomaly_detector'")
    print("Make sure the module is installed or in your PYTHONPATH")
    sys.exit(1)

def main():
    if 'CONVEX_URL' not in os.environ:
        print("Error: CONVEX_URL environment variable not set")
        print("Please set it with: export CONVEX_URL='https://your-convex-url.convex.cloud'")
        sys.exit(1)
    
    user_id = "MzlkawJ9zZFookd9bynvc66GN1rGnxcLRpg8M"
    start_date = "2025-02-01"
    end_date = "2025-03-20"
    
    print(f"Running anomaly detection for user {user_id}")
    print(f"Time period: {start_date} to {end_date}")
    print(f"Using Convex URL: {os.environ.get('CONVEX_URL')}")
    
    try:
        result = detect_spending_anomalies(user_id, start_date, end_date)
        
        print("\n=== RAW RESULTS ===")
        print(json.dumps(result, indent=2, default=str))
        
        if 'error' in result:
            print(f"\nError returned: {result['error']}")
            return
        
        high_anomalies = result.get('high_spending_anomalies', [])
        low_anomalies = result.get('low_spending_anomalies', [])
        
        print(f"\n=== ANOMALY SUMMARY ===")
        print(f"Found {len(high_anomalies)} high spending anomalies")
        print(f"Found {len(low_anomalies)} low spending anomalies")
        
        if high_anomalies:
            print("\n=== HIGH SPENDING ANOMALIES ===")
            for i, anomaly in enumerate(high_anomalies):
                print(f"Anomaly #{i+1}:")
                print(f"  Transaction ID: {anomaly.get('transaction_id', 'N/A')}")
                print(f"  Date: {anomaly.get('date', 'N/A')}")
                print(f"  Amount: ${anomaly.get('amount', 0):.2f}")
                if 'normal_range' in anomaly:
                    print(f"  Normal range: ${anomaly['normal_range'][0]:.2f} - ${anomaly['normal_range'][1]:.2f}")
                if 'percent_deviation' in anomaly:
                    print(f"  Deviation: {anomaly['percent_deviation']:.2f}%")
                if 'description' in anomaly:
                    print(f"  Description: {anomaly['description']}")
                print()
        
        if low_anomalies:
            print("\n=== LOW SPENDING ANOMALIES ===")
            for i, anomaly in enumerate(low_anomalies):
                print(f"Anomaly #{i+1}:")
                print(f"  Transaction ID: {anomaly.get('transaction_id', 'N/A')}")
                print(f"  Date: {anomaly.get('date', 'N/A')}")
                print(f"  Amount: ${anomaly.get('amount', 0):.2f}")
                if 'normal_range' in anomaly:
                    print(f"  Normal range: ${anomaly['normal_range'][0]:.2f} - ${anomaly['normal_range'][1]:.2f}")
                if 'percent_deviation' in anomaly:
                    print(f"  Deviation: {anomaly['percent_deviation']:.2f}%")
                if 'description' in anomaly:
                    print(f"  Description: {anomaly['description']}")
                print()
    
    except Exception as e:
        print(f"\nError executing test: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    main()