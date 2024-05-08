require('dotenv').config();

import {Connection, Keypair, PublicKey} from '@solana/web3.js';
import * as Fs from 'fs';
import {swap} from './swap';
import {getTokenConfig} from './config';

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

  const inputTokenName = process.argv[2];
  const outputTokenName = process.argv[3];
  const inputUiAmout = parseFloat(process.argv[4]);
  const slippageBps = parseInt(process.argv[5]);

  const inputTokenConfig = getTokenConfig(inputTokenName);
  const outputTokenConfig = getTokenConfig(outputTokenName);

  const transaction = await swap(
    payer,
    inputTokenConfig,
    outputTokenConfig,
    inputUiAmout,
    slippageBps
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
