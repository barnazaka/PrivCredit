import hre from "hardhat";
import { parseUnits } from "viem";

/**
 * PrivCredit Deployment Script
 * Deploys PrivCreditToken (PCT) and PrivCreditPool to Arbitrum Sepolia
 *
 * Run with:
 *   npx hardhat run scripts/deploy.ts --network arbitrumSepolia
 */
async function main() {
  console.log("🚀 Deploying PrivCredit contracts to", hre.network.name);
  console.log("─".repeat(50));

  const [deployer] = await hre.viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  console.log("📬 Deployer address:", deployerAddress);

  // ── 1. Deploy PrivCreditToken ──────────────────
  console.log("\n📄 Deploying PrivCreditToken (PCT)...");
  const pct = await hre.viem.deployContract("PrivCreditToken", []);
  console.log("✅ PrivCreditToken deployed at:", pct.address);

  // ── 2. Deploy PrivCreditPool ───────────────────
  console.log("\n🏦 Deploying PrivCreditPool...");
  const pool = await hre.viem.deployContract("PrivCreditPool", [
    pct.address,
    "PrivCredit SME Invoice Pool",
    "Invoice Financing",
  ]);
  console.log("✅ PrivCreditPool deployed at:", pool.address);

  // ── 3. Mint initial PCT to deployer for demo ───
  console.log("\n💰 Minting initial PCT to deployer (for demo)...");
  const mintAmount = parseUnits("10000", 18); // 10,000 PCT
  await pct.write.mint([deployerAddress, mintAmount]);
  console.log("✅ Minted 10,000 PCT to", deployerAddress);

  // ── 4. Summary ─────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("🎉 Deployment complete!");
  console.log("─".repeat(50));
  console.log("PRIVCREDIT_TOKEN_ADDRESS=" + pct.address);
  console.log("PRIVCREDIT_POOL_ADDRESS=" + pool.address);
  console.log("─".repeat(50));
  console.log("\n📝 Copy the addresses above into your frontend .env.local file:");
  console.log("NEXT_PUBLIC_PCT_ADDRESS=" + pct.address);
  console.log("NEXT_PUBLIC_POOL_ADDRESS=" + pool.address);
  console.log("NEXT_PUBLIC_CHAIN_ID=421614");

  // ── 5. Verify on Arbiscan (if API key set) ─────
  if (process.env.ARBISCAN_API_KEY) {
    console.log("\n🔍 Verifying contracts on Arbiscan...");
    try {
      await hre.run("verify:verify", {
        address: pct.address,
        constructorArguments: [],
      });
      console.log("✅ PrivCreditToken verified");
    } catch (e) {
      console.log("⚠️  Token verification failed (may already be verified):", e);
    }

    try {
      await hre.run("verify:verify", {
        address: pool.address,
        constructorArguments: [
          pct.address,
          "PrivCredit SME Invoice Pool",
          "Invoice Financing",
        ],
      });
      console.log("✅ PrivCreditPool verified");
    } catch (e) {
      console.log("⚠️  Pool verification failed (may already be verified):", e);
    }
  } else {
    console.log("\n⚠️  No ARBISCAN_API_KEY set — skipping contract verification.");
    console.log("   Add it to .env to enable: ARBISCAN_API_KEY=your_key_here");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
