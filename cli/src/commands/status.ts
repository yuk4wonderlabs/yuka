import { ethers } from "ethers";
import { fetchTokensByOwner } from "../lib/flaunch-api.js";
import { loadWallet, loadLaunchRecords } from "../lib/wallet.js";
import { CHAIN } from "../lib/config.js";
import { printError } from "../lib/output.js";
import { EXIT_CODES, YukaError, NoWalletError } from "../lib/errors.js";
import type { Network } from "@yuka/shared";

function formatMarketCap(marketCapWei: string): string {
  try {
    const eth = parseFloat(ethers.formatEther(BigInt(marketCapWei)));
    if (eth >= 1_000) return `${(eth / 1_000).toFixed(1)}k ETH`;
    if (eth >= 1) return `${eth.toFixed(2)} ETH`;
    if (eth >= 0.001) return `${eth.toFixed(4)} ETH`;
    return `${eth.toExponential(2)} ETH`;
  } catch { return "—"; }
}

export async function status(opts: { testnet: boolean; json: boolean }): Promise<void> {
  const { testnet, json } = opts;
  const network: Network = testnet ? "testnet" : "mainnet";
  const chain = testnet ? CHAIN.testnet : CHAIN.mainnet;

  try {
    const walletData = await loadWallet();
    if (!walletData) throw new NoWalletError();

    // Testnet: Flaunch data API doesn't support Base Sepolia — use local records only
    // Mainnet: try API first, fall back to local records on error
    let useLocal = testnet;
    let apiTokens: Awaited<ReturnType<typeof fetchTokensByOwner>>["data"] = [];

    if (!testnet) {
      try {
        const response = await fetchTokensByOwner(walletData.address, network);
        apiTokens = response.data;
      } catch {
        useLocal = true;
      }
    }

    if (useLocal) {
      const records = (await loadLaunchRecords()).filter((r) => r.network === network);
      if (records.length === 0) {
        if (json) console.log(JSON.stringify({ success: true, tokens: [], wallet: walletData.address, source: "local" }));
        else console.log("\nNo tokens yet. Run `yuka launch` to create one.\n");
        return;
      }
      if (json) {
        console.log(JSON.stringify({
          success: true, count: records.length, network: chain.name,
          wallet: walletData.address, source: "local",
          tokens: records.map((r) => ({
            name: r.name, symbol: r.symbol, tokenAddress: r.tokenAddress,
            transactionHash: r.transactionHash, launchedAt: r.launchedAt,
            flaunchUrl: r.flaunchUrl,
          })),
        }, null, 2));
        return;
      }
      console.log(`\nYour tokens (${records.length}) — ${chain.name}\n`);
      for (const r of records) {
        console.log(`  ${r.name} (${r.symbol})`);
        console.log(`    Token:   ${r.tokenAddress}`);
        console.log(`    Trade:   ${r.flaunchUrl}`);
        console.log(`    Date:    ${new Date(r.launchedAt).toLocaleDateString()}\n`);
      }
      return;
    }

    const tokens = [...apiTokens].sort((a, b) => b.createdAt - a.createdAt);

    if (tokens.length === 0) {
      if (json) console.log(JSON.stringify({ success: true, tokens: [], wallet: walletData.address }));
      else console.log("\nNo tokens yet. Run `yuka launch` to create one.\n");
      return;
    }

    if (json) {
      console.log(JSON.stringify({
        success: true,
        count: tokens.length,
        network: chain.name,
        wallet: walletData.address,
        tokens: tokens.map((t) => ({
          name: t.name,
          symbol: t.symbol,
          tokenAddress: t.tokenAddress,
          marketCapETH: formatMarketCap(t.marketCapETH),
          createdAt: new Date(t.createdAt * 1000).toISOString(),
          fairLaunchActive: t.fairLaunchActive,
          flaunchUrl: `${chain.flaunchUrl}/coin/${t.tokenAddress}`,
        })),
      }, null, 2));
      return;
    }

    console.log(`\nYour tokens (${tokens.length}) — ${chain.name}\n`);
    for (const token of tokens) {
      const fairLaunch = token.fairLaunchActive ? " [FAIR LAUNCH]" : "";
      console.log(`  ${token.name} (${token.symbol})${fairLaunch}`);
      console.log(`    Token:   ${token.tokenAddress}`);
      console.log(`    Mcap:    ${formatMarketCap(token.marketCapETH)}`);
      console.log(`    Trade:   ${chain.flaunchUrl}/coin/${token.tokenAddress}`);
      console.log(`    Date:    ${new Date(token.createdAt * 1000).toLocaleDateString()}\n`);
    }
  } catch (error) {
    if (error instanceof YukaError) { printError(error.message, json, error.exitCode); process.exit(error.exitCode); }
    printError(error instanceof Error ? error.message : String(error), json, EXIT_CODES.GENERAL);
    process.exit(EXIT_CODES.GENERAL);
  }
}
