# YUKA Launchpad — Project TODO

> Last updated: 2026-05-27

---

## ✅ Done

### Monorepo
- [x] npm workspaces — `packages/shared`, `cli`, `web`
- [x] `@yuka/shared` — shared types + constants
- [x] `SKILL.md` — agent integration guide (all 7 commands)
- [x] `WHITEPAPER.md` — v0.6
- [x] `HANDOFF.md` — full design handoff

### CLI (`cli/`)
- [x] All 7 commands — `wallet`, `fund`, `launch`, `status`, `price`, `fees`, `claim`
- [x] `--testnet`, `--json`, `--website`, `--twitter`, `--telegram` flags
- [x] Auto logo generation — no image needed
- [x] Auto-POST to YUKA Registry after every launch (best-effort)
- [x] **Published hi-yuka@0.1.4** — social flags + registry auto-save
- [x] Bin aliases: both `yuka` and `hi-yuka` → `dist/index.js`

### Testnet (confirmed 2026-05-24)
- [x] Token launched: YKAT at `0xefcd606f362534a2b538027ac5c820a95b19e819` (Base Sepolia)

### GitHub + Deploy
- [x] Public CLI repo — `github.com/yuk4wonderlabs/yuka`
- [x] Web repo — `github.com/ichwandoteth/yukalaunch-web` → deployed at `yuka.lol`
- [x] `NEXT_PUBLIC_WC_PROJECT_ID` set in Vercel

### Web — All pages ✅
- [x] `/` landing, `/agents`, `/skills`, `/docs`, `/activity`, `/dashboard`, `/t/[address]`, `/a/[address]`, `/launch`
- [x] Mobile responsive, OG metadata, tabular-nums, gold design system
- [x] Next.js 16.2.6 Turbopack
- [x] All pages use YUKA Registry + DexScreener (Flaunch data API removed)
- [x] `loading.tsx` on all major pages → YUKA spinner on navigation

### Web — YUKA Registry ✅
- [x] Upstash Redis on Vercel — `token:{addr}`, `tokens:{wallet}`, `tokens:all`
- [x] `getAllTokens()` — powers homepage, agents page, activity feed
- [x] All 5 data routes use registry: `/api/tokens`, `/api/activity`, `/api/token/[address]`, `/api/agent/[address]`, `/agents`
- [x] Dashboard subnav tabs functional (overview, tokens, fees, activity, settings)
- [x] Trade URL fixed: `flaunch.gg/base/coin/` prefix

### $YUKA Token ✅ (2026-05-27)
- [x] Launched on Base via `npx hi-yuka launch`
- [x] Address: `0xf48a7bacc7139bff7d2054a7f9e9dc3b50ab5084`
- [x] Fee recipient: `0xd5109604943E14d654669Dc8e9F30c0cCD3B826c`
- [x] Flaunch page: https://flaunch.gg/base/coin/0xf48a7bacc7139bff7d2054a7f9e9dc3b50ab5084
- [x] Seeded into YUKA Registry

### yuka-x-bot ✅ live (2026-05-27)
- [x] Gemini 2.5 Flash + tweepy, casual personality
- [x] Posts 2×/day at 09:00 + 18:00 UTC via GitHub Actions
- [x] Stats fetcher uses YUKA Registry (not dead Flaunch API)
- [x] Reply mode guarded — free tier X API doesn't support reading mentions
- [x] Repo: `github.com/yuk4wonderlabs/yuka-x-bot`

### Distribution ✅ (2026-05-27)
- [x] Bankr skills registry PR submitted — [BankrBot/skills#415](https://github.com/BankrBot/skills/pull/415)
- [x] @yuk4wonder bio updated with CA
- [x] @yuk4wonder profile picture set

---

## 🔥 Priority 1 — Watch & wait

> Everything is shipped. These happen automatically:

- [ ] **DexScreener indexes $YUKA** — triggers after first trade on Flaunch. Then token detail page shows live USD price/mcap/vol.
- [ ] **Bankr skills PR#415 merged** — then `yuka` skill is available to all Bankr agents.

---

## 🛠️ Medium priority

### Web
- [ ] Rate limiting on `/api/tokens` — Upstash Redis is exposed; add simple IP rate limit before traffic grows
- [ ] Token detail `/t/[address]` — fall back to localStorage data when registry has no entry
- [ ] Dashboard address-input explorer — view any wallet's tokens without connecting

### CLI
- [ ] `yuka watch` — stream live fee accrual
- [ ] `yuka swap` — buy/sell agent tokens

### yuka-x-bot
- [ ] Reply to mentions — needs X API Basic plan ($100/mo) to read mentions endpoint

---

## 🔗 Deferred / Future

### YukaRegistry contract (~50 lines Solidity)
- [ ] `register(address, name, website)` on-chain
- [ ] CLI calls `register()` after `launch`
- [ ] Unlocks YUKA-only token filtering on web

### Infrastructure
- [ ] Error monitoring (Sentry)
- [ ] GitHub vulns — wagmi v3 upgrade (breaking)

### 🤖 Phase 3 — YUKA Agent Bundle ⭐
- [ ] One-click binary with embedded LLM (Qwen/Gemma)
- [ ] `/download` page + CI builds for Mac/Windows/Linux

### ⛓️ Phase 4 — Solana (Raydium LaunchLab) ⭐
- [ ] `--chain solana` flag, Phantom/Backpack wallet support on web
