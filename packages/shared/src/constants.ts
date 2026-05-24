// ─── APIs ────────────────────────────────────────────────────────────────────

export const FLAUNCH_API_BASE = "https://web2-api.flaunch.gg";
export const FLAUNCH_DATA_API_BASE = "https://api.flayerlabs.xyz";

// ─── Chain config ────────────────────────────────────────────────────────────

export const CHAIN = {
  mainnet: {
    id: 8453,
    name: "Base",
    network: "base",
    rpcUrl: "https://mainnet.base.org",
    explorer: "https://basescan.org",
    flaunchUrl: "https://flaunch.gg/base",
    positionManagerAddress: "0x51Bba15255406Cfe7099a42183302640ba7dAFDC",
  },
  testnet: {
    id: 84532,
    name: "Base Sepolia",
    network: "base-sepolia",
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    flaunchUrl: "https://flaunch.gg/base-sepolia",
    positionManagerAddress: "0x9A7059cA00dA92843906Cb4bCa1D005cE848AFdC",
  },
} as const;

// ─── Legacy export (mainnet only — use CHAIN.*.positionManagerAddress instead) ──
export const POSITION_MANAGER_ADDRESS = CHAIN.mainnet.positionManagerAddress;

// ─── CLI constants ────────────────────────────────────────────────────────────

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const POLL_INTERVAL_MS = 2_000;
export const POLL_TIMEOUT_MS = 120_000;
