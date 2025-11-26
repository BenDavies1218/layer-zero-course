import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { Options } from '@layerzerolabs/lz-v2-utilities'

import { getDeployedContract } from './helpers/taskHelpers'

task('lz:oapp:send', 'Send a cross-chain message')
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('message', 'Message to send', undefined, types.string)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            // Get deployed contract helper
            const { contract } = await getDeployedContract(hre, 'SimpleMessenger')

            // Build options with gas limit
            const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toBytes()

            // Quote the fee
            const fee = await contract.quote(args.dstEid, args.message, options, false)

            console.log(`Estimated native fee to send message: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`)

            // Check user's balance
            const [signer] = await hre.ethers.getSigners()
            const balance = await signer.getBalance()

            if (balance.lt(fee.nativeFee)) {
                throw new Error(
                    `Insufficient balance. Required: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH, Available: ${hre.ethers.utils.formatEther(balance)} ETH`
                )
            }

            console.log(`Account balance: ${hre.ethers.utils.formatEther(balance)} ETH`)

            // Send the message
            const tx = await contract.send(args.dstEid, args.message, options, { value: fee.nativeFee })

            console.log('\n⏳ Sending message...\n')

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
            console.log(`  View on layerzeroscan: https://testnet.layerzeroscan.com/tx/${tx.hash}\n`)
        } catch (error: any) {
            console.log('error', error.toString())
            throw error
        }
    })
