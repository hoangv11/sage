import pandas as pd
from datetime import datetime, timedelta
import random

# Define a function to simulate daily transactions with specified categories
def simulate_transactions(start_date, end_date):
    transactions = []
    current_date = start_date

    # Dictionary mapping categories to possible vendors and transaction frequencies
    vendor_dict = {
        'general_merchandise': {'vendors': ['walmart', 'target', 'amazon'], 'frequency': 0.2},
        'food_and_drink': {'vendors': ['starbucks', 'mcdonalds', 'local_cafe'], 'frequency': 0.5},
        'transportation': {'vendors': ['uber', 'lyft', 'taxi'], 'frequency': 0.3},
        'entertainment': {'vendors': ['netflix', 'movie_theater', 'concert'], 'frequency': 0.1},
        'travel': {'vendors': ['airbnb', 'expedia', 'local_hotel'], 'frequency': 0.05},
        'loan_payments': {'vendors': ['bank_of_america', 'chase', 'wells_fargo'], 'frequency': 0.05},
        'general_services': {'vendors': ['cleaning_service', 'repair_shop', 'delivery_service'], 'frequency': 0.1},
        'personal_care': {'vendors': ['salon', 'spa', 'gym'], 'frequency': 0.1}
    }

    # List of holidays with special spending patterns
    holidays = {
        datetime(2023, 12, 25): {'category': 'general_merchandise', 'amount': 500.00},  # Christmas
        datetime(2024, 1, 1): {'category': 'food_and_drink', 'amount': 200.00},  # New Year's Day
        datetime(2024, 7, 4): {'category': 'entertainment', 'amount': 300.00},  # Independence Day
        datetime(2024, 12, 25): {'category': 'general_merchandise', 'amount': 500.00},  # Christmas
        datetime(2025, 1, 1): {'category': 'food_and_drink', 'amount': 200.00}  # New Year's Day
    }

    while current_date <= end_date:
        # Randomly decide if there are transactions on weekends or holidays
        if current_date.weekday() >= 5:
            if random.random() < 0.5:  # 50% chance of transactions on weekends
                pass
            else:
                current_date += timedelta(days=1)
                continue

        # Generate transactions for each category based on frequency
        for category, details in vendor_dict.items():
            if random.random() < details['frequency']:
                transaction_time = f"{random.randint(7, 21)}:{random.randint(0, 59)}"
                transactions.append({
                    'account_id': 'MzlkawJ9zZFookd9bynvc66GN1rGnxcLRpg8M',
                    'transaction_id': str(random.randint(10000000, 99999999)),
                    'date': current_date,
                    'time': transaction_time,
                    'activity': category,
                    'amount': round(random.uniform(10.00, 100.00), 2),
                    'category': category,
                    'type': 'expense',
                    'vendor_name': random.choice(details['vendors'])
                })

        # Check for holiday spending
        if current_date in holidays:
            holiday_details = holidays[current_date]
            transaction_time = f"{random.randint(10, 18)}:{random.randint(0, 59)}"
            transactions.append({
                'account_id': 'MzlkawJ9zZFookd9bynvc66GN1rGnxcLRpg8M',
                'transaction_id': str(random.randint(10000000, 99999999)),
                'date': current_date,
                'time': transaction_time,
                'activity': holiday_details['category'],
                'amount': holiday_details['amount'],
                'category': holiday_details['category'],
                'type': 'expense',
                'vendor_name': random.choice(vendor_dict[holiday_details['category']]['vendors'])
            })

        # Salary deposit (once a month)
        if current_date.day == 1:
            transactions.append({
                'account_id': 'MzlkawJ9zZFookd9bynvc66GN1rGnxcLRpg8M',
                'transaction_id': str(random.randint(10000000, 99999999)),
                'date': current_date,
                'time': '09:00',
                'activity': 'monthly_salary',
                'amount': round(random.uniform(3000.00, 4000.00), 2),
                'category': 'income',
                'type': 'income',
                'vendor_name': 'employer'
            })

        # Transfer to savings (every Friday)
        if current_date.weekday() == 4:
            transactions.append({
                'account_id': 'MzlkawJ9zZFookd9bynvc66GN1rGnxcLRpg8M',
                'transaction_id': str(random.randint(10000000, 99999999)),
                'date': current_date,
                'time': '10:00',
                'activity': 'transfer_to_savings',
                'amount': round(random.uniform(50.00, 100.00), 2),
                'category': 'savings',
                'type': 'transfer',
                'vendor_name': 'savings_account'
            })

        # Increment the date
        current_date += timedelta(days=1)

    return pd.DataFrame(transactions)

# Define the simulation period
start_date = datetime(2023, 1, 1)
end_date = datetime(2025, 3, 29)

# Generate the transactions data
data = simulate_transactions(start_date, end_date)

# Save to a CSV file
data.to_csv('server/data/financial_transactions.csv', index=False)

# Display the first few rows of the generated data
print(data.head())
