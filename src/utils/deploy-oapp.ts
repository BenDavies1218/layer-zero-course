// @ts-ignore - ethers is injected by Hardhat at runtime
import { ethers } from "hardhat";

/**
 * Generic OApp deployment configuration
 */
export interface DeployOAppConfig {
  contractName: string;
  constructorArgs?: any[];
  verify?: boolean;
  saveDeployment?: boolean;
}

/**
 * Deployment result with contract and metadata
 */
export interface DeploymentResult {
  contract: any;
  address: string;
  deployer: string;
  network: string;
  chainId: number;
  endpointAddress: string;
  txHash: string;
  blockNumber: number;
}

/**
 * Generic OApp deployer utility
 */
export async function deployOApp(
  config: DeployOAppConfig
): Promise<DeploymentResult> {
  const { contractName, constructorArgs = [], verify = false } = config;

  console.log("==========================================");
  console.log(`  ${contractName} Deployment`);
  console.log("==========================================\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;
  const chainId = Number(network.chainId);

  console.log(`Network: ${networkName}`);
  console.log(`Chain ID: ${chainId}\n`);

  // Get endpoint address from environment
  const endpointAddress = process.env.TESTNET_V2_ENDPOINT_ADDRESS;

  if (!endpointAddress) {
    throw new Error(
      "TESTNET_V2_ENDPOINT_ADDRESS not found in environment variables"
    );
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer Information:");
  console.log(`  Address: ${deployer.address}`);
  console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  if (balance.toString() === "0") {
    throw new Error(
      "Deployer has no balance. Get testnet tokens from a faucet."
    );
  }

  // Get contract factory
  console.log(`Deploying ${contractName}...`);
  const ContractFactory = await ethers.getContractFactory(contractName);

  // OApp contracts typically need endpoint and owner as constructor args
  const fullConstructorArgs = [
    ...constructorArgs,
    endpointAddress,
    deployer.address,
  ];

  // Deploy contract
  const contract = await ContractFactory.deploy(...fullConstructorArgs);

  console.log(`  Transaction hash: ${contract.deployTransaction.hash}`);
  console.log("  Waiting for confirmations...\n");

  await contract.deployed();

  const receipt = await contract.deployTransaction.wait();

  // Log success
  console.log("==========================================");
  console.log("  Deployment Successful! ✅");
  console.log("==========================================\n");

  if (verify) {
    console.log(`  4. Verify on block explorer:\n`);
    console.log(
      `     npx hardhat verify --network ${networkName} ${
        contract.address
      } ${fullConstructorArgs.map((arg) => `"${arg}"`).join(" ")}`
    );
  }

  console.log("\n==========================================\n");

  return {
    contract,
    address: contract.address,
    deployer: deployer.address,
    network: networkName,
    chainId,
    endpointAddress,
    txHash: contract.deployTransaction.hash,
    blockNumber: receipt.blockNumber,
  };
}
