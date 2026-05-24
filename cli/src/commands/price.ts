import { ethers } from "ethers";
import { fetchTokenDetails, fetchTokenHolderCount } from "../lib/flaunch-api.js";
import { CHAIN } from "../lib/config.js";
import { printError } from "../lib/output.js";
import { EXIT_CODES, YukaError } from "../lib/errors.js";
import type { Network } from "@yuka/shared";

function parseWei(value: string): string {
  if (/^\d+$/.test(value)) return ethers.formatEther(BigInt(value));
  return value;
}

function formatEthDisplay(eth: number): string {
  if (eth >= 1_000) return `${(eth / 1_000).toFixed(1)}k ETH`;
  if (eth >= 1) return `${eth.toFixed(4)} ETH`;
  if (eth >= 0.001) return `${eth.toFixed(6)} ETH`;
  if (eth === 0) return "0 ETH";
  return `${eth.toExponential(2)} ETH`;
}

export async function price(opts: { token: string; amount?: string; testnet: boolean; json: boolean }): Promise<void> {
  const { token, json } = opts;
  const network: Network = opts.testnet ? "testnet" : "mainnet";
  const chain = CHAIN[network];

  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) throw new Error("Invalid token address");

    if (!json) console.log("\nFetching token details...\n");

    const [details, holders] = await Promise.all([
      fetchTokenDetails(token, network),
      fetchTokenHolderCount(token, network).catch(() => null),
    ]);

    const marketCapETH = parseWei(details.price.marketCapETH);
    const volume24hETH = parseWei(details.volume.volume24h);
    const flaunchUrl = `${chain.flaunchUrl}/coin/${token}`;

    if (json) {
      const output: Record<string, unknown> = {
        success: true,
        tokenAddress: details.tokenAddress,
        name: details.name,
        symbol: details.symbol,
        description: details.description,
        image: details.image,
        marketCapETH,
        priceChange24h: details.price.priceChange24h,
        volume24hETH,
        holders,
        creator: details.status.owner,
        createdAt: new Date(details.status.createdAt * 1000).toISOString(),
        flaunchUrl,
        network: chain.name,
      };
      if (opts.amount) {
        const spendETH = parseFloat(opts.amount);
        const mcapETH = parseFloat(marketCapETH);
        output.estimate = {
          spendETH: opts.amount,
          percentOfMcap: mcapETH > 0 ? ((spendETH / mcapETH) * 100).toFixed(2) : null,
          note: "Approximate — actual output depends on pool liquidity and slippage",
        };
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    const changeNum = parseFloat(details.price.priceChange24h);
    const changeStr = isNaN(changeNum) ? details.price.priceChange24h : `${changeNum >= 0 ? "+" : ""}${changeNum.toFixed(2)}%`;

    console.log(`  ${details.name} (${details.symbol})`);
    console.log(`  ${details.tokenAddress}\n`);
    if (details.description) console.log(`  ${details.description}\n`);
    console.log(`  Market cap:  ${formatEthDisplay(parseFloat(marketCapETH))}`);
    console.log(`  24h change:  ${changeStr}`);
    console.log(`  24h volume:  ${formatEthDisplay(parseFloat(volume24hETH))}`);
    console.log(`  Holders:     ${holders ?? "unknown"}`);
    console.log(`  Trade:       ${flaunchUrl}\n`);

    if (opts.amount) {
      const pct = parseFloat(marketCapETH) > 0 ? ((parseFloat(opts.amount) / parseFloat(marketCapETH)) * 100).toFixed(2) : "N/A";
      console.log(`  Estimate for ${opts.amount} ETH: ~${pct}% of market cap\n`);
    }
  } catch (error) {
    if (error instanceof YukaError) { printError(error.message, json, error.exitCode); process.exit(error.exitCode); }
    printError(error instanceof Error ? error.message : String(error), json, EXIT_CODES.GENERAL);
    process.exit(EXIT_CODES.GENERAL);
  }
}
