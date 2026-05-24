import { ethers } from "ethers";
import { loadWallet, getWalletBalance } from "../lib/wallet.js";
import { CHAIN } from "../lib/config.js";
import { printSuccess, printError } from "../lib/output.js";
import { EXIT_CODES, YukaError, NoWalletError } from "../lib/errors.js";
import type { Network } from "@yuka/shared";

const POSITION_MANAGER_ABI = [
  "function balances(address) external view returns (uint256)",
  "function protocolFee() external view returns (uint256)",
];

export async function fees(opts: { testnet: boolean; json: boolean }): Promise<void> {
  const { testnet, json } = opts;
  const network: Network = testnet ? "testnet" : "mainnet";
  const chain = testnet ? CHAIN.testnet : CHAIN.mainnet;

  try {
    const walletData = await loadWallet();
    if (!walletData) throw new NoWalletError();

    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    const pm = new ethers.Contract(chain.positionManagerAddress, POSITION_MANAGER_ABI, provider);

    const claimable = await pm.balances(walletData.address) as bigint;
    const claimableEth = ethers.formatEther(claimable);

    let protocolFeeBps = 1000n;
    try { protocolFeeBps = await pm.protocolFee() as bigint; } catch { /* use default */ }
    const afterProtocol = claimable - (claimable * protocolFeeBps / 10000n);

    const walletBalance = await getWalletBalance(walletData.address, network);
    const hasGas = parseFloat(walletBalance) > 0;

    printSuccess("Fee balance", {
      claimable: `${claimableEth} ETH`,
      afterProtocolFee: `~${ethers.formatEther(afterProtocol)} ETH`,
      protocolFee: `${Number(protocolFeeBps) / 100}%`,
      wallet: walletData.address,
      walletBalance: `${walletBalance} ETH`,
      hasGas,
      network: chain.name,
      canClaim: hasGas && claimable > 0n,
    }, json);
  } catch (error) {
    if (error instanceof YukaError) { printError(error.message, json, error.exitCode); process.exit(error.exitCode); }
    printError(error instanceof Error ? error.message : String(error), json, EXIT_CODES.GENERAL);
    process.exit(EXIT_CODES.GENERAL);
  }
}
