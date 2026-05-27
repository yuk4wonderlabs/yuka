---
name: yuka-launchpad
description: Launch ERC-20 tokens on Base via Flaunch, earn trading fees automatically, and swap ETH → USDC via Uniswap. Use when the agent wants to create a token, check claimable fees, claim ETH earnings, or convert ETH to USDC. Closes the full earn loop — launch, earn, claim, swap.
metadata:
  {
    "clawdbot":
      {
        "emoji": "🪙",
        "homepage": "https://yuka.lol",
        "requires": { "bins": ["yuka"] },
      },
  }
---

# YUKA — Agent Launchpad Skill

YUKA is a CLI for AI agents to launch ERC-20 tokens on Flaunch (Base), earn trading fees automatically, and swap ETH → USDC via Uniswap.

## Install

```
npm install -g hi-yuka
```

Or run directly: `npx hi-yuka <command>`

## Commands

### wallet
Show the agent wallet address and ETH balance.

```
yuka wallet [--json]
```

**Output**: address, balance (ETH), network

---

### fund
Show how to fund the wallet with ETH on Base.

```
yuka fund [--json]
```

**Output**: address, current balance, funding methods (Bridge / Coinbase / direct transfer)

---

### launch
Launch a new ERC-20 token on Flaunch. Requires ETH in wallet for gas.

```
yuka launch --name <name> --symbol <TICKER> [--description <text>] [--image <path>] [--testnet] [--json]
```

**Parameters**:
- `--name` (required): Full token name, e.g. "Degen Cat"
- `--symbol` (required): Ticker symbol, e.g. "DCAT" (max 8 chars recommended)
- `--description` (optional): Short description of the token
- `--image` (optional): Path to PNG/JPG image file (max 5 MB). Auto-generated if omitted.
- `--testnet`: Deploy to Base Sepolia instead of Base mainnet
- `--json`: Machine-readable JSON output

**Output**: tokenAddress, transactionHash, flaunchUrl, name, symbol, network

**Notes**: Launch costs a small ETH fee (~0.0001 ETH gas). The wallet must have ETH before calling this.

---

### status
List all tokens launched by this wallet.

```
yuka status [--testnet] [--json]
```

**Output**: Array of tokens with name, symbol, tokenAddress, marketCapETH, createdAt, fairLaunchActive, flaunchUrl

---

### price
Get live market data for any Flaunch token.

```
yuka price <tokenAddress> [--amount <eth>] [--testnet] [--json]
```

**Parameters**:
- `<tokenAddress>`: The token contract address (0x...)
- `--amount`: ETH amount — shows what percentage of market cap it represents
- `--testnet`: Query testnet data

**Output**: name, symbol, marketCapETH, priceChange24h, volume24hETH, holders, flaunchUrl

---

### fees
Check how much ETH is claimable from trading fees.

```
yuka fees [--testnet] [--json]
```

**Output**: claimable (ETH), afterProtocolFee (ETH), protocolFee (%), walletBalance, canClaim (bool)

---

### claim
Claim all accumulated trading fees to the wallet.

```
yuka claim [--testnet] [--json]
```

**Output**: transactionHash, claimed amount (ETH after protocol fee), wallet, network

**Notes**: Requires ETH for gas. Check `yuka fees` first.

---

### swap
Swap ETH → USDC via Uniswap V3 on Base. Completes the earn loop: claim fees as ETH, convert to USDC.

```
yuka swap [--amount <eth>] [--all] [--quote] [--slippage <pct>] [--json]
```

**Parameters**:
- `--amount <eth>`: ETH amount to swap, e.g. `0.01`
- `--all`: Swap entire wallet balance (keeps 0.0005 ETH reserved for gas)
- `--quote`: Preview the rate without executing — safe to call any time
- `--slippage <pct>`: Max slippage in percent (default: 0.5)
- `--json`: Machine-readable output

**Output**: sold (ETH), received (USDC), rate (ETH price), transactionHash, explorer link

**Notes**:
- Mainnet only — Base Sepolia has no ETH/USDC liquidity
- Uses the 0.05% ETH/USDC Uniswap pool (deepest on Base)
- Always run `--quote` first to see the rate before committing

---

## Typical Agent Workflow

1. `yuka wallet` — get address
2. `yuka fund` — fund wallet with Base ETH
3. `yuka launch --name "..." --symbol "..."` — deploy token
4. `yuka status` — verify token is live
5. `yuka fees` — check earned fees periodically
6. `yuka claim` — claim fees when balance is meaningful
7. `yuka swap --quote --all` — preview ETH → USDC rate
8. `yuka swap --all` — convert earned ETH to USDC

## JSON Mode

All commands support `--json` for structured output. Successful responses include `"success": true`. Errors include `"success": false` and `"error"` message.

```bash
yuka wallet --json
# {"success":true,"address":"0x...","balance":"0.05","network":"Base"}
```

## Networks

- **Mainnet** (default): Base (chainId 8453)
- **Testnet**: Base Sepolia (chainId 84532) — add `--testnet` flag

## Exit Codes

- `0`: Success
- `1`: General error
- `2`: No wallet found (run any command to create one automatically)
- `3`: Insufficient gas (fund the wallet first)
