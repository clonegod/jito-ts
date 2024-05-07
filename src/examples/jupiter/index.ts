require('dotenv').config();

import {Keypair} from '@solana/web3.js';
import * as Fs from 'fs';
import {swap} from './swap';

const main = async () => {
  const payerKeypairPath = process.env.PAYER_KEYPAIR_PATH || '';
  console.log('PAYER_KEYPAIR_PATH:', payerKeypairPath);
  const payer = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(Fs.readFileSync(payerKeypairPath).toString()) as number[]
    )
  );

  await swap(
    payer,
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    10 * 1e6,
    15
  );
};

main();
