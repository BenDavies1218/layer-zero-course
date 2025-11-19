import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'
import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

const logger = createLogger()

/**
 * Get the deployed contract by name from hardhat-deploy
 */
export async function getDeployedContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string
): Promise<{ address: string; contract: any }> {
    const [signer] = await hre.ethers.getSigners()

    try {
        const deployment = await hre.deployments.get(contractName)
        const contract = await hre.ethers.getContractAt(contractName, deployment.address, signer)

        logger.info(`✅ Found ${contractName} at: ${deployment.address}`)

        return {
            address: deployment.address,
            contract,
        }
    } catch (error) {
        logger.error(`❌ Failed to get ${contractName} deployment on network: ${hre.network.name}`)
        throw error
    }
}

/**
 * Get LayerZero scan link for tracking messages
 */
export function getLayerZeroScanLink(txHash: string, isTestnet = true): string {
    const baseUrl = isTestnet ? 'https://testnet.layerzeroscan.com' : 'https://layerzeroscan.com'
    return `${baseUrl}/tx/${txHash}`
}

/**
 * Get block explorer link for transaction
 */
export function getBlockExplorerLink(networkName: string, txHash: string): string | undefined {
    const explorers: Record<string, string> = {
        'ethereum-sepolia': 'https://sepolia.etherscan.io',
        'arbitrum-sepolia': 'https://sepolia.arbiscan.io',
        'base-sepolia': 'https://sepolia.basescan.org',
        'optimism-sepolia': 'https://sepolia-optimism.etherscan.io',
        'polygon-amoy': 'https://amoy.polygonscan.com',
        // Mainnets
        ethereum: 'https://etherscan.io',
        arbitrum: 'https://arbiscan.io',
        base: 'https://basescan.org',
        optimism: 'https://optimistic.etherscan.io',
        polygon: 'https://polygonscan.com',
    }

    const explorer = explorers[networkName]
    return explorer ? `${explorer}/tx/${txHash}` : undefined
}

/**
 * Log network and signer information
 */
export async function logNetworkInfo(hre: HardhatRuntimeEnvironment): Promise<void> {
    const [signer] = await hre.ethers.getSigners()

    logger.info(`🌐 Network: ${hre.network.name}`)
    logger.info(`👤 Signer: ${signer.address}`)

    // Get balance
    const balance = await signer.getBalance()
    logger.info(`💰 Balance: ${hre.ethers.utils.formatEther(balance)} ETH`)
}

/**
 * Format and log messaging fee
 */
export function logMessagingFee(hre: HardhatRuntimeEnvironment, fee: { nativeFee: any; lzTokenFee: any }): void {
    logger.info(`💵 Messaging Fee:`)
    logger.info(`   Native: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`)
    logger.info(`   LZ Token: ${fee.lzTokenFee.toString()}`)
}

/**
 * Log transaction details after sending
 */
export async function logTransactionDetails(
    hre: HardhatRuntimeEnvironment,
    receipt: any,
    dstEid: number
): Promise<void> {
    logger.info(`📝 Transaction Details:`)
    logger.info(`   Hash: ${receipt.transactionHash}`)
    logger.info(`   Block: ${receipt.blockNumber}`)
    logger.info(`   Gas Used: ${receipt.gasUsed.toString()}`)

    // Get block explorer link
    const explorerLink = getBlockExplorerLink(hre.network.name, receipt.transactionHash)
    if (explorerLink) {
        logger.info(`   Explorer: ${explorerLink}`)
    }

    // Get LayerZero scan link
    const isTestnet = dstEid >= 40000 && dstEid < 50000
    const scanLink = getLayerZeroScanLink(receipt.transactionHash, isTestnet)
    logger.info(`   LayerZero Scan: ${scanLink}`)
}

/**
 * Get network name from endpoint ID
 */
export function getNetworkFromEid(eid: number): string {
    try {
        return endpointIdToNetwork(eid)
    } catch {
        return `Unknown (EID: ${eid})`
    }
}

/**
 * Confirm action with user (for sensitive operations)
 */
export function confirmAction(message: string): boolean {
    // In a real implementation, you might want to use inquirer or similar
    // For now, this is a placeholder
    logger.warn(`⚠️  ${message}`)
    return true
}

/**
 * Endpoint IDs reference for common networks
 */
export const ENDPOINT_IDS = {
    // Testnets
    'ethereum-sepolia': 40161,
    'arbitrum-sepolia': 40231,
    'base-sepolia': 40245,
    'optimism-sepolia': 40232,
    'polygon-amoy': 40267,
    'solana-devnet': 40168,

    // Mainnets
    ethereum: 30101,
    arbitrum: 30110,
    base: 30184,
    optimism: 30111,
    polygon: 30109,
    'solana-mainnet': 30168,
} as const

/**
 * Get endpoint ID from network name
 */
export function getEidFromNetwork(networkName: string): number | undefined {
    return ENDPOINT_IDS[networkName as keyof typeof ENDPOINT_IDS]
}

/**
 * Validate endpoint ID
 */
export function isValidEid(eid: (typeof ENDPOINT_IDS)[keyof typeof ENDPOINT_IDS]): boolean {
    return Object.values(ENDPOINT_IDS).includes(eid)
}

/**
 * Format success message
 */
export function logSuccess(message: string): void {
    logger.info(`✅ ${message}`)
}

/**
 * Format error message
 */
export function logError(message: string, error?: any): void {
    logger.error(`❌ ${message}`)
    if (error) {
        logger.error(error)
    }
}

/**
 * Format info message
 */
export function logInfo(message: string): void {
    logger.info(`ℹ️  ${message}`)
}

/**
 * Format warning message
 */
export function logWarning(message: string): void {
    logger.warn(`⚠️  ${message}`)
}
