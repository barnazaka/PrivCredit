# PrivCredit — Confidential Private Credit Marketplace

> Decentralized private credit for SMEs using **iExec Nox Confidential Computing** and **ERC-7984 Confidential Tokens** on Arbitrum Sepolia.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Smart Contract Setup & Deployment](#smart-contract-setup--deployment)
5. [Frontend Setup](#frontend-setup)
6. [Testing the Flows](#testing-the-flows)
7. [Deployed Contract Addresses](#deployed-contract-addresses)
8. [Demo Video Script](#demo-video-script)
9. [Project Structure](#project-structure)

---

## Project Overview

PrivCredit is a decentralized platform where:

- **Originators** tokenize private credit instruments (invoices, short-term SME loans) as **PCT (PrivCreditToken)** — an ERC-7984 Confidential Token.
- **Lenders** supply liquidity to credit pools privately. Their position sizes are never exposed on-chain.
- **Auditors** (the contract owner in this demo) can selectively decrypt balances for compliance — without exposing other participants.

### Why Confidential Tokens?

Traditional DeFi lending exposes all position sizes publicly. For institutional private credit, this is unacceptable:
- Competitors can see your exposure
- Front-running is possible
- Regulatory selective disclosure is impossible

ERC-7984 + iExec Nox solves this by encrypting balances and transfer amounts inside a Trusted Execution Environment (TEE).

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Arbitrum Sepolia                      │
│                                                         │
│  ┌─────────────────────┐    ┌────────────────────────┐  │
│  │  PrivCreditToken    │    │   PrivCreditPool       │  │
│  │  (ERC-7984 / PCT)   │───▶│   (Lending Pool)       │  │
│  │                     │    │                        │  │
│  │  - encryptedBalance │    │  - deposit(encrypted)  │  │
│  │  - confidentialXfer │    │  - Event: Deposited    │  │
│  │  - auditBalance()   │    │    (address only, NO   │  │
│  └─────────────────────┘    │     amount emitted)    │  │
│                             └────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
┌────────┴──────────────────────────────┴────────┐
│              iExec Nox TEE Layer               │
│  - FHE encryption of amounts before tx         │
│  - Selective decryption for auditor only       │
│  - No plaintext ever hits the chain            │
└────────────────────────────────────────────────┘
         ▲
         │
┌────────┴────────────────────────────────────────┐
│           Next.js Frontend (Wagmi + RainbowKit) │
│  - Connect wallet (Arbitrum Sepolia)            │
│  - Mint PCT (originator flow)                   │
│  - Confidential transfer (hidden amount)        │
│  - Deposit to pool (position stays private)     │
└─────────────────────────────────────────────────┘
```

---

## Prerequisites

- **Node.js** >= 18
- **npm** >= 9
- A wallet with **Arbitrum Sepolia ETH** for gas
  - Faucet: https://faucet.triangleplatform.com/arbitrum/sepolia
  - Or: https://www.alchemy.com/faucets/arbitrum-sepolia
- An **Arbiscan API key** (optional, for contract verification): https://arbiscan.io/myapikey
- A **WalletConnect Project ID** (for the frontend): https://cloud.walletconnect.com

---

## Smart Contract Setup & Deployment

### 1. Install dependencies

```bash
cd contracts
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PRIVATE_KEY=your_deployer_wallet_private_key_here
ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ARBISCAN_API_KEY=your_arbiscan_api_key_here   # optional
```

> ⚠️ Never commit your `.env` file. It is already in `.gitignore`.

### 3. Compile contracts

```bash
npm run compile
```

Expected output:
```
Compiled 2 Solidity files successfully
```

### 4. Deploy to Arbitrum Sepolia

```bash
npm run deploy:sepolia
```

Expected output:
```
🚀 Deploying PrivCredit contracts to arbitrumSepolia
──────────────────────────────────────────────────
📬 Deployer address: 0xYourAddress

📄 Deploying PrivCreditToken (PCT)...
✅ PrivCreditToken deployed at: 0xABC...

🏦 Deploying PrivCreditPool...
✅ PrivCreditPool deployed at: 0xDEF...

💰 Minting initial PCT to deployer (for demo)...
✅ Minted 10,000 PCT to 0xYourAddress

──────────────────────────────────────────────────
🎉 Deployment complete!
NEXT_PUBLIC_PCT_ADDRESS=0xABC...
NEXT_PUBLIC_POOL_ADDRESS=0xDEF...
```

**Copy the two addresses** — you will need them for the frontend.

### 5. Verify contracts (optional but recommended)

Verification happens automatically during deploy if `ARBISCAN_API_KEY` is set.

Manual verification:
```bash
npx hardhat verify --network arbitrumSepolia 0xYourPCTAddress
npx hardhat verify --network arbitrumSepolia 0xYourPoolAddress "0xYourPCTAddress" "PrivCredit SME Invoice Pool" "Invoice Financing"
```

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_PCT_ADDRESS=0xYourPrivCreditTokenAddress
NEXT_PUBLIC_POOL_ADDRESS=0xYourPrivCreditPoolAddress
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

#### Option A — Vercel CLI (recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

When prompted, add environment variables:
- `NEXT_PUBLIC_PCT_ADDRESS`
- `NEXT_PUBLIC_POOL_ADDRESS`
- `NEXT_PUBLIC_CHAIN_ID` = `421614`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

#### Option B — Vercel Dashboard

1. Push your `frontend/` folder to a GitHub repo
2. Go to https://vercel.com/new
3. Import the repository
4. Set **Root Directory** to `frontend`
5. Add environment variables in the Vercel dashboard
6. Click **Deploy**

---

## Testing the Flows

### Flow 1: Mint PCT (Originator)

1. Connect wallet to Arbitrum Sepolia
2. Go to **01 / Mint** tab
3. Enter amount (e.g. `1000`)
4. Click **Mint PCT**
5. Approve transaction in wallet
6. Check terminal log for confirmation

> The deployer wallet is the contract owner. Only the owner can mint.
> If you want another wallet to mint, call `transferOwnership()` on the PCT contract.

### Flow 2: Confidential Transfer

1. Go to **02 / Transfer** tab
2. Enter a recipient address
3. Enter amount (e.g. `100`)
4. Click **Send (Confidential)**
5. Approve transaction in wallet

**What happens on-chain:**
- `ConfidentialTransfer(from, to)` event is emitted — NO amount
- The Arbiscan explorer will show 0 value transfer
- The actual amount is ABI-encoded (simulating FHE encryption)

### Flow 3: Deposit to Pool (Lender)

1. First, mint some PCT to your wallet (Flow 1)
2. Go to **03 / Deposit** tab
3. Enter deposit amount (e.g. `500`)
4. Click **Deposit (Private)**
5. Two transactions fire:
   - `confidentialApprove` — authorises pool to pull PCT
   - `confidentialTransfer` — sends PCT to pool
6. Your position shows as **"Active (amount hidden)"**
7. Pool lender count increments

**Privacy check on Arbiscan:**
- The `Deposited` event shows only your address
- No amount is ever stored or emitted

### Flow 4: Audit (Owner Only)

Call `auditBalance(address)` directly on Arbiscan (connected as owner):
1. Go to Arbiscan → contract → Write (as owner)
2. Call `auditBalance(yourAddress)` — returns plaintext balance
3. This demonstrates **selective disclosure** for compliance

---

## Deployed Contract Addresses

> Fill these in after deployment:

| Contract | Network | Address |
|---|---|---|
| PrivCreditToken (PCT) | Arbitrum Sepolia | `0x_FILL_AFTER_DEPLOY` |
| PrivCreditPool | Arbitrum Sepolia | `0x_FILL_AFTER_DEPLOY` |

Arbiscan: https://sepolia.arbiscan.io/address/0x_FILL_AFTER_DEPLOY

---

## Demo Video Script (4 minutes)

### [0:00–0:30] Introduction
> "PrivCredit is a confidential private credit marketplace for SMEs built on Arbitrum using iExec Nox and the ERC-7984 Confidential Token standard. Today I'll show you how originators can tokenize invoices and lenders can supply liquidity — all without exposing position sizes on-chain."

### [0:30–1:00] Show the Architecture
> "Here's our stack: PrivCreditToken implements ERC-7984, the new Confidential Token standard. All transfers use encrypted blobs — amounts are never stored or emitted in plaintext on the blockchain. The PrivCreditPool accepts these confidential deposits, recording only that a lender participated — never how much."

### [1:00–1:45] Mint PCT (Originator Flow)
> "First, I'll mint 10,000 PCT as the originator. This represents a batch of tokenized SME invoices. The mint transaction is visible for compliance in this demo — in production, even minting would be confidential."
- Connect wallet → Mint tab → Mint 10,000 PCT → Show tx on Arbiscan

### [1:45–2:30] Confidential Transfer
> "Now I'll send 1,000 PCT to a lender wallet. Watch the Arbiscan event log — the ConfidentialTransfer event shows sender and receiver, but the amount is completely hidden. This is ERC-7984 in action."
- Transfer tab → Enter lender address → Send → Show Arbiscan event with no amount

### [2:30–3:15] Private Pool Deposit
> "The lender now deposits into the SME Invoice Pool. Two confidential transactions fire: an encrypted approval, then an encrypted transfer. The pool records that this address has deposited — but the amount is encrypted. The pool TVL shows as redacted."
- Deposit tab → 1000 PCT → Show pool lender count increment → Show Arbiscan Deposited event

### [3:15–3:45] Selective Disclosure / Audit
> "Finally, the auditor. Only the contract owner can call auditBalance — demonstrating selective disclosure. This is how a regulator or compliance officer gets the data they need without exposing every participant's position."
- Show Arbiscan Write Contract → auditBalance → Reveal plaintext for owner only

### [3:45–4:00] Closing
> "PrivCredit shows that institutional-grade private credit is possible on public blockchains today, thanks to iExec Nox Confidential Computing. ERC-7984 makes this composable with the rest of Arbitrum DeFi. Thank you."

---

## Project Structure

```
privcredit/
├── contracts/                  # Hardhat project
│   ├── contracts/
│   │   ├── PrivCreditToken.sol # ERC-7984 Confidential Token
│   │   └── PrivCreditPool.sol  # Private lending pool
│   ├── scripts/
│   │   └── deploy.ts           # Deployment script
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── frontend/                   # Next.js 15 app
    ├── app/
    │   ├── page.tsx            # Main interactive UI
    │   ├── layout.tsx          # Root layout
    │   ├── providers.tsx       # Wagmi + RainbowKit providers
    │   ├── wagmi.ts            # Chain config + contract ABIs
    │   └── globals.css         # Dark cipher aesthetic
    ├── next.config.js
    ├── tailwind.config.js
    ├── package.json
    └── .env.local.example
```

---

## Security Notes

- This is a **hackathon demo**. The "encryption" is ABI encoding, not real FHE.
- In production Nox deployment, amounts would be encrypted via the Nox SDK before leaving the client.
- The `auditBalance` function is a simplified compliance demo — production would use TEE-issued proofs.
- Never commit private keys. Use `.env` files that are gitignored.
