import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import '@nomicfoundation/hardhat-verify'
import dotenv from 'dotenv'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

import './tasks/wireInteractive'
import './tasks/deployInteractive'
import './tasks/sendInteractive'

// eslint-disable-next-line import/no-named-as-default-member -- IGNORE -
dotenv.config()

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic
const MNEMONIC = process.env.MNEMONIC

// If you prefer to be authenticated using a private key, set a PRIVATE_KEY environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
      ? [PRIVATE_KEY]
      : undefined

if (accounts == null) {
    console.warn(
        'Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.'
    )
}

const config: HardhatUserConfig = {
    paths: {
        cache: 'cache/hardhat',
    },
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    etherscan: {
        apiKey: {
            // Ethereum
            sepolia: process.env.ETHERSCAN_API_KEY || '',
            // Arbitrum
            arbitrumSepolia: process.env.ETHERSCAN_API_KEY || '',
            // Base
            baseSepolia: process.env.ETHERSCAN_API_KEY || '',
            // Optimism
            optimismSepolia: process.env.ETHERSCAN_API_KEY || '',
            // Polygon
            polygonAmoy: process.env.POLYGONSCAN_API_KEY || '',
        },
        customChains: [
            {
                network: 'arbitrum-sepolia',
                chainId: 421614,
                urls: {
                    apiURL: 'https://api-sepolia.arbiscan.io/api',
                    browserURL: 'https://sepolia.arbiscan.io',
                },
            },
            {
                network: 'base-sepolia',
                chainId: 84532,
                urls: {
                    apiURL: 'https://api-sepolia.basescan.org/api',
                    browserURL: 'https://sepolia.basescan.org',
                },
            },
            {
                network: 'optimism-sepolia',
                chainId: 11155420,
                urls: {
                    apiURL: 'https://api-sepolia-optimistic.etherscan.io/api',
                    browserURL: 'https://sepolia-optimism.etherscan.io',
                },
            },
            {
                network: 'polygon-amoy',
                chainId: 80002,
                urls: {
                    apiURL: 'https://api-amoy.polygonscan.com/api',
                    browserURL: 'https://amoy.polygonscan.com',
                },
            },
        ],
    },
    sourcify: {
        enabled: false,
    },
    networks: {
        'arbitrum-sepolia': {
            eid: EndpointId.ARBSEP_V2_TESTNET,
            url:
                `${process.env.RPC_URL_ARB_SEPOLIA}${process.env.ALCHEMY_API_KEY}` ||
                'https://arbitrum-sepolia.gateway.tenderly.co',
            accounts,
        },
        'base-sepolia': {
            eid: EndpointId.BASESEP_V2_TESTNET,
            url:
                `${process.env.RPC_URL_BASE_SEPOLIA}${process.env.ALCHEMY_API_KEY}` ||
                'https://base-sepolia.gateway.tenderly.co',
            accounts,
        },
        'ethereum-sepolia': {
            eid: EndpointId.SEPOLIA_V2_TESTNET,
            url:
                `${process.env.RPC_URL_SEPOLIA}${process.env.ALCHEMY_API_KEY}` ||
                'https://eth-sepolia.gateway.tenderly.co',
            accounts,
        },
        'polygon-amoy': {
            eid: EndpointId.AMOY_V2_TESTNET,
            url:
                `${process.env.RPC_URL_AMOY}${process.env.ALCHEMY_API_KEY}` ||
                'https://polygon-amoy.gateway.tenderly.co',
            accounts,
        },
        'optimism-sepolia': {
            eid: EndpointId.OPTSEP_V2_TESTNET,
            url:
                `${process.env.RPC_URL_OP_SEPOLIA}${process.env.ALCHEMY_API_KEY}` ||
                'https://optimism-sepolia.gateway.tenderly.co',
            accounts,
        },
        hardhat: {
            // Need this for testing because TestHelperOz5.sol is exceeding the compiled contract size limit
            allowUnlimitedContractSize: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

export default config
