import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import {SearcherClient} from '../../sdk/block-engine/searcher';
import {Bundle} from '../../sdk/block-engine/types';
import {isError} from '../../sdk/block-engine/utils';
import {swap} from '../jupiter/swap';
import {getTokenConfig} from '../jupiter/config';
const bs58 = require('bs58');

const MEMO_PROGRAM_ID = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';

export const sendBundles = async (
  c: SearcherClient,
  bundleTransactionLimit: number,
  keypair: Keypair,
  conn: Connection
) => {
  const _tipAccount = (await c.getTipAccounts())[0];
  console.log('tip account:', _tipAccount);
  const tipAccount = new PublicKey(_tipAccount);

  let balance = await conn.getBalance(keypair.publicKey);
  console.log('current account has balance: ', balance);

  let isLeaderSlot = false;
  while (!isLeaderSlot) {
    let next_leader = await c.getNextScheduledLeader();
    let num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;
    isLeaderSlot = num_slots <= 2;
    console.log(`next jito leader slot in ${num_slots} slots`);
    await new Promise(r => setTimeout(r, 500));
  }

  let blockHash = await conn.getLatestBlockhash();
  const b = new Bundle([], bundleTransactionLimit);

  console.log('blockhash:', blockHash.blockhash);

  let bundles = [b];

  let maybeBundle = b.addTransactions(
    // buildMemoTransaction(keypair, 'jito test 1', blockHash.blockhash),
    // buildMemoTransaction(keypair, 'jito test 2', blockHash.blockhash),
    await buildSawpTransaction(conn, keypair, tipAccount)
  );
  if (isError(maybeBundle)) {
    throw maybeBundle;
  }

  // const tipLamports = parseInt(process.env.TIP_LAMPORTS || '1000');
  // console.log('tip lamports:', tipLamports);

  // maybeBundle = maybeBundle.addTipTx(
  //   keypair,
  //   tipLamports,
  //   tipAccount,
  //   blockHash.blockhash
  // );

  if (isError(maybeBundle)) {
    throw maybeBundle;
  }

  bundles.map(async b => {
    try {
      const resp = await c.sendBundle(b);
      console.log('send bundle resp:', resp); // bundle's UUID
    } catch (e) {
      console.error('error sending bundle:', e);
    }
  });
};

export const onBundleResult = (c: SearcherClient) => {
  c.onBundleResult(
    result => {
      console.log(new Date().toLocaleTimeString());
      console.log('received bundle result:', result);
    },
    e => {
      throw e;
    }
  );
};

const buildMemoTransaction = (
  keypair: Keypair,
  message: string,
  recentBlockhash: string
): VersionedTransaction => {
  const ix = new TransactionInstruction({
    keys: [
      {
        pubkey: keypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
    ],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(message),
  });

  const instructions = [ix];

  const messageV0 = new TransactionMessage({
    payerKey: keypair.publicKey,
    recentBlockhash: recentBlockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  tx.sign([keypair]);

  console.log('txn signature is: ', bs58.encode(tx.signatures[0]));
  return tx;
};

const buildSawpTransaction = async (
  connection: Connection,
  payer: Keypair,
  tipAccount: PublicKey
): Promise<VersionedTransaction> => {
  console.dir(process.argv);

  const inputTokenName = process.argv[2];
  const outputTokenName = process.argv[3];
  const inputUiAmout = parseFloat(process.argv[4]);
  const slippageBps = parseInt(process.argv[5]);

  const inputTokenConfig = getTokenConfig(inputTokenName);
  const outputTokenConfig = getTokenConfig(outputTokenName);

  const swapTransaction = await swap(
    payer,
    inputTokenConfig,
    outputTokenConfig,
    inputUiAmout,
    slippageBps
  );

  return swapTransaction;
};
