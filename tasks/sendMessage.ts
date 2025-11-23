import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { Options } from '@layerzerolabs/lz-v2-utilities'

import { getDeployedContract } from './helpers/taskHelpers'

task('lz:messenger:send', 'Send a cross-chain message')
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('message', 'Message to send', undefined, types.string)
    .addOptionalParam('gas', 'Gas limit for lzReceive', 200000, types.int)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            // Get deployed contract
            const { contract } = await getDeployedContract(hre, 'SimpleMessenger')

            // Build options with gas limit
            const options = Options.newOptions().addExecutorLzReceiveOption(args.gas, 0).toBytes()

            // Quote the fee
            const fee = await contract.quote(args.dstEid, args.message, options, false)

            console.log(`Estimated native fee to send message: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`)

            console.log('\n⏳ Sending message...\n')

            // Send the message
            const tx = await contract.sendMessage(args.dstEid, args.message, options, { value: fee.nativeFee })

            // Wait for confirmation
            const receipt = await tx.wait()

            // Display results
            console.log('\n✅ Message sent successfully!\n')
            console.log('Transaction Details:')
            console.log(`  Hash: ${tx.hash}`)
            console.log(`  To: ${contract.address}`)
            console.log(`  Message: "${args.message}"`)
            console.log(`  fee: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`)
            console.log(`  Block: ${receipt.blockNumber}`)
            console.log(`  Gas Used: ${receipt.gasUsed.toString()}`)

            return {
                txHash: tx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
            }
        } catch (error: any) {
            console.log('error', error.toString())
            throw error
        }
    })
