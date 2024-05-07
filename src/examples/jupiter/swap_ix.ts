import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import * as web3 from '@solana/web3.js';

export const swapIx = async (
  connection: Connection,
  keypair: Keypair,
  inputMint: string,
  outputMint: string,
  inputAmount: number,
  slippageBps: number,
  tipAccount: PublicKey
): Promise<VersionedTransaction> => {
  // Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
  const quote_url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount}&slippageBps=${slippageBps}`;
  console.log(quote_url);
  const quoteResponse = await (await fetch(quote_url)).json();
  console.log(JSON.stringify(quoteResponse));

  // get serialized transactions for the swap
  const instructions = await (
    await fetch('https://quote-api.jup.ag/v6/swap-instructions', {
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
        dynamicComputeUnitLimit: true,
        // prioritizationFeeLamports: 'auto',
        // prioritizationFeeLamports: {
        //   autoMultiplier: 2,
        // },
        onlyDirectRoutes: true,
      }),
    })
  ).json();

  if (instructions.error) {
    throw new Error('Failed to get swap instructions: ' + instructions.error);
  }

  const {
    tokenLedgerInstruction, // If you are using `useTokenLedger = true`.
    computeBudgetInstructions, // The necessary instructions to setup the compute budget.
    setupInstructions, // Setup missing ATA for the users.
    swapInstruction: swapInstructionPayload, // The actual swap instruction.
    cleanupInstruction, // Unwrap the SOL if `wrapAndUnwrapSol = true`.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = instructions;

  const deserializeInstruction = (instruction: TransactionInstruction) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),
      keys: instruction.keys?.map(key => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: instruction.data,
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await connection.getMultipleAccountsInfo(
        keys.map(key => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(accountInfo.data),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts(addressLookupTableAddresses))
  );

  const tipLamports = parseInt(process.env.TIP_LAMPORTS || '1000');

  const jitoBundleFee = web3.SystemProgram.transfer({
    fromPubkey: keypair.publicKey,
    toPubkey: tipAccount,
    // lamports: web3.LAMPORTS_PER_SOL / 1000,
    lamports: tipLamports,
  });

  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      // uncomment if needed:
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstructionPayload),
      // uncomment if needed:
      deserializeInstruction(cleanupInstruction),
      jitoBundleFee,
    ],
  }).compileToV0Message(addressLookupTableAccounts);
  const transaction = new VersionedTransaction(messageV0);

  // sign the transaction
  transaction.sign([keypair]);

  return transaction;
};
