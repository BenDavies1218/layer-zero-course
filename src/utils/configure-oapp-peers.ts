// @ts-ignore - ethers is injected by Hardhat at runtime
import { ethers } from "hardhat";
import { EndpointId } from "@layerzerolabs/lz-definitions";

/**
 * Network deployment information
 */
export interface NetworkDeployment {
  address: string;
  endpointId: number;
}

/**
 * Peer configuration options
 */
export interface ConfigurePeersOptions {
  contractName: string;
  deployments: Record<string, string>;
  currentNetwork?: string;
  skipConfirmed?: boolean;
}

/**
 * Endpoint ID mapping for supported networks
 */
export const ENDPOINT_IDS: Record<string, number> = {
  "ethereum-sepolia": EndpointId.SEPOLIA_V2_TESTNET,
  "arbitrum-sepolia": EndpointId.ARBSEP_V2_TESTNET,
  "optimism-sepolia": EndpointId.OPTSEP_V2_TESTNET,
  "base-sepolia": EndpointId.BASESEP_V2_TESTNET,
  "polygon-amoy": EndpointId.AMOY_V2_TESTNET,
};

/**
 * Configuration result
 */
export interface ConfigurationResult {
  network: string;
  successCount: number;
  skipCount: number;
  failureCount: number;
  peersConfigured: string[];
  peersSkipped: string[];
  peersFailed: string[];
}

/**
 * Generic OApp peer configuration utility
 *
 * @example
 * ```typescript
 * import { configureOAppPeers } from "./src/utils/configure-oapp-peers";
 *
 * await configureOAppPeers({
 *   contractName: "SimpleMessenger",
 *   deployments: {
 *     "ethereum-sepolia": "0x...",
 *     "arbitrum-sepolia": "0x...",
 *   },
 * });
 * ```
 */
export async function configureOAppPeers(
  options: ConfigurePeersOptions
): Promise<ConfigurationResult> {
  const {
    contractName,
    deployments,
    currentNetwork: providedNetwork,
    skipConfirmed = true,
  } = options;

  console.log("==========================================");
  console.log("  OApp Peer Configuration");
  console.log("==========================================\n");

  // Get current network
  const network = await ethers.provider.getNetwork();
  const networkName = providedNetwork || network.name;

  console.log(`Current Network: ${networkName}\n`);

  // Get local deployment address
  const localAddress = deployments[networkName];

  if (!localAddress || localAddress === ethers.constants.AddressZero) {
    throw new Error(
      `No deployment address configured for ${networkName}. Update your deployments configuration.`
    );
  }

  console.log(`Local Contract: ${localAddress}`);
  console.log(`Contract Type: ${contractName}\n`);

  // Get contract instance
  const contract = await ethers.getContractAt(contractName, localAddress);

  // Verify ownership
  const [signer] = await ethers.getSigners();
  const owner = await contract.owner();

  console.log(`Contract Owner: ${owner}`);
  console.log(`Your Address: ${signer.address}\n`);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(
      "You are not the owner of this contract. Only the owner can configure peers."
    );
  }

  // Configure peers
  console.log("Setting up peers...\n");

  const result: ConfigurationResult = {
    network: networkName,
    successCount: 0,
    skipCount: 0,
    failureCount: 0,
    peersConfigured: [],
    peersSkipped: [],
    peersFailed: [],
  };

  for (const [targetNetwork, targetAddress] of Object.entries(deployments)) {
    // Skip current network
    if (targetNetwork === networkName) {
      continue;
    }

    // Skip if address not configured
    if (!targetAddress || targetAddress === ethers.constants.AddressZero) {
      console.log(`⏭️  Skipping ${targetNetwork} (no address configured)`);
      result.skipCount++;
      result.peersSkipped.push(targetNetwork);
      continue;
    }

    const targetEid = ENDPOINT_IDS[targetNetwork];

    if (!targetEid) {
      console.log(`⚠️  Skipping ${targetNetwork} (unknown endpoint ID)`);
      result.skipCount++;
      result.peersSkipped.push(targetNetwork);
      continue;
    }

    console.log(`Setting peer for ${targetNetwork}:`);
    console.log(`  Endpoint ID: ${targetEid}`);
    console.log(`  Peer Address: ${targetAddress}`);

    // Convert address to bytes32
    const peerBytes32 = ethers.utils.zeroPad(targetAddress, 32);

    try {
      // Check if peer is already set
      if (skipConfirmed) {
        const currentPeer = await contract.peers(targetEid);

        if (currentPeer === peerBytes32) {
          console.log(`  ✅ Already configured (skipping)\n`);
          result.skipCount++;
          result.peersSkipped.push(targetNetwork);
          continue;
        }
      }

      // Set the peer
      const tx = await contract.setPeer(targetEid, peerBytes32);
      console.log(`  Transaction: ${tx.hash}`);
      console.log(`  Waiting for confirmation...`);

      await tx.wait();

      console.log(`  ✅ Peer configured!\n`);
      result.successCount++;
      result.peersConfigured.push(targetNetwork);
    } catch (error: any) {
      console.error(`  ❌ Failed to set peer: ${error.message}\n`);
      result.failureCount++;
      result.peersFailed.push(targetNetwork);
    }
  }

  // Summary
  console.log("==========================================");
  console.log("  Configuration Complete");
  console.log("==========================================\n");

  console.log(`Successfully configured: ${result.successCount}`);
  console.log(`Skipped: ${result.skipCount}`);
  console.log(`Failed: ${result.failureCount}\n`);

  if (result.successCount > 0) {
    console.log("✅ Contract is ready for cross-chain messaging!");
    console.log("\nPeers configured:");
    result.peersConfigured.forEach((net) => console.log(`  - ${net}`));
  }

  if (result.peersFailed.length > 0) {
    console.log("\n⚠️  Failed to configure:");
    result.peersFailed.forEach((net) => console.log(`  - ${net}`));
  }

  // Display current peer status
  console.log("\nCurrent Peer Configuration:");
  for (const [targetNetwork, targetEid] of Object.entries(ENDPOINT_IDS)) {
    if (targetNetwork === networkName) continue;

    try {
      const peer = await contract.peers(targetEid);
      const isConfigured = peer !== ethers.constants.HashZero;
      const status = isConfigured ? "✅ Configured" : "❌ Not configured";
      console.log(`  ${targetNetwork}: ${status}`);
    } catch (error) {
      console.log(`  ${targetNetwork}: ⚠️  Unable to check`);
    }
  }

  console.log("\n==========================================\n");

  return result;
}

/**
 * Load deployments from a JSON file
 */
export async function loadDeployments(
  filePath: string
): Promise<Record<string, string>> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const fullPath = path.resolve(filePath);
  const content = await fs.readFile(fullPath, "utf-8");
  const deployments = JSON.parse(content);

  return deployments;
}

/**
 * Save deployments to a JSON file
 */
export async function saveDeployments(
  filePath: string,
  deployments: Record<string, string>
): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const fullPath = path.resolve(filePath);
  await fs.writeFile(fullPath, JSON.stringify(deployments, null, 2), "utf-8");

  console.log(`✅ Deployments saved to ${fullPath}`);
}

/**
 * Get peer status for a contract
 */
export async function getPeerStatus(
  contractName: string,
  contractAddress: string
): Promise<Record<string, boolean>> {
  const contract = await ethers.getContractAt(contractName, contractAddress);

  const status: Record<string, boolean> = {};

  for (const [network, eid] of Object.entries(ENDPOINT_IDS)) {
    try {
      const peer = await contract.peers(eid);
      status[network] = peer !== ethers.constants.HashZero;
    } catch (error) {
      status[network] = false;
    }
  }

  return status;
}
