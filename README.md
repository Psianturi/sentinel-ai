# Sentinel AI

AI-Powered Financial Guardian on Cronos zkEVM.

Sentinel AI is a hackathon project that aims to make Real World Assets (RWA) feel like modern digital banking: users can invest into tokenized “gold” and “bonds”, earn simulated yield, and pay merchants using programmatic payments.

## Overview

This repository targets the Cronos ecosystem and focuses on:

- AI agent experience (chat-driven intents)
- RWA-like tokens for demo (sGOLD and sBOND)
- Programmatic payments flow (x402 concept)
- “Invisible mode” UX (auto actions under a threshold)

## Repository layout

```
cronos-sentinel-ai/
  flutter_app/   Flutter mobile app
  backend/       Node.js/TypeScript API server (agent + payment orchestration)
  contracts/     Solidity contracts (sGOLD, sBOND, SentinelVault)
  README.md
```

## What is implemented so far

Smart contracts (in [contracts/src](contracts/src)):

- SentinelGold (sGOLD): ERC-20 with a simple faucet + yield simulation
- SentinelBond (sBOND): ERC-20 with a faucet + higher yield simulation
- SentinelVault: deposits, withdrawals, spending allowance, invisible mode toggles

Backend scaffolding (in [backend/src](backend/src)):

- Express API skeleton and routes for agent, wallet, and payments
- MCP service stub that simulates market data (placeholder for Crypto.com MCP)
- Payment service stub that simulates x402-style execution and QR parsing

Flutter:

- Fresh Flutter app created under [flutter_app](flutter_app)

## Quick start

Prerequisites:

- Node.js 20+ (note: contracts toolchain works best on Node 18/20 with Hardhat v2; see “Known issues”)
- Flutter 3+

### 1) Contracts

```bash
cd contracts
npm install
cp .env.example .env

npm run compile
```

Deploy (testnet):

```bash
npm run deploy:testnet
```

### 2) Backend

```bash
cd backend
npm install
cp .env.example .env

npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

### 3) Flutter

```bash
cd flutter_app
flutter pub get
flutter run
```

## Configuration

Contracts env (example):

```env
PRIVATE_KEY=...
CRONOS_ZKEVM_TESTNET_RPC=https://rpc-zkevm-t0.cronos.org
```

Backend env (example):

```env
PORT=3000
CRONOS_ZKEVM_TESTNET_RPC=https://rpc-zkevm-t0.cronos.org
AGENT_PRIVATE_KEY=...
SGOLD_CONTRACT_ADDRESS=0x...
SBOND_CONTRACT_ADDRESS=0x...
SENTINEL_VAULT_ADDRESS=0x...
GEMINI_API_KEY=...
```

## Known issues / current constraints

- The Crypto.com AI Agent SDK package name used in the plan was not found on the public npm registry during setup. The backend is structured to plug it in later once you have the correct install source.
- Hardhat v3 had compatibility issues in this environment. The contracts toolchain is currently on Hardhat v2 with `--legacy-peer-deps`.
- x402 facilitator integration is currently mocked/stubbed (interfaces and routes exist, but no real facilitator calls yet).

## Resources

- Cronos docs: https://docs.cronos.org/
- Cronos x402 facilitator: https://docs.cronos.org/cronos-x402-facilitator/introduction
- Crypto.com MCP server: https://mcp.crypto.com/docs
- Cronos faucet: https://faucet.cronos.org/

## License

MIT. See [LICENSE](LICENSE).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>🛡️ Sentinel AI - Your 24/7 Financial Guardian</b><br>
  <i>Built with ❤️ on Cronos zkEVM</i>
</p>
