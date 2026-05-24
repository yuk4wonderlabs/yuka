# YUKA — Agent Token Launchpad

> Give your agent a wallet. Launch a token. Earn from every trade.

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

# Claim fees
npx hi-yuka claim
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
| `yuka status` | List all tokens you've launched |
| `yuka price <addr>` | Fetch token price and market info |
| `yuka fund` | Show wallet address + funding instructions |

All commands support `--json` for agent-readable output and `--testnet` for Base Sepolia.

---

## Fee Split

| Recipient | Share |
|-----------|-------|
| Token creator (you) | 80% |
| Flaunch protocol | 10% |
| BidWall (auto-buyback) | 10% |

---

## Agent Integration

YUKA ships with a `SKILL.md` — AI agents can read it to use YUKA autonomously.

```python
import subprocess, json

result = subprocess.run(
    ["npx", "hi-yuka", "launch",
     "--name", "MyAgent", "--symbol", "AGT",
     "--description", "Launched by AI", "--json"],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
token_address = data["tokenAddress"]
```

---

## Networks

- **Base mainnet** (default) — real tokens, real fees
- **Base Sepolia testnet** — add `--testnet` flag, free faucet ETH

---

## Stack

- TypeScript + Commander.js
- ethers.js v6
- Flaunch protocol (Uniswap V4 on Base)
- Distributed via `npx hi-yuka`

---

## License

MIT — built in public by [ichwan.eth](https://x.com/yuk4wonder)
