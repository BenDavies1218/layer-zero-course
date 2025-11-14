import { configureOAppPeers } from "../utils/configure-oapp-peers";

async function main() {
  // ========================================
  // UPDATE THESE WITH YOUR DEPLOYED ADDRESSES
  // ========================================
  const deployments = {
    "ethereum-sepolia": "0x0000000000000000000000000000000000000000",
    "arbitrum-sepolia": "0x0000000000000000000000000000000000000000",
    "optimism-sepolia": "0x0000000000000000000000000000000000000000",
    "base-sepolia": "0x0000000000000000000000000000000000000000",
    "polygon-amoy": "0x0000000000000000000000000000000000000000",
  };

  // Enter the contract name to configure
  const contractName = undefined; // "SimpleMessenger";

  if (!contractName) {
    throw new Error("Contract name not specified");
  }

  const filteredDeployments: { [network: string]: string } = {};
  for (const [network, address] of Object.entries(deployments)) {
    if (address && address !== "0x0000000000000000000000000000000000000000") {
      filteredDeployments[network] = address;
    }
  }

  if (Object.keys(filteredDeployments).length < 2) {
    throw new Error(
      "At least two deployed addresses are required for configuration"
    );
  }

  const result = await configureOAppPeers({
    contractName,
    deployments: filteredDeployments,
    skipConfirmed: true, // Skip already configured peers
  });

  console.log(`\n📋 Configuration Summary:`);
  console.log(`   Network: ${result.network}`);
  console.log(`   Successful: ${result.successCount}`);
  console.log(`   Skipped: ${result.skipCount}`);
  console.log(`   Failed: ${result.failureCount}\n`);

  if (result.successCount > 0) {
    console.log("✅ Configured peers:");
    result.peersConfigured.forEach((peer) => console.log(`   - ${peer}`));
  }

  if (result.peersFailed.length > 0) {
    console.log("\n⚠️  Failed peers:");
    result.peersFailed.forEach((peer) => console.log(`   - ${peer}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Configuration failed:");
    console.error(error);
    process.exit(1);
  });
