
import wallet from "./midnightWallet";

async function logToBlockchain(userId: any, otherData: any) {
  try {
    const transactionToProve = await wallet.transferTransaction([
      {
        amount: BigInt(1),
        receiverAddress: "<midnight-wallet-address>", // Replace with a valid address
        type: "0100010000000000000000000000000000000000000000000000000000000000000000", // tDUST token type
        // Remove metadata since it's not a valid property of TokenTransfer
      },
    ]);

    const provenTransaction = await wallet.proveTransaction(transactionToProve);
    const submittedTransaction =
      await wallet.submitTransaction(provenTransaction);

    console.log("Transaction submitted", submittedTransaction);
  } catch (error) {
    console.error("Error logging to blockchain", error);
  }
}

export default logToBlockchain;
