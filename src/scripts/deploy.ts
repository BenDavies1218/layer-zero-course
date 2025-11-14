import { deployOApp } from "../utils/deploy-oapp";

async function main() {
  // Enter the contract name to deploy
  const contractName = undefined; // "SimpleMessenger";

  if (!contractName) {
    throw new Error("Contract name not specified");
  }

  const result = await deployOApp({
    contractName,
    constructorArgs: [], // Endpoint and owner are added automatically
    verify: true, // Set to true to verify on block explorer
  });

  console.log(`\n📋 Deployment Summary:`);
  console.log(`   Contract: ${result.address}`);
  console.log(`   Network: ${result.network}`);
  console.log(`   Chain ID: ${result.chainId}`);
  console.log(`   Block: ${result.blockNumber}`);
  console.log(`   Tx: ${result.txHash}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
