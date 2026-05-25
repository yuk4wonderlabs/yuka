import { ethers } from "ethers";
import { fetchTokensByOwner } from "../lib/flaunch-api.js";
import { loadWallet, loadLaunchRecords } from "../lib/wallet.js";
import { CHAIN } from "../lib/config.js";
import { printSuccess, printError } from "../lib/output.js";
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
        printSuccess("status", { tokens: [], wallet: walletData.address, source: "local", count: 0 }, json, "No tokens yet");
        if (!json) process.stdout.write("  Run `yuka launch` to create one.\n\n");
        return;
      }

      if (!json) {
        console.log(`\nYour tokens (${records.length}) — ${chain.name}\n`);
        for (const r of records) {
          console.log(`  ${r.name} (${r.symbol})`);
          console.log(`    Token:   ${r.tokenAddress}`);
          console.log(`    Trade:   ${r.flaunchUrl}`);
          console.log(`    Date:    ${new Date(r.launchedAt).toLocaleDateString()}\n`);
        }
        return;
      }

      printSuccess("status", {
        count: records.length,
        network: chain.name,
        wallet: walletData.address,
        source: "local",
        tokens: records.map((r) => ({
          name: r.name, symbol: r.symbol, tokenAddress: r.tokenAddress,
          transactionHash: r.transactionHash, launchedAt: r.launchedAt,
          flaunchUrl: r.flaunchUrl,
        })),
      }, json, `Your tokens (${records.length})`);
      return;
    }

    const tokens = [...apiTokens].sort((a, b) => b.createdAt - a.createdAt);

    if (tokens.length === 0) {
      printSuccess("status", { tokens: [], wallet: walletData.address, count: 0 }, json, "No tokens yet");
      if (!json) process.stdout.write("  Run `yuka launch` to create one.\n\n");
      return;
    }

    if (!json) {
      console.log(`\nYour tokens (${tokens.length}) — ${chain.name}\n`);
      for (const token of tokens) {
        const fairLaunch = token.fairLaunchActive ? " [FAIR LAUNCH]" : "";
        console.log(`  ${token.name} (${token.symbol})${fairLaunch}`);
        console.log(`    Token:   ${token.tokenAddress}`);
        console.log(`    Mcap:    ${formatMarketCap(token.marketCapETH)}`);
        console.log(`    Trade:   ${chain.flaunchUrl}/coin/${token.tokenAddress}`);
        console.log(`    Date:    ${new Date(token.createdAt * 1000).toLocaleDateString()}\n`);
      }
      return;
    }

    printSuccess("status", {
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
    }, json, `Your tokens (${tokens.length})`);
  } catch (error) {
    if (error instanceof YukaError) {
      printError("status", error.message, error.code, json);
      process.exit(error.exitCode);
    }
    printError("status", error instanceof Error ? error.message : String(error), "GENERIC", json);
    process.exit(EXIT_CODES.GENERIC);
  }
}
