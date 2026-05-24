import { loadWallet, getWalletBalance } from "../lib/wallet.js";
import { printSuccess, printError } from "../lib/output.js";
import { EXIT_CODES, YukaError } from "../lib/errors.js";

export async function wallet(opts: { json: boolean }): Promise<void> {
  const { json } = opts;
  try {
    const data = await loadWallet();
    if (!data) {
      printError("No wallet found. Run `yuka launch` to create one.", json, EXIT_CODES.NO_WALLET);
      process.exit(EXIT_CODES.NO_WALLET);
    }

    let balance = "unknown";
    try { balance = await getWalletBalance(data.address, "mainnet"); } catch { /* RPC unreachable */ }

    printSuccess("Wallet", {
      address: data.address,
      balance: `${balance} ETH`,
      network: "Base",
      createdAt: data.createdAt,
    }, json);
  } catch (error) {
    if (error instanceof YukaError) { printError(error.message, json, error.exitCode); process.exit(error.exitCode); }
    printError(error instanceof Error ? error.message : String(error), json, EXIT_CODES.GENERAL);
    process.exit(EXIT_CODES.GENERAL);
  }
}
