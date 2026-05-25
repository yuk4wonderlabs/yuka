import { loadWallet, getWalletBalance } from "../lib/wallet.js";
import { printSuccess, printError } from "../lib/output.js";
import { EXIT_CODES, YukaError } from "../lib/errors.js";

export async function wallet(opts: { json: boolean }): Promise<void> {
  const { json } = opts;
  try {
    const data = await loadWallet();
    if (!data) {
      printError("wallet", "No wallet found. Run `yuka wallet` to create one.", "WALLET_MISSING", json);
      process.exit(EXIT_CODES.WALLET_MISSING);
    }

    let balance = "unknown";
    try { balance = await getWalletBalance(data.address, "mainnet"); } catch { /* RPC unreachable */ }

    printSuccess("wallet", {
      address: data.address,
      balance: `${balance} ETH`,
      network: "Base",
      createdAt: data.createdAt,
    }, json, "Wallet");
  } catch (error) {
    if (error instanceof YukaError) {
      printError("wallet", error.message, error.code, json);
      process.exit(error.exitCode);
    }
    printError("wallet", error instanceof Error ? error.message : String(error), "GENERIC", json);
    process.exit(EXIT_CODES.GENERIC);
  }
}
