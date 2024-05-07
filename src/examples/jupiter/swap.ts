import {Keypair, VersionedTransaction} from '@solana/web3.js';

export const swap = async (
  keypair: Keypair,
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  slippageBps: number
): Promise<VersionedTransaction> => {
  // Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
  const quote_url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount}&slippageBps=${slippageBps}`;
  console.log(quote_url);
  const quoteResponse = await (await fetch(quote_url)).json();
  console.log(JSON.stringify(quoteResponse));

  // get serialized transactions for the swap
  const {swapTransaction} = await (
    await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // quoteResponse from /quote api
        quoteResponse,
        // user public key to be used for the swap
        userPublicKey: keypair.publicKey.toString(),
        // auto wrap and unwrap SOL. default is true
        wrapAndUnwrapSol: true,
        // The compute unit price to prioritize the transaction
        // dynamicComputeUnitLimit: true,
        // prioritizationFeeLamports: 'auto',
        prioritizationFeeLamports: {
          autoMultiplier: 2,
        },
      }),
    })
  ).json();

  // deserialize the transaction
  const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
  var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  // console.log(transaction)

  // sign the transaction
  transaction.sign([keypair]);

  return transaction;
};
