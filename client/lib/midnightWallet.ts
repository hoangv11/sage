
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId } from '@midnight-ntwrk/zswap';

const wallet = await WalletBuilder.build(
  'https://indexer.testnet.midnight.network/api/v1/graphql',
  'wss://indexer.testnet.midnight.network/api/v1/graphql',
  'http://localhost:6300',
  'https://rpc.testnet.midnight.network',
  NetworkId.TestNet
);

export default wallet;
