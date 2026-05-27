import { ethers } from "ethers";
import { loadWallet, getSigner, getWalletBalance } from "../lib/wallet.js";
import { CHAIN } from "../lib/config.js";
import { printSuccess, printError } from "../lib/output.js";
import { EXIT_CODES, YukaError, NoWalletError, NoGasError } from "../lib/errors.js";
import type { Network } from "@yuka/shared";

// ─── Uniswap V3 on Base mainnet ──────────────────────────────────────────────

const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // native USDC on Base

const SWAP_ROUTER_ADDR = "0x2626664c2603336E57B271c5C0b26F421741e481"; // Uniswap SwapRouter02
const QUOTER_ADDR      = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"; // QuoterV2

// 0.05% pool — deepest ETH/USDC pool on Base
const POOL_FEE = 500;

// Keep this much ETH in wallet to cover future gas
const GAS_RESERVE = ethers.parseEther("0.0005");

// Default slippage: 0.5%
const DEFAULT_SLIPPAGE_BPS = 50n;

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)",
];

// ─── Supported tokens ────────────────────────────────────────────────────────

const TOKEN_MAP: Record<string, string> = {
  eth:  "ETH",
  usdc: "USDC",
};

function normalise(t: string): string {
  return (TOKEN_MAP[t.toLowerCase()] ?? t.toUpperCase());
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function swap(opts: {
  from: string;
  to: string;
  amount?: string;
  all: boolean;
  quote: boolean;
  slippage?: string;
  testnet: boolean;
  json: boolean;
}): Promise<void> {
  const { all, quote: quoteOnly, testnet, json } = opts;
  const network: Network = testnet ? "testnet" : "mainnet";

  // Validate pair — only ETH→USDC for now
  const fromToken = normalise(opts.from ?? "ETH");
  const toToken   = normalise(opts.to   ?? "USDC");

  if (fromToken !== "ETH" || toToken !== "USDC") {
    printError("swap", `Only ETH→USDC is currently supported. Got: ${fromToken}→${toToken}`, "INVALID_INPUT", json);
    process.exit(EXIT_CODES.INVALID_INPUT);
  }

  if (testnet) {
    printError("swap", "yuka swap requires mainnet — Base Sepolia has no USDC/ETH liquidity. Run without --testnet.", "INVALID_INPUT", json);
    process.exit(EXIT_CODES.INVALID_INPUT);
  }

  const slippageBps = opts.slippage ? BigInt(Math.round(parseFloat(opts.slippage) * 100)) : DEFAULT_SLIPPAGE_BPS;

  try {
    const walletData = await loadWallet();
    if (!walletData) throw new NoWalletError();

    const balanceEth = await getWalletBalance(walletData.address, network);
    const balanceWei = ethers.parseEther(balanceEth);

    // Determine swap amount
    let amountIn: bigint;
    if (all) {
      if (balanceWei <= GAS_RESERVE) {
        throw new YukaError(
          `Balance too low to swap. You have ${balanceEth} ETH — need at least ${ethers.formatEther(GAS_RESERVE)} ETH reserved for gas.`,
          EXIT_CODES.INSUFFICIENT_FUNDS,
          "INSUFFICIENT_FUNDS",
        );
      }
      amountIn = balanceWei - GAS_RESERVE;
    } else if (opts.amount) {
      amountIn = ethers.parseEther(opts.amount);
      if (amountIn <= 0n) throw new YukaError("Amount must be greater than 0", EXIT_CODES.INVALID_INPUT, "INVALID_INPUT");
      if (amountIn > balanceWei) {
        throw new YukaError(
          `Insufficient balance. You have ${ethers.formatEther(balanceWei)} ETH, tried to swap ${opts.amount} ETH.`,
          EXIT_CODES.INSUFFICIENT_FUNDS,
          "INSUFFICIENT_FUNDS",
        );
      }
    } else {
      throw new YukaError("Specify --amount <eth> or --all to swap your full balance.", EXIT_CODES.INVALID_INPUT, "INVALID_INPUT");
    }

    const chain = CHAIN.mainnet;
    const provider = new ethers.JsonRpcProvider(chain.rpcUrl);

    // ─── Quote ────────────────────────────────────────────────────────────────
    if (!json) process.stdout.write(`\nGetting quote for ${ethers.formatEther(amountIn)} ETH → USDC...`);

    const quoter = new ethers.Contract(QUOTER_ADDR, QUOTER_ABI, provider);
    let quotedUSDC: bigint;
    try {
      const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn:            WETH,
        tokenOut:           USDC,
        amountIn,
        fee:                POOL_FEE,
        sqrtPriceLimitX96:  0n,
      }) as [bigint, bigint, number, bigint];
      quotedUSDC = result[0];
    } catch {
      throw new YukaError(
        "Could not get quote from Uniswap. The pool may have low liquidity or the RPC may be rate-limited. Try again.",
        EXIT_CODES.NETWORK,
        "NETWORK",
      );
    }

    const usdcFormatted = (Number(quotedUSDC) / 1e6).toFixed(2);
    const ethFormatted  = ethers.formatEther(amountIn);
    const price         = (Number(quotedUSDC) / 1e6 / parseFloat(ethFormatted)).toFixed(2);

    if (!json) console.log(" done");

    if (quoteOnly) {
      printSuccess("swap", {
        from:       `${ethFormatted} ETH`,
        to:         `~${usdcFormatted} USDC`,
        rate:       `1 ETH ≈ $${price}`,
        slippage:   `${(Number(slippageBps) / 100).toFixed(2)}%`,
        wallet:     walletData.address,
        status:     "quote only — run without --quote to execute",
      }, json, `Quote: ${ethFormatted} ETH → ~${usdcFormatted} USDC`);
      return;
    }

    // ─── Swap ─────────────────────────────────────────────────────────────────
    const amountOutMinimum = quotedUSDC * (10_000n - slippageBps) / 10_000n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min

    const signer = await getSigner(walletData.privateKey, network);
    const router = new ethers.Contract(SWAP_ROUTER_ADDR, ROUTER_ABI, signer);

    if (!json) {
      console.log(`\n  Swapping:   ${ethFormatted} ETH`);
      console.log(`  Expecting:  ~${usdcFormatted} USDC`);
      console.log(`  Min out:    ${(Number(amountOutMinimum) / 1e6).toFixed(2)} USDC (${(Number(slippageBps) / 100).toFixed(2)}% slippage)`);
      process.stdout.write("\nSubmitting swap...");
    }

    const tx = await router.exactInputSingle(
      {
        tokenIn:           WETH,
        tokenOut:          USDC,
        fee:               POOL_FEE,
        recipient:         walletData.address,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
      { value: amountIn },
    ) as { hash: string; wait: () => Promise<{ hash: string; logs: unknown[] } | null> };

    if (!json) console.log(` tx ${tx.hash}`);
    if (!json) process.stdout.write("Waiting for confirmation...");

    const receipt = await tx.wait();
    if (!receipt) throw new YukaError("Transaction dropped or replaced", EXIT_CODES.GENERIC, "GENERIC");
    if (!json) console.log(" confirmed");

    printSuccess("swap", {
      transactionHash: receipt.hash,
      sold:            `${ethFormatted} ETH`,
      received:        `~${usdcFormatted} USDC`,
      rate:            `1 ETH ≈ $${price}`,
      wallet:          walletData.address,
      explorer:        `${CHAIN.mainnet.explorer}/tx/${receipt.hash}`,
    }, json, `Swapped ${ethFormatted} ETH → ~${usdcFormatted} USDC`);

  } catch (error) {
    if (error instanceof YukaError) {
      printError("swap", error.message, error.code, json);
      process.exit(error.exitCode);
    }
    const msg = error instanceof Error ? error.message : String(error);
    printError("swap", msg, "GENERIC", json);
    process.exit(EXIT_CODES.GENERIC);
  }
}
