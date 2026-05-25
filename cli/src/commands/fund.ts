import { loadWallet, getWalletBalance } from "../lib/wallet.js";
import { printSuccess, printError } from "../lib/output.js";
import { EXIT_CODES, YukaError, NoWalletError } from "../lib/errors.js";

const FUNDING_METHODS = [
  { method: "Base Bridge", url: "https://bridge.base.org" },
  { method: "Coinbase", url: "https://www.coinbase.com" },
  { method: "Direct transfer", description: "Send ETH on Base to the address above" },
] as const;

export async function fund(opts: { json: boolean }): Promise<void> {
  const { json } = opts;
  try {
    const data = await loadWallet();
    if (!data) throw new NoWalletError();

    let balance: string | null = null;
    try { balance = await getWalletBalance(data.address, "mainnet"); } catch { /* RPC unreachable */ }

    if (!json) {
      console.log("\nFund your agent wallet\n");
      console.log(`  Address:  ${data.address}`);
      console.log(`  Balance:  ${balance ?? "unknown"} ETH (Base)\n`);
      console.log("  How to fund:");
      console.log("    1. Base Bridge:  https://bridge.base.org");
      console.log("    2. Coinbase:     https://www.coinbase.com");
      console.log("    3. Direct:       Send ETH on Base to the address above\n");
      return;
    }

    printSuccess("fund", {
      address: data.address,
      balance,
      network: "Base",
      chainId: 8453,
      fundingMethods: FUNDING_METHODS,
    }, json, "Fund your agent wallet");
  } catch (error) {
    if (error instanceof YukaError) {
      printError("fund", error.message, error.code, json);
      process.exit(error.exitCode);
    }
    printError("fund", error instanceof Error ? error.message : String(error), "GENERIC", json);
    process.exit(EXIT_CODES.GENERIC);
  }
}
