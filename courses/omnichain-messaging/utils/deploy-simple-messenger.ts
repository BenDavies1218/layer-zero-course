import { ethers } from "hardhat";

/**
 * Deploy SimpleMessenger contract to the current network
 *
 * Usage:
 *   npx hardhat run scripts/deploy-simple-messenger.ts --network ethereum-sepolia
 *   npx hardhat run scripts/deploy-simple-messenger.ts --network arbitrum-sepolia
 */

async function main() {
  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;

  console.log("==========================================");
  console.log("  SimpleMessenger Deployment");
  console.log("==========================================\n");
  console.log(`Network: ${networkName}`);
  console.log(`Chain ID: ${network.chainId}\n`);

  // LayerZero V2 Endpoint addresses (same across all testnets)
  const endpoints: { [key: string]: string } = {
    "ethereum-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
    "arbitrum-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
    "optimism-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
    "base-sepolia": "0x6EDCE65403992e310A62460808c4b910D972f10f",
    "polygon-amoy": "0x6EDCE65403992e310A62460808c4b910D972f10f",
  };

  const endpointAddress = endpoints[networkName];

  if (!endpointAddress) {
    console.error(`❌ No endpoint configured for network: ${networkName}`);
    console.error(`   Supported networks: ${Object.keys(endpoints).join(", ")}`);
    process.exit(1);
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer Information:");
  console.log(`  Address: ${deployer.address}`);
  console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.toString() === "0") {
    console.error("❌ Deployer has no balance. Get testnet tokens from a faucet.");
    process.exit(1);
  }

  // Deploy SimpleMessenger
  console.log("Deploying SimpleMessenger...");
  const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");

  const messenger = await SimpleMessenger.deploy(
    endpointAddress,
    deployer.address
  );

  console.log(`  Transaction hash: ${messenger.deployTransaction.hash}`);
  console.log("  Waiting for confirmations...\n");

  await messenger.deployed();

  console.log("==========================================");
  console.log("  Deployment Successful! ✅");
  console.log("==========================================\n");

  console.log("Contract Information:");
  console.log(`  SimpleMessenger: ${messenger.address}`);
  console.log(`  Owner: ${deployer.address}`);
  console.log(`  Endpoint: ${endpointAddress}\n`);

  console.log("Next Steps:");
  console.log("  1. Save the contract address above");
  console.log("  2. Deploy to another network (if not already done)");
  console.log("  3. Run configure-peers.ts to set up cross-chain communication");
  console.log(`  4. Verify on block explorer (optional):\n`);
  console.log(`     npx hardhat verify --network ${networkName} ${messenger.address} "${endpointAddress}" "${deployer.address}"`);
  console.log("\n==========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
