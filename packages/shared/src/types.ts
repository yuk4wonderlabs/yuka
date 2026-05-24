export type Network = "mainnet" | "testnet";

export interface WalletData {
  address: string;
  privateKey: string;
  createdAt: string;
}

export interface LaunchRecord {
  name: string;
  symbol: string;
  tokenAddress: string;
  transactionHash: string;
  network: Network;
  walletAddress: string;
  launchedAt: string;
  flaunchUrl: string;
}

export interface LaunchParams {
  name: string;
  symbol: string;
  description: string;
  imagePath?: string;
  website?: string;
  testnet: boolean;
  json: boolean;
}

// ─── Flaunch API types ────────────────────────────────────────────────────────

export interface FlaunchUploadResponse {
  ipfsHash: string;
}

export interface FlaunchLaunchResponse {
  jobId: string;
}

export interface FlaunchStatusResponse {
  state: "pending" | "processing" | "completed" | "failed";
  queuePosition: number;
  collectionToken?: { address: string };
  transactionHash?: string;
  error?: string;
}

export interface FlaunchToken {
  tokenAddress: string;
  name: string;
  symbol: string;
  image: string;
  marketCapETH: string;
  createdAt: number;
  fairLaunchActive: boolean;
}

export interface FlaunchTokenListResponse {
  data: FlaunchToken[];
}

export interface FlaunchTokenDetails {
  tokenAddress: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  price: {
    marketCapETH: string;
    priceChange24h: string;
  };
  volume: {
    volume24h: string;
  };
  status: {
    owner: string;
    createdAt: number;
  };
}

export interface FlaunchHolder {
  address: string;
  balance: string;
}
