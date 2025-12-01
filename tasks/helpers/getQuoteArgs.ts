import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { Options } from '@layerzerolabs/lz-v2-utilities'

/**
 * Get quote for cross-chain message based on contract type
 */
export async function getQuoteArgs(
    contract: Contract,
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    dstEid: number,
    message: string,
    gasLimit = 200000
) {
    // Build options with gas limit
    const options = Options.newOptions().addExecutorLzReceiveOption(gasLimit, 0).toBytes()

    let fee

    if (contractName === 'SimpleMessenger') {
        fee = await contract.quote(dstEid, message, options, false)
    }

    if (contractName === 'PingPong') {
        fee = await contract.quote(dstEid, options, false)
    }

    if (!fee) {
        throw new Error(`Quote not available for contract: ${contractName}`)
    }

    console.log(`💰 Estimated native fee: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`)

    // Check user's balance
    const [signer] = await hre.ethers.getSigners()
    const balance = await signer.getBalance()

    if (balance.lt(fee.nativeFee)) {
        throw new Error(
            `Insufficient balance. Required: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH, Available: ${hre.ethers.utils.formatEther(balance)} ETH`
        )
    }

    console.log(`💳 Account balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`)

    return {
        options,
        fee,
    }
}
