import json
import csv
import pandas as pd

def remove_negative_transactions(transactions):
    """
    Filter out transactions with negative amounts.
    Args:
        transactions: List of transaction dictionaries
    Returns:
        List of transactions with only positive or zero amounts
    """
    return [tx for tx in transactions if tx.get('amount', 0) >= 0]

def parse_transactions_to_csv():
    # Read the JSON file
    with open('server/data/test_data.json', 'r') as file:
        data = json.load(file)
    
    # Extract transactions list and remove negative amounts
    transactions = data['transactions']
    transactions = remove_negative_transactions(transactions)
    
    # Define the columns we want to extract
    # Extract all available columns from first transaction
    columns = list(transactions[0].keys())
    
    # Prepare data for CSV
    processed_data = []
    for transaction in transactions:
        row = {}
        for col in columns:
            if col == 'authorized_datetime' or col == 'authorized_date':
                continue  # Skip authorized_datetime column 
            elif col == 'personal_finance_category':
                # Handle nested personal_finance_category fields
                pfc = transaction.get(col, {})
                for pfc_key in pfc.keys():
                    row[f'personal_finance_category_{pfc_key}'] = pfc.get(pfc_key, '')
            elif col == 'payment_meta':
                # Handle nested payment_meta fields
                pm = transaction.get(col, {})
                for pm_key in pm.keys():
                    row[f'payment_meta_{pm_key}'] = pm.get(pm_key, '')
            elif col == 'location':
                # Handle nested location fields
                loc = transaction.get(col, {})
                for loc_key in loc.keys():
                    row[f'location_{loc_key}'] = loc.get(loc_key, '')
            elif col == 'counterparties':
                # Handle counterparties array
                counterparties = transaction.get(col, [])
                if counterparties:
                    cp = counterparties[0]  # Take first counterparty
                    for cp_key in cp.keys():
                        row[f'counterparty_{cp_key}'] = cp.get(cp_key, '')
            elif col == 'category':
                # Handle category array
                categories = transaction.get(col, [])
                row[col] = ' > '.join(categories) if categories else ''
            else:
                # Handle regular fields
                row[col] = transaction.get(col, '')
        processed_data.append(row)
    
    # Convert to DataFrame and save to CSV
    df = pd.DataFrame(processed_data)
    df.to_csv('server/data/transactions.csv', index=False)
    print(f"CSV file created successfully with {len(processed_data)} transactions (negative amounts removed).")

def parse_accounts_to_csv():
    # Read the JSON file
    with open('server/data/test_data.json', 'r') as file:
        data = json.load(file)
    
    # Extract accounts list
    accounts = data.get('accounts', [])
    
    if not accounts:
        print("No accounts data found in the JSON file.")
        return
    
    # Define the columns we want to extract
    # Extract all available columns from first account
    columns = list(accounts[0].keys())
    
    # Prepare data for CSV
    processed_data = []
    for account in accounts:
        row = {}
        for col in columns:
            if col == 'balances':
                # Handle nested balances fields
                balances = account.get(col, {})
                for bal_key in balances.keys():
                    row[f'balance_{bal_key}'] = balances.get(bal_key, '')
            else:
                # Handle regular fields
                row[col] = account.get(col, '')
        processed_data.append(row)
    
    # Convert to DataFrame and save to CSV
    df = pd.DataFrame(processed_data)
    df.to_csv('server/data/accounts.csv', index=False)
    print(f"CSV file created successfully with {len(processed_data)} accounts.")

if __name__ == "__main__":
    parse_transactions_to_csv()
    parse_accounts_to_csv()
