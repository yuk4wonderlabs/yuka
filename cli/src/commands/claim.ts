import { ethers } from "ethers";
import { loadWallet, getSigner, getWalletBalance } from "../lib/wallet.js";
import { CHAIN } from "../lib/config.js";
import { printSuccess, printError } from "../lib/output.js";
import { EXIT_CODES, YukaError, NoWalletError, NoGasError } from "../lib/errors.js";
import type { Network } from "@yuka/shared";

const POSITION_MANAGER_ABI = [
  "function balances(address) external view returns (uint256)",
  "function claim() external returns (uint256)",
];

export async function claim(opts: { testnet: boolean; json: boolean }): Promise<void> {
  const { testnet, json } = opts;
  const network: Network = testnet ? "testnet" : "mainnet";
  const chain = testnet ? CHAIN.testnet : CHAIN.mainnet;

  try {
    const walletData = await loadWallet();
    if (!walletData) throw new NoWalletError();

    const balance = await getWalletBalance(walletData.address, network);
    if (parseFloat(balance) === 0) throw new NoGasError(walletData.address);

    const signer = await getSigner(walletData.privateKey, network);
    const pm = new ethers.Contract(chain.positionManagerAddress, POSITION_MANAGER_ABI, signer);

    const claimable = await pm.balances(walletData.address) as bigint;
    if (claimable === 0n) {
      printSuccess("claim", { claimable: "0 ETH", wallet: walletData.address }, json, "No fees to claim");
      return;
    }

    if (!json) console.log(`\nClaimable: ${ethers.formatEther(claimable)} ETH`);
    if (!json) process.stdout.write("Submitting claim...");

    const tx = await pm.claim() as { hash: string; wait: () => Promise<{ hash: string } | null> };
    if (!json) console.log(` tx ${tx.hash}`);
    if (!json) process.stdout.write("Waiting for confirmation...");

    const receipt = await tx.wait();
    if (!receipt) throw new YukaError("Transaction dropped or replaced", EXIT_CODES.GENERIC, "GENERIC");
    if (!json) console.log(" confirmed");

    printSuccess("claim", {
      transactionHash: receipt.hash,
      claimed: `${ethers.formatEther(claimable)} ETH (minus protocol fee)`,
      wallet: walletData.address,
      network,
    }, json, "Fees claimed!");
  } catch (error) {
    if (error instanceof YukaError) {
      printError("claim", error.message, error.code, json);
      process.exit(error.exitCode);
    }
    printError("claim", error instanceof Error ? error.message : String(error), "GENERIC", json);
    process.exit(EXIT_CODES.GENERIC);
  }
}
