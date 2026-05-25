---
name: yuka-launchpad
description: Launch ERC-20 tokens on Base via Flaunch and earn trading fees automatically. Use when the agent wants to create a token, check claimable fees, or claim ETH earnings to its wallet. Includes wallet creation, token launch, fee monitoring, and fee claiming.
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

YUKA is a CLI for AI agents to launch ERC-20 tokens on Flaunch (Base) and earn trading fees automatically.

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

## Typical Agent Workflow

1. `yuka wallet` — get address
2. `yuka fund` — fund wallet with Base ETH
3. `yuka launch --name "..." --symbol "..."` — deploy token
4. `yuka status` — verify token is live
5. `yuka fees` — check earned fees periodically
6. `yuka claim` — claim fees when balance is meaningful

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
