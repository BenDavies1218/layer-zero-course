import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@layerzerolabs/toolbox-hardhat";
import { EndpointId } from "@layerzerolabs/lz-definitions";
import * as dotenv from "dotenv";

dotenv.config();

// Validate and setup accounts
const accounts =
  process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 66
    ? [process.env.PRIVATE_KEY]
    : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./src/contracts",
    tests: "./src/tests",
    cache: "./src/cache",
    artifacts: "./src/artifacts",
  },
  networks: {
    // Testnets - Supported Chains with Alchemy
    "ethereum-sepolia": {
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      url: process.env.RPC_URL_SEPOLIA || "https://rpc.sepolia.org",
      accounts,
    },
    "arbitrum-sepolia": {
      eid: EndpointId.ARBSEP_V2_TESTNET,
      url:
        process.env.RPC_URL_ARB_SEPOLIA ||
        "https://arbitrum-sepolia.gateway.tenderly.co",
      accounts,
    },
    "optimism-sepolia": {
      eid: EndpointId.OPTSEP_V2_TESTNET,
      url:
        process.env.RPC_URL_OP_SEPOLIA ||
        "https://optimism-sepolia.gateway.tenderly.co",
      accounts,
    },
    "base-sepolia": {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: process.env.RPC_URL_BASE_SEPOLIA || "https://sepolia.base.org",
      accounts,
    },
    "polygon-amoy": {
      eid: EndpointId.AMOY_V2_TESTNET,
      url: process.env.RPC_URL_AMOY || "https://rpc-amoy.polygon.technology",
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      "arbitrum-sepolia": process.env.ETHERSCAN_API_KEY || "",
      "optimism-sepolia": process.env.ETHERSCAN_API_KEY || "",
      "base-sepolia": process.env.ETHERSCAN_API_KEY || "",
      "polygon-amoy": process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;
