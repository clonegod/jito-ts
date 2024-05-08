export function getTokenConfig(tokenName: string): TokenConfig {
  const token = token_defs.find(t => t.name === tokenName);
  if (!token) {
    throw new Error('Not config error! tokenName=' + tokenName);
  }
  return token;
}

export interface TokenConfig {
  name: string;
  address: string;
  decimals: number;
}

const token_defs = [
  {
    name: 'USDC',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
  },
  {
    name: 'USDT',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
  },
];
