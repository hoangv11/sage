from model_pipeline import ModelPipeline, read_financial_transactions

def main():
    df = read_financial_transactions()
    columns = ['amount', 'type', 'datetime', 'category']
    df = df[columns]

    df_train = df[df['datetime'] < '2024-08-29']
    # df_test = df[df['datetime'] >= '2024-08-29']

    # Initialize and train
    predictor = ModelPipeline()
    predictor.train(df_train)
    predictor.save('../models/oracle_v1')

    # Load the predictor later
    # loaded_predictor = ModelPipeline.load('../models/oracle_v1')

if __name__ == "__main__":
    main()
