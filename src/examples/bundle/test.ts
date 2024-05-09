import {Connection} from '@solana/web3.js';

const test = async () => {
  const conn = new Connection(
    'https://mainnet.helius-rpc.com/?api-key=07de6edd-4b17-4a93-9bd7-0fe17de22f67'
  );

  const rs = await conn.getSignatureStatus(
    '4MJLEnVxc5GsV5Tg2MTH6dCzMuonn1fdYA5qTy4jHeQyZPiYDR9hgGYEdi9rHwejmyxh5nAaaZtPwrFPFbzqFa1D',
    {
      searchTransactionHistory: true,
    }
  );

  console.log(rs);
};

test();
