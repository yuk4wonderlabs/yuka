# YUKA — Agent Token Launchpad

> Give your agent a wallet. Launch a token. Earn from every trade. Swap to USDC.

```bash
npx hi-yuka launch --name "MyAgent" --symbol "AGT" --description "what I do"
```

One command. Agent is live on Base.

---

## What It Does

YUKA is an open-source CLI that gives any AI agent:
- A local wallet (`~/.yuka/wallet.json`) — no signup, no custody
- An ERC-20 token on Base via Flaunch (Uniswap V4 pool)
- 80% of all trading fees, claimed directly to the wallet
- ETH → USDC swap via Uniswap — close the earn loop

No backend. No platform account. Wallet never leaves your machine.

---

## Quick Start

```bash
# Launch a token
npx hi-yuka launch --name "MyAgent" --symbol "AGT" --description "what I do"

# Check your wallet
npx hi-yuka wallet

# Check claimable fees
npx hi-yuka fees

# Claim fees to wallet
npx hi-yuka claim

# Preview ETH → USDC swap
npx hi-yuka swap --quote --all

# Execute swap
npx hi-yuka swap --all
```

First run creates a wallet at `~/.yuka/wallet.json` automatically.

---

## Commands

| Command | Description |
|---------|-------------|
| `yuka launch` | Deploy a token on Base via Flaunch |
| `yuka wallet` | Show address and ETH balance |
| `yuka fees` | Check claimable fee balance |
| `yuka claim` | Withdraw fees to wallet |
| `yuka swap` | Swap ETH → USDC via Uniswap on Base |
| `yuka status` | List all tokens you've launched |
| `yuka price <addr>` | Fetch token price and market info |
| `yuka fund` | Show wallet address + funding instructions |

All commands support `--json` for agent-readable output. `--testnet` flag uses Base Sepolia.

---

## Swap Flags

```bash
yuka swap --amount 0.01          # swap exact amount
yuka swap --all                  # swap full balance (keeps 0.0005 ETH for gas)
yuka swap --quote --amount 0.01  # preview rate, don't execute
yuka swap --slippage 1.0         # custom slippage % (default: 0.5)
```

---

## Fee Split

| Recipient | Share |
|-----------|-------|
| Token creator (you) | 80% |
| Flaunch protocol | 10% |
| BidWall (auto-buyback) | 10% |

---

## Agent Integration

YUKA ships with a `SKILL.md` — AI agents can load it to use YUKA autonomously.

```python
import subprocess, json

result = subprocess.run(
    ["npx", "hi-yuka", "fees", "--json"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
if float(data["data"]["claimable"].split()[0]) > 0.001:
    subprocess.run(["npx", "hi-yuka", "claim", "--json"])
    subprocess.run(["npx", "hi-yuka", "swap", "--all", "--json"])
```

---

## Networks

- **Base mainnet** (default) — real tokens, real fees
- **Base Sepolia testnet** — add `--testnet` flag, free faucet ETH
- `yuka swap` is mainnet only (Base Sepolia has no ETH/USDC pool)

---

## Stack

- TypeScript + Commander.js
- ethers.js v6
- Flaunch protocol (Uniswap V4 on Base)
- Uniswap V3 SwapRouter02 (ETH → USDC)
- Distributed via `npx hi-yuka`

---

## License

MIT — built in public by [ichwan.eth](https://x.com/yuk4wonder)
