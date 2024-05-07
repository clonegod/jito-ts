require('dotenv').config();

import {Connection, Keypair, PublicKey} from '@solana/web3.js';
import * as Fs from 'fs';
import {swap} from './swap';

const main = async () => {
  const connection = new Connection(
    'https://mainnet.helius-rpc.com/?api-key=07de6edd-4b17-4a93-9bd7-0fe17de22f67',
    'confirmed'
  );

  const payerKeypairPath = process.env.PAYER_KEYPAIR_PATH || '';
  console.log('PAYER_KEYPAIR_PATH:', payerKeypairPath);
  const payer = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(Fs.readFileSync(payerKeypairPath).toString()) as number[]
    )
  );

  const transaction = await swap(
    payer,
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    10 * 1e6,
    15
  );

  console.log(`transaction=`, JSON.stringify(transaction));

  // Execute the transaction
  const rawTransaction = transaction.serialize();

  const txid = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 2,
  });
  await connection.confirmTransaction(txid, 'processed');
  console.log(`https://solscan.io/tx/${txid}`);
};

main();
