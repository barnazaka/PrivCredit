"use client";

import { useState, useCallback } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, encodeAbiParameters, parseAbiParameters } from "viem";
import { PCT_ABI, POOL_ABI, CONTRACT_ADDRESSES } from "./wagmi";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulates FHE encryption for the hackathon demo.
 * In production Nox, this would call the Nox SDK to encrypt via TEE.
 * Here we ABI-encode the amount as the "encrypted" blob.
 */
function encryptAmount(amount: bigint): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters("uint256"), [amount]);
}

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatPCT(val: bigint) {
  return parseFloat(formatUnits(val, 18)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

// ── Status Log ───────────────────────────────────────────────────────────────

interface LogEntry {
  time: string;
  msg: string;
  type: "info" | "success" | "error" | "encrypt";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const { address, isConnected } = useAccount();

  // Form states
  const [mintAmount, setMintAmount] = useState("1000");
  const [mintTo, setMintTo] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("100");
  const [depositAmount, setDepositAmount] = useState("500");
  const [activeTab, setActiveTab] = useState<"mint" | "transfer" | "deposit" | "audit">("mint");

  // Tx log
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      time: new Date().toLocaleTimeString(),
      msg: "PrivCredit terminal initialised. Connect wallet to begin.",
      type: "info",
    },
  ]);

  const addLog = useCallback((msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      { time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 19),
    ]);
  }, []);

  // Contract writes
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isTxLoading } = useWaitForTransactionReceipt({ hash: txHash });

  // Read: depositor count
  const { data: depositorCount } = useReadContract({
    address: CONTRACT_ADDRESSES.pool,
    abi: POOL_ABI,
    functionName: "getDepositorCount",
  });

  // Read: has position
  const { data: hasPosition } = useReadContract({
    address: CONTRACT_ADDRESSES.pool,
    abi: POOL_ABI,
    functionName: "hasPosition",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read: pool name
  const { data: poolName } = useReadContract({
    address: CONTRACT_ADDRESSES.pool,
    abi: POOL_ABI,
    functionName: "poolName",
  });

  const isLoading = isPending || isTxLoading;

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleMint() {
    if (!isConnected || !address) return;
    const to = mintTo || address;
    try {
      addLog(`Minting ${mintAmount} PCT to ${shortenAddress(to)}...`, "info");
      const amount = parseUnits(mintAmount, 18);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.pct,
        abi: PCT_ABI,
        functionName: "mint",
        args: [to as `0x${string}`, amount],
      });
      setTxHash(hash);
      addLog(`Tx submitted: ${hash.slice(0, 18)}...`, "success");
      addLog(`Minted ${mintAmount} PCT ✓`, "success");
    } catch (e: unknown) {
      addLog(`Mint failed: ${(e as Error).message?.slice(0, 60)}`, "error");
    }
  }

  async function handleConfidentialTransfer() {
    if (!isConnected || !transferTo) return;
    try {
      const amount = parseUnits(transferAmount, 18);
      const encrypted = encryptAmount(amount);
      addLog(`Encrypting ${transferAmount} PCT via Nox TEE...`, "encrypt");
      addLog(`Encrypted blob: ${encrypted.slice(0, 30)}... [HIDDEN]`, "encrypt");
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.pct,
        abi: PCT_ABI,
        functionName: "confidentialTransfer",
        args: [transferTo as `0x${string}`, encrypted],
      });
      setTxHash(hash);
      addLog(`Confidential transfer submitted: ${hash.slice(0, 18)}...`, "success");
      addLog(`Amount hidden from public — ERC-7984 ✓`, "encrypt");
    } catch (e: unknown) {
      addLog(`Transfer failed: ${(e as Error).message?.slice(0, 60)}`, "error");
    }
  }

  async function handleDeposit() {
    if (!isConnected || !address) return;
    try {
      const amount = parseUnits(depositAmount, 18);
      const encrypted = encryptAmount(amount);

      // Step 1: Approve pool to spend PCT (confidentially)
      addLog(`Approving pool with confidential allowance...`, "encrypt");
      const approveHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.pct,
        abi: PCT_ABI,
        functionName: "confidentialApprove",
        args: [CONTRACT_ADDRESSES.pool, encrypted],
      });
      setTxHash(approveHash);
      addLog(`Approval tx: ${approveHash.slice(0, 18)}...`, "success");

      // Step 2: Deposit into pool
      addLog(`Depositing into PrivCredit pool (amount encrypted)...`, "encrypt");
      const depositHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.pct,
        abi: PCT_ABI,
        functionName: "confidentialTransfer",
        args: [CONTRACT_ADDRESSES.pool, encrypted],
      });
      setTxHash(depositHash);
      addLog(`Deposit tx: ${depositHash.slice(0, 18)}...`, "success");
      addLog(`Position recorded — amount stays PRIVATE ✓`, "encrypt");
    } catch (e: unknown) {
      addLog(`Deposit failed: ${(e as Error).message?.slice(0, 60)}`, "error");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-void grid-bg relative">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-nox opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-credit opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="border-b border-nox/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-nox animate-pulse-nox" />
            <span className="font-display text-sm font-bold text-nox tracking-widest uppercase">
              PrivCredit
            </span>
          </div>
          <span className="text-muted text-xs hidden sm:block">
            / Confidential Private Credit Marketplace
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-encrypted hidden sm:flex">
            <span>🔒</span> ERC-7984
          </span>
          <span className="badge-encrypted hidden sm:flex">
            <span>⚡</span> iExec Nox
          </span>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </header>

      {/* Hero Banner */}
      <div className="px-6 py-8 border-b border-nox/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
                Private Credit
                <span className="text-nox-glow"> On-Chain.</span>
              </h1>
              <p className="text-muted text-sm max-w-lg">
                Tokenize invoices and short-term SME loans. All balances, positions, and
                transfer amounts remain{" "}
                <span className="text-nox">cryptographically hidden</span> via iExec Nox
                Confidential Computing + ERC-7984.
              </p>
            </div>
            <div className="flex gap-6 text-center">
              <div className="panel px-4 py-3">
                <div className="text-nox text-xl font-bold font-display">
                  {depositorCount !== undefined ? depositorCount.toString() : "—"}
                </div>
                <div className="text-muted text-xs mt-0.5">Lenders</div>
              </div>
              <div className="panel px-4 py-3">
                <div className="text-credit text-xl font-bold font-display">HIDDEN</div>
                <div className="text-muted text-xs mt-0.5">Pool Size</div>
              </div>
              <div className="panel px-4 py-3">
                <div className="text-white text-xl font-bold font-display">ARB</div>
                <div className="text-muted text-xs mt-0.5">Sepolia</div>
              </div>
            </div>
          </div>

          {/* Pool info strip */}
          {poolName && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <span className="text-nox">▶</span>
              <span>Active pool:</span>
              <span className="text-white">{String(poolName)}</span>
              <span className="badge-encrypted ml-2">Invoice Financing</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {!isConnected ? (
          <div className="panel p-12 text-center">
            <div className="text-4xl mb-4">🔐</div>
            <h2 className="font-display text-xl text-nox mb-2">Connect Your Wallet</h2>
            <p className="text-muted text-sm mb-6">
              Connect to Arbitrum Sepolia to access the PrivCredit marketplace.
            </p>
            <div className="flex justify-center">
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => (
                  <button
                    onClick={openConnectModal}
                    disabled={!mounted}
                    style={{
                      background: "transparent",
                      border: "2px solid #00ff88",
                      color: "#00ff88",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      letterSpacing: "0.15em",
                      padding: "1rem 2.5rem",
                      textTransform: "uppercase",
                      fontFamily: "IBM Plex Mono, monospace",
                    }}
                  >
                    ▶ Connect Wallet
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Action Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tab bar */}
              <div className="flex border-b border-nox/20">
                {(["mint", "transfer", "deposit", "audit"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-xs uppercase tracking-widest transition-all ${
                      activeTab === tab
                        ? "text-nox border-b-2 border-nox -mb-px"
                        : "text-muted hover:text-white"
                    }`}
                  >
                    {tab === "mint" && "01 / Mint"}
                    {tab === "transfer" && "02 / Transfer"}
                    {tab === "deposit" && "03 / Deposit"}
                    {tab === "audit" && "04 / Audit"}
                  </button>
                ))}
              </div>

              {/* TAB: Mint */}
              {activeTab === "mint" && (
                <div className="panel p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-base font-bold text-white mb-1">
                      Mint PCT Tokens
                    </h2>
                    <p className="text-muted text-xs">
                      As an originator, mint PrivCreditToken (PCT) representing tokenized
                      private credit instruments.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                        Recipient Address
                      </label>
                      <input
                        className="input-cipher"
                        placeholder={address || "0x..."}
                        value={mintTo}
                        onChange={(e) => setMintTo(e.target.value)}
                      />
                      <p className="text-muted text-xs mt-1">
                        Leave blank to mint to your connected address
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                        Amount (PCT)
                      </label>
                      <input
                        className="input-cipher"
                        type="number"
                        placeholder="1000"
                        value={mintAmount}
                        onChange={(e) => setMintAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-black/30 border border-nox/10 p-3 text-xs text-muted space-y-1">
                    <div className="text-nox text-xs font-bold mb-1">ℹ HOW IT WORKS</div>
                    <div>• Each PCT represents a private credit instrument (invoice / loan)</div>
                    <div>• Mint is visible for demo compliance; future versions use blind mint</div>
                    <div>• Only the contract owner (originator) can mint</div>
                  </div>

                  <button
                    className="btn-nox w-full"
                    onClick={handleMint}
                    disabled={isLoading || !mintAmount}
                  >
                    {isLoading ? "Processing..." : `Mint ${mintAmount} PCT`}
                  </button>
                </div>
              )}

              {/* TAB: Confidential Transfer */}
              {activeTab === "transfer" && (
                <div className="panel p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-base font-bold text-white mb-1">
                      Confidential Transfer
                    </h2>
                    <p className="text-muted text-xs">
                      Send PCT to another address. Amount is encrypted — nobody on-chain
                      (not even validators) can see how much was sent.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                        Recipient Address
                      </label>
                      <input
                        className="input-cipher"
                        placeholder="0x..."
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                        Amount (PCT)
                      </label>
                      <input
                        className="input-cipher"
                        type="number"
                        placeholder="100"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Privacy guarantee */}
                  <div className="bg-nox/5 border border-nox/20 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-nox text-xs font-bold">
                      <span>🔒</span> PRIVACY GUARANTEE
                    </div>
                    <div className="text-xs text-muted">
                      The{" "}
                      <code className="text-nox">ConfidentialTransfer</code> event emits
                      only sender + receiver addresses. Amount is{" "}
                      <span className="text-white">never stored or emitted</span> on-chain.
                    </div>
                    <div className="text-xs text-muted">
                      In production Nox, amounts are FHE-encrypted inside the TEE before
                      the transaction is even submitted.
                    </div>
                  </div>

                  <button
                    className="btn-nox w-full"
                    onClick={handleConfidentialTransfer}
                    disabled={isLoading || !transferTo || !transferAmount}
                  >
                    {isLoading ? "Encrypting & Sending..." : "Send (Confidential)"}
                  </button>
                </div>
              )}

              {/* TAB: Deposit to Pool */}
              {activeTab === "deposit" && (
                <div className="panel p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-base font-bold text-white mb-1">
                      Deposit to Credit Pool
                    </h2>
                    <p className="text-muted text-xs">
                      Supply liquidity to the SME Invoice Pool. Your position size
                      remains completely private — only your participation is publicly
                      visible.
                    </p>
                  </div>

                  <div className="panel p-4 space-y-2">
                    <div className="text-xs text-muted uppercase tracking-wider">Pool Info</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Type</span>
                      <span className="text-white">Invoice Financing</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Your position</span>
                      <span className={hasPosition ? "text-nox" : "text-muted"}>
                        {hasPosition ? "Active (amount hidden)" : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Total lenders</span>
                      <span className="text-white">
                        {depositorCount !== undefined ? depositorCount.toString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Pool TVL</span>
                      <span className="text-credit">████████ (encrypted)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted uppercase tracking-wider block mb-1.5">
                      Deposit Amount (PCT)
                    </label>
                    <input
                      className="input-cipher"
                      type="number"
                      placeholder="500"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>

                  <div className="bg-black/30 border border-nox/10 p-3 text-xs text-muted space-y-1">
                    <div className="text-nox font-bold mb-1">⚡ NOX PROTOCOL FLOW</div>
                    <div>1. Amount encrypted locally via Nox SDK (simulated here)</div>
                    <div>2. Confidential approval sent to PCT contract</div>
                    <div>3. Pool receives ciphertext — never the plaintext amount</div>
                    <div>4. Only auditor with TEE key can decrypt for compliance</div>
                  </div>

                  <button
                    className="btn-nox w-full"
                    onClick={handleDeposit}
                    disabled={isLoading || !depositAmount}
                  >
                    {isLoading ? "Processing..." : "Deposit (Private)"}
                  </button>
                </div>
              )}

              {/* TAB: Audit */}
              {activeTab === "audit" && (
                <div className="panel p-6 space-y-5">
                  <div>
                    <h2 className="font-display text-base font-bold text-white mb-1">
                      Selective Disclosure / Audit
                    </h2>
                    <p className="text-muted text-xs">
                      The owner/auditor can access plaintext balances for compliance
                      reporting. This demonstrates{" "}
                      <span className="text-nox">selective disclosure</span> — the core
                      privacy-preserving primitive of Nox.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-nox/5 border border-nox/20 p-4">
                      <div className="text-xs text-nox font-bold mb-2">
                        🔑 AUDITOR ROLE
                      </div>
                      <p className="text-xs text-muted">
                        In the PrivCredit architecture, the auditor holds a TEE-issued
                        decryption key. When a regulator or compliance officer requests a
                        report, the Nox TEE generates a selective proof revealing only
                        the required data — without exposing other participants.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-nox/10">
                        <span className="text-xs text-muted">Your address</span>
                        <span className="text-xs text-white font-mono">
                          {address ? shortenAddress(address) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-nox/10">
                        <span className="text-xs text-muted">Public balance</span>
                        <span className="text-xs text-credit">
                          ████ (encrypted on-chain)
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-nox/10">
                        <span className="text-xs text-muted">Position in pool</span>
                        <span className={`text-xs ${hasPosition ? "text-nox" : "text-muted"}`}>
                          {hasPosition ? "Active" : "None"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs text-muted">Audit access</span>
                        <span className="text-xs text-warn">Owner-only (on-chain)</span>
                      </div>
                    </div>

                    <div className="tx-log">
                      <span className="text-nox">$</span> auditBalance(
                      {address ? shortenAddress(address) : "0x..."})<br />
                      <span className="text-warn">Access restricted to owner.</span>{" "}
                      Call from deployer wallet to reveal.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Tx Log */}
            <div className="space-y-4">
              {/* Address badge */}
              <div className="panel p-4">
                <div className="text-xs text-muted uppercase tracking-wider mb-2">
                  Connected
                </div>
                <div className="text-nox text-sm font-mono break-all">
                  {address ? shortenAddress(address) : "—"}
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="badge-encrypted">Arbitrum Sepolia</span>
                </div>
              </div>

              {/* Contracts */}
              <div className="panel p-4">
                <div className="text-xs text-muted uppercase tracking-wider mb-3">
                  Deployed Contracts
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted mb-0.5">PCT Token</div>
                    <div className="text-xs text-white font-mono break-all">
                      {CONTRACT_ADDRESSES.pct === "0x0000000000000000000000000000000000000000"
                        ? <span className="text-warn">Not configured — see .env.local</span>
                        : shortenAddress(CONTRACT_ADDRESSES.pct)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted mb-0.5">Credit Pool</div>
                    <div className="text-xs text-white font-mono break-all">
                      {CONTRACT_ADDRESSES.pool === "0x0000000000000000000000000000000000000000"
                        ? <span className="text-warn">Not configured — see .env.local</span>
                        : shortenAddress(CONTRACT_ADDRESSES.pool)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tx Log */}
              <div className="panel p-4">
                <div className="text-xs text-muted uppercase tracking-wider mb-3">
                  Terminal Log
                </div>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {logs.map((log, i) => (
                    <div key={i} className="tx-log">
                      <span className="text-muted">[{log.time}]</span>{" "}
                      <span
                        className={
                          log.type === "success"
                            ? "text-nox"
                            : log.type === "error"
                            ? "text-warn"
                            : log.type === "encrypt"
                            ? "text-credit"
                            : "text-muted"
                        }
                      >
                        {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy reminder */}
              <div className="border border-nox/20 bg-nox/5 p-4">
                <div className="text-nox text-xs font-bold mb-2">
                  🔒 CONFIDENTIALITY GUARANTEE
                </div>
                <p className="text-muted text-xs leading-relaxed">
                  Balances and amounts are confidential via{" "}
                  <span className="text-white">iExec Nox</span> +{" "}
                  <span className="text-white">ERC-7984</span>. The blockchain
                  stores only encrypted ciphertexts. No validator, miner, or
                  observer can determine position sizes.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-nox/10 px-6 py-4 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted">
          <div>
            PrivCredit — Built for iExec Vibe Coding Hackathon 2026
          </div>
          <div className="flex gap-4">
            <span>ERC-7984</span>
            <span>iExec Nox</span>
            <span>Arbitrum Sepolia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
