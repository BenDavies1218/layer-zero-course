import { HardhatRuntimeEnvironment } from 'hardhat/types'

/**
 * Log transaction details after successful send
 */
export async function logTransaction(
    hre: HardhatRuntimeEnvironment,
    tx: any,
    receipt: any,
    contractAddress: string,
    message: string,
    nativeFee: any
) {
    console.log('✅ Message sent successfully!\n')
    console.log('Transaction Details:')
    console.log(`  Hash: ${tx.hash}`)
    console.log(`  To: ${contractAddress}`)
    console.log(`  Message: "${message}"`)
    console.log(`  Fee: ${hre.ethers.utils.formatEther(nativeFee)} ETH`)
    console.log(`  Block: ${receipt.blockNumber}`)
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}`)
    console.log(`  LayerZero Scan: https://testnet.layerzeroscan.com/tx/${tx.hash}\n`)
}
