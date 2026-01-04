const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Sentinel AI Contracts to Cronos zkEVM...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  console.log("");

  // Deploy sGOLD
  console.log("1️⃣  Deploying SentinelGold (sGOLD)...");
  const SentinelGold = await hre.ethers.getContractFactory("SentinelGold");
  const sGold = await SentinelGold.deploy();
  await sGold.waitForDeployment();
  const sGoldAddress = await sGold.getAddress();
  console.log("   ✅ sGOLD deployed to:", sGoldAddress);

  // Deploy sBOND
  console.log("\n2️⃣  Deploying SentinelBond (sBOND)...");
  const SentinelBond = await hre.ethers.getContractFactory("SentinelBond");
  const sBond = await SentinelBond.deploy();
  await sBond.waitForDeployment();
  const sBondAddress = await sBond.getAddress();
  console.log("   ✅ sBOND deployed to:", sBondAddress);

  // Deploy SentinelVault
  console.log("\n3️⃣  Deploying SentinelVault...");
  const SentinelVault = await hre.ethers.getContractFactory("SentinelVault");
  const vault = await SentinelVault.deploy(sGoldAddress, sBondAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("   ✅ SentinelVault deployed to:", vaultAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`   Network:        ${hre.network.name}`);
  console.log(`   sGOLD:          ${sGoldAddress}`);
  console.log(`   sBOND:          ${sBondAddress}`);
  console.log(`   SentinelVault:  ${vaultAddress}`);
  console.log("=".repeat(60));

  // Save addresses to file
  const fs = require("fs");
  const addresses = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    contracts: {
      sGold: sGoldAddress,
      sBond: sBondAddress,
      sentinelVault: vaultAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("\n💾 Addresses saved to deployments.json");

  // Verify contracts (if not local network)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Verifying contracts on explorer...");
    
    try {
      await hre.run("verify:verify", {
        address: sGoldAddress,
        constructorArguments: [],
      });
      console.log("   ✅ sGOLD verified");
    } catch (e) {
      console.log("   ⚠️  sGOLD verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: sBondAddress,
        constructorArguments: [],
      });
      console.log("   ✅ sBOND verified");
    } catch (e) {
      console.log("   ⚠️  sBOND verification failed:", e.message);
    }

    try {
      await hre.run("verify:verify", {
        address: vaultAddress,
        constructorArguments: [sGoldAddress, sBondAddress],
      });
      console.log("   ✅ SentinelVault verified");
    } catch (e) {
      console.log("   ⚠️  SentinelVault verification failed:", e.message);
    }
  }

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
