import { ethers } from "hardhat";
import { EndpointId } from "@layerzerolabs/lz-definitions";

/**
 * Configure trusted peers for cross-chain messaging
 *
 * IMPORTANT: Update the `deployments` object below with your actual deployed addresses!
 *
 * Usage:
 *   1. Deploy SimpleMessenger to multiple networks
 *   2. Update the deployments object with actual addresses
 *   3. Run this script on each network:
 *      npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia
 *      npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia
 */

async function main() {
  // ========================================
  // UPDATE THESE WITH YOUR DEPLOYED ADDRESSES
  // ========================================
  const deployments: { [key: string]: string } = {
    "ethereum-sepolia": "0x0000000000000000000000000000000000000000", // Replace with your address
    "arbitrum-sepolia": "0x0000000000000000000000000000000000000000", // Replace with your address
    "optimism-sepolia": "0x0000000000000000000000000000000000000000", // Replace with your address
    "base-sepolia": "0x0000000000000000000000000000000000000000", // Replace with your address
    "polygon-amoy": "0x0000000000000000000000000000000000000000", // Replace with your address
  };

  // Endpoint IDs for each network
  const endpointIds: { [key: string]: number } = {
    "ethereum-sepolia": EndpointId.SEPOLIA_V2_TESTNET,
    "arbitrum-sepolia": EndpointId.ARBSEP_V2_TESTNET,
    "optimism-sepolia": EndpointId.OPTSEP_V2_TESTNET,
    "base-sepolia": EndpointId.BASESEP_V2_TESTNET,
    "polygon-amoy": EndpointId.AMOY_V2_TESTNET,
  };

  // Get current network
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;

  console.log("==========================================");
  console.log("  Peer Configuration");
  console.log("==========================================\n");
  console.log(`Current Network: ${networkName}\n`);

  // Get the deployed address for this network
  const localAddress = deployments[networkName];

  if (
    !localAddress ||
    localAddress === "0x0000000000000000000000000000000000000000"
  ) {
    console.error("❌ No deployment address configured for this network!");
    console.error(
      "   Update the deployments object in this script with your actual addresses."
    );
    process.exit(1);
  }

  console.log(`Local Contract: ${localAddress}\n`);

  // Get contract instance
  const messenger = await ethers.getContractAt("SimpleMessenger", localAddress);

  // Get owner for verification
  const [signer] = await ethers.getSigners();
  const owner = await messenger.owner();

  console.log(`Contract Owner: ${owner}`);
  console.log(`Your Address: ${signer.address}\n`);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("❌ You are not the owner of this contract!");
    console.error("   Only the owner can configure peers.");
    process.exit(1);
  }

  // Configure peers for all other networks
  console.log("Setting up peers...\n");

  let successCount = 0;
  let skipCount = 0;

  for (const [targetNetwork, targetAddress] of Object.entries(deployments)) {
    // Skip if it's the current network
    if (targetNetwork === networkName) {
      continue;
    }

    // Skip if address not configured
    if (
      !targetAddress ||
      targetAddress === "0x0000000000000000000000000000000000000000"
    ) {
      console.log(`⏭️  Skipping ${targetNetwork} (no address configured)`);
      skipCount++;
      continue;
    }

    const targetEid = endpointIds[targetNetwork];

    console.log(`Setting peer for ${targetNetwork}:`);
    console.log(`  Endpoint ID: ${targetEid}`);
    console.log(`  Peer Address: ${targetAddress}`);

    // Convert address to bytes32 (pad to 32 bytes)
    const peerBytes32 = ethers.utils.zeroPad(targetAddress, 32);

    try {
      // Check if peer is already set
      const currentPeer = await messenger.peers(targetEid);

      if (currentPeer === peerBytes32) {
        console.log(`  ✅ Already configured (skipping)\n`);
        skipCount++;
        continue;
      }

      // Set the peer
      const tx = await messenger.setPeer(targetEid, peerBytes32);
      console.log(`  Transaction: ${tx.hash}`);
      console.log(`  Waiting for confirmation...`);

      await tx.wait();

      console.log(`  ✅ Peer configured!\n`);
      successCount++;
    } catch (error: any) {
      console.error(`  ❌ Failed to set peer: ${error.message}\n`);
    }
  }

  console.log("==========================================");
  console.log("  Configuration Complete");
  console.log("==========================================\n");

  console.log(`Successfully configured: ${successCount}`);
  console.log(`Skipped: ${skipCount}\n`);

  if (successCount > 0) {
    console.log("✅ Your contract is now ready for cross-chain messaging!");
    console.log("\nNext Steps:");
    console.log(
      "  1. Run this script on other networks if you haven't already"
    );
    console.log(
      "  2. Test sending a message using Hardhat console or a script"
    );
    console.log("  3. Track messages on https://layerzeroscan.com\n");
  } else {
    console.log("⚠️  No new peers were configured.");
    console.log(
      "   Make sure you've updated the deployment addresses in this script.\n"
    );
  }

  // Display peer configuration summary
  console.log("Current Peer Configuration:");
  for (const [targetNetwork, targetEid] of Object.entries(endpointIds)) {
    if (targetNetwork === networkName) continue;

    try {
      const peer = await messenger.peers(targetEid);
      const isConfigured = peer !== ethers.constants.HashZero;
      const status = isConfigured ? "✅ Configured" : "❌ Not configured";
      console.log(`  ${targetNetwork}: ${status}`);
    } catch (error) {
      console.log(`  ${targetNetwork}: ⚠️  Unable to check`);
    }
  }

  console.log("\n==========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Configuration failed:");
    console.error(error);
    process.exit(1);
  });
