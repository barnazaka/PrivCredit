# PrivCredit — iExec Nox & ERC-7984 Feedback

> Submitted for the iExec Vibe Coding Hackathon 2026

---

## How We Used iExec Nox Confidential Tokens and ERC-7984

### The Core Integration

PrivCredit integrates ERC-7984 (Confidential Token Standard) as the foundation of the entire credit marketplace. Every value flow — minting, transfers, pool deposits — routes through the confidential token interface.

**What we implemented:**

1. **`encryptedBalanceOf(address)`** — Returns an encrypted blob instead of plaintext balance. On Nox, this would be an FHE ciphertext that only the TEE can decrypt. In our demo, we use ABI-encoded values wrapped in a "confidential marker" to simulate the interface.

2. **`confidentialTransfer(to, encryptedAmount)`** — The central primitive. The amount is never stored or emitted on-chain. The `ConfidentialTransfer` event only carries sender and receiver addresses — a direct implementation of the ERC-7984 privacy guarantee.

3. **`confidentialApprove` and `confidentialTransferFrom`** — Enables the pool contract to pull tokens from lenders without exposing the approved or transferred amounts.

4. **`auditBalance(address) onlyOwner`** — Demonstrates selective disclosure. A compliance officer (contract owner) can access plaintext balances via a privileged function — the building block for regulator reporting without public exposure.

**The pool's privacy guarantee:**

```solidity
// Event Deposited(address user) — no amount emitted
emit Deposited(msg.sender);
```

This single design decision — emitting only the address, never the amount — is what makes the lending pool "confidential." Combined with the ERC-7984 `confidentialTransferFrom`, the pool never sees or stores plaintext position sizes.

### The Nox TEE Layer (Simulated for Hackathon)

In a full Nox deployment, the flow would be:

1. Client calls Nox SDK → amount is FHE-encrypted inside the TEE
2. Encrypted ciphertext is submitted in the transaction calldata
3. The Nox-enabled contract verifies the encrypted proof without decrypting
4. Only the key holder (auditor TEE) can decrypt for compliance

For this hackathon, we simulate step 1 using `abi.encode(amount)` as the "ciphertext." The contract interface is identical to what a real Nox deployment would use — swapping in the real FHE SDK is a drop-in change.

---

## What Worked Well

### 1. The ERC-7984 Interface Is Clean and Composable

The `confidentialTransfer(address to, bytes encryptedAmount)` signature is elegant. It's a minimal change from ERC-20 but enables radically different privacy properties. The bytes parameter is flexible — it can carry an ABI-encoded uint, an FHE ciphertext, or a ZK proof depending on the backend.

### 2. Event Design Forces Privacy Discipline

ERC-7984's insistence that events not carry amounts is a great guardrail. Building PrivCreditPool, we had to consciously ask "what metadata is okay to emit?" — which led to a cleaner architecture. The `Deposited(address user)` event gives enough on-chain transparency for liveness proofs without exposing competitive position sizes.

### 3. Selective Disclosure Pattern Is Real-World Ready

The `auditBalance() onlyOwner` pattern maps directly to real compliance use cases. Institutional credit markets have clear regulatory requirements — knowing *who* can request *what* data, and having that enforced by smart contract access control, is production-grade thinking.

### 4. Arbitrum + Nox Is a Strong Stack for RWA

Arbitrum's low fees make frequent confidential transactions viable. Real-world asset (RWA) markets like invoice financing involve high-frequency, high-value transfers where gas costs matter. The Nox + Arbitrum combination hits the right tradeoffs.

---

## Challenges Faced

### 1. FHE SDK Availability During Hackathon

The full iExec Nox SDK for FHE encryption was not available as an npm package during our build. We simulated the encryption layer using ABI encoding, which mirrors the on-chain interface exactly but doesn't provide real cryptographic privacy until the SDK is integrated.

**Suggested fix from iExec:** Provide a `@iexec/nox-sdk` npm package with:
- `encryptAmount(value: bigint, publicKey: Uint8Array): Bytes`
- `decryptAmount(ciphertext: Bytes, privateKey: Uint8Array): bigint`

This would let teams build real privacy without needing TEE hardware during development.

### 2. ERC-7984 Base Contract Not Yet Published

There's no `@openzeppelin/contracts-erc7984` or equivalent package yet. We had to implement the interface from scratch based on the EIP spec. A published, audited base contract would significantly accelerate adoption.

**Suggestion:** Publish `ERC7984.sol` as a standalone package or as part of OpenZeppelin's extensions. At minimum, the interface definition should be an npm package.

### 3. Testing Confidential Behavior Is Non-Trivial

Standard Hardhat tests use `expect(balance).to.equal(amount)` — but confidential tokens return encrypted blobs. There's no clear testing pattern for:
- Verifying that an encrypted balance is "correct" without decrypting
- Asserting that no plaintext amount appears in logs

**Suggestion:** Provide a testing utility that can decode demo-mode ABI-encoded amounts and stub FHE verification for unit tests.

### 4. RainbowKit + Wagmi Needs a Nox Connector

Currently, triggering Nox encryption requires a separate SDK call before the `writeContract` call. A WalletConnect-style connector that wraps the Nox TEE flow would make frontend integration seamless — users would just confirm one transaction, and the encryption would be transparent.

---

## Suggestions for the Nox Ecosystem

1. **Publish `@iexec/nox-sdk`** with browser-compatible FHE encryption utilities
2. **Publish `ERC7984.sol`** as a base contract via npm (à la OpenZeppelin)
3. **Provide a local Nox emulator** for development (like Hardhat's local node but with TEE simulation)
4. **Add a Wagmi connector** for Nox wallet actions
5. **Document the selective disclosure pattern** more explicitly — it's the killer feature for institutional DeFi but requires careful smart contract architecture

---

## Real-World Impact

PrivCredit targets a **$1.7 trillion** global private credit market that is entirely opaque today. SMEs can't access institutional credit because lenders won't compete transparently. With confidential on-chain credit:

- Lenders can participate without revealing their book
- Originators can tokenize receivables without disclosing clients
- Regulators get selective access via TEE-based disclosure
- The market becomes liquid without sacrificing confidentiality

iExec Nox is the missing piece that makes this possible. We're excited to build on this stack.

---

*PrivCredit — iExec Vibe Coding Hackathon 2026*
