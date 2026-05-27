import { Command } from "commander";
import { launch } from "./commands/launch.js";
import { wallet } from "./commands/wallet.js";
import { fund } from "./commands/fund.js";
import { fees } from "./commands/fees.js";
import { claim } from "./commands/claim.js";
import { status } from "./commands/status.js";
import { price } from "./commands/price.js";
import { swap } from "./commands/swap.js";

const program = new Command();

program
  .name("yuka")
  .description("AI agent launchpad — launch tokens and earn fees on Flaunch")
  .version("0.1.0");

program
  .command("launch")
  .description("Launch a new token on Flaunch")
  .requiredOption("-n, --name <name>", "Token name")
  .requiredOption("-s, --symbol <symbol>", "Token symbol (ticker)")
  .option("-d, --description <text>", "Token description")
  .option("-i, --image <path>", "Path to image file (PNG/JPG, max 5MB)")
  .option("-w, --website <url>", "Website URL for the token")
  .option("--twitter <url>", "Twitter/X URL for the token")
  .option("--telegram <url>", "Telegram URL for the token")
  .option("--testnet", "Use Base Sepolia testnet", false)
  .option("--json", "Output as JSON", false)
  .action((opts) => launch(opts));

program
  .command("wallet")
  .description("Show your agent wallet address and balance")
  .option("--json", "Output as JSON", false)
  .action((opts) => wallet(opts));

program
  .command("fund")
  .description("Show how to fund your agent wallet with ETH")
  .option("--json", "Output as JSON", false)
  .action((opts) => fund(opts));

program
  .command("fees")
  .description("Check claimable trading fees")
  .option("--testnet", "Use Base Sepolia testnet", false)
  .option("--json", "Output as JSON", false)
  .action((opts) => fees(opts));

program
  .command("claim")
  .description("Claim accumulated trading fees")
  .option("--testnet", "Use Base Sepolia testnet", false)
  .option("--json", "Output as JSON", false)
  .action((opts) => claim(opts));

program
  .command("status")
  .description("List all tokens launched by your wallet")
  .option("--testnet", "Use Base Sepolia testnet", false)
  .option("--json", "Output as JSON", false)
  .action((opts) => status(opts));

program
  .command("price")
  .description("Get price and market data for a token")
  .argument("<token>", "Token contract address (0x...)")
  .option("-a, --amount <eth>", "ETH amount to estimate as % of market cap")
  .option("--testnet", "Use Base Sepolia testnet", false)
  .option("--json", "Output as JSON", false)
  .action((token, opts) => price({ token, ...opts }));

program
  .command("swap")
  .description("Swap ETH → USDC via Uniswap on Base")
  .option("--from <token>", "Token to sell (default: ETH)", "ETH")
  .option("--to <token>", "Token to buy (default: USDC)", "USDC")
  .option("--amount <eth>", "Amount of ETH to swap")
  .option("--all", "Swap entire wallet balance (keeps 0.0005 ETH for gas)", false)
  .option("--quote", "Show quote only — do not execute swap", false)
  .option("--slippage <pct>", "Max slippage percent (default: 0.5)", "0.5")
  .option("--json", "Output as JSON", false)
  .action((opts) => swap(opts));

program.parse();
