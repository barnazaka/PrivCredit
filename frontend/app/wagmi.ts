"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "PrivCredit — Confidential Private Credit Marketplace",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "privcredit_demo_id",
  chains: [arbitrumSepolia],
  ssr: true,
});

// Contract ABIs
export const PCT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "confidentialTransfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "confidentialApprove",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "encryptedAmount", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "encryptedBalanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bytes" }],
  },
  {
    name: "auditBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "Minted",
    type: "event",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ConfidentialTransfer",
    type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
    ],
  },
] as const;

export const POOL_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "encryptedAmount", type: "bytes" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "encryptedAmount", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "hasPosition",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getDepositorCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "poolName",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "creditType",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "Deposited",
    type: "event",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
] as const;

// Contract addresses (from deployment)
export const CONTRACT_ADDRESSES = {
  pct: (process.env.NEXT_PUBLIC_PCT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  pool: (process.env.NEXT_PUBLIC_POOL_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};
