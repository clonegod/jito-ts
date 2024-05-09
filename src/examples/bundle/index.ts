require('dotenv').config();

import {Keypair, Connection, PublicKey} from '@solana/web3.js';
import * as Fs from 'fs';

import {searcherClient} from '../../sdk/block-engine/searcher';
import {onBundleResult, sendBundles} from './utils';
import {onAccountUpdates} from '../backrun/utils';

const main = async () => {
  const blockEngineUrl = process.argv[6] + process.env.BLOCK_ENGINE_URL || '';
  console.log('BLOCK_ENGINE_URL:', blockEngineUrl);

  const authKeypairPath = process.env.AUTH_KEYPAIR_PATH || '';
  console.log('AUTH_KEYPAIR_PATH:', authKeypairPath);
  const decodedKey = new Uint8Array(
    JSON.parse(Fs.readFileSync(authKeypairPath).toString()) as number[]
  );
  const keypair = Keypair.fromSecretKey(decodedKey);

  // const _accounts = (process.env.ACCOUNTS_OF_INTEREST || '').split(',');
  // console.log('ACCOUNTS_OF_INTEREST:', _accounts);
  // const accounts = _accounts.map(a => new PublicKey(a));

  const bundleTransactionLimit = parseInt(
    process.env.BUNDLE_TRANSACTION_LIMIT || '0'
  );

  const c = searcherClient(blockEngineUrl, keypair);

  const rpcUrl = process.env.RPC_URL || '';
  console.log('RPC_URL:', rpcUrl);
  const conn = new Connection(rpcUrl, 'confirmed');

  const payerKeypairPath = process.env.PAYER_KEYPAIR_PATH || '';
  console.log('PAYER_KEYPAIR_PATH:', payerKeypairPath);
  const payer = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(Fs.readFileSync(payerKeypairPath).toString()) as number[]
    )
  );

  const txid = await sendBundles(c, bundleTransactionLimit, payer, conn);
  onBundleResult(c, conn, txid, async (txid: string) => {
    await new Promise(r => setTimeout(r, 500));
    console.log('SignatureStatus');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 50));
      const rs = await conn.getSignatureStatus(txid, {
        searchTransactionHistory: true,
      });
      console.log(formatTimeWithMilliseconds(new Date()), rs);
      if (
        rs.value?.confirmationStatus == 'confirmed' ||
        rs.value?.confirmationStatus == 'finalized'
      ) {
        console.log('success');
        break;
      }
    }
  });
};

main()
  .then(() => {
    console.log('Sending bundle', new Date().toLocaleTimeString());
  })
  .catch(e => {
    throw e;
  });

function formatTimeWithMilliseconds(date: Date) {
  function pad(number: number) {
    if (number < 10) {
      return '0' + number;
    }
    return number;
  }

  return (
    date.getFullYear() +
    '-' +
    pad(date.getMonth() + 1) +
    '-' +
    pad(date.getDate()) +
    ' ' +
    pad(date.getHours()) +
    ':' +
    pad(date.getMinutes()) +
    ':' +
    pad(date.getSeconds()) +
    '.' +
    pad(date.getMilliseconds())
  );
}
