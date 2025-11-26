import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { Options } from '@layerzerolabs/lz-v2-utilities'

import { getDeployedContract } from './helpers/taskHelpers'

task('lz:oapp:pingpong', 'Send a ping message that will automatically trigger a pong response')
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addOptionalParam('sendGas', 'Gas limit for ping execution on destination chain', 200000, types.int)
    .addOptionalParam('returnGas', 'Gas limit for pong execution when returning', 200000, types.int)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            // Get deployed contract
            const { contract } = await getDeployedContract(hre, 'PingPong')

            // Step 1: Build options for the pong message (B → A)
            // These will be encoded in the ping payload and used by destination to send pong back
            const returnOptions = Options.newOptions().addExecutorLzReceiveOption(args.returnGas, 0).toBytes()

            // Step 2: Quote the pong fee (what it costs to send pong from B back to A)
            // We need to know this to pre-fund the destination contract
            const emptyReturnOptions = '0x' // Pong doesn't trigger another message
            const pongFee = await contract.quote(args.dstEid, returnOptions, emptyReturnOptions)

            // Step 3: Build options for the ping message (A → B)
            // CRITICAL: Include pongFee as native value to pre-fund the destination contract for pong response
            const sendOptions = Options.newOptions().addExecutorLzReceiveOption(args.sendGas, pongFee).toBytes()

            // Quote the fee for complete round trip
            const totalFee = await contract.quote(args.dstEid, sendOptions, returnOptions)

            console.log(`\nEstimated fee for complete ping-pong round trip:`)
            console.log(`  ${hre.ethers.utils.formatEther(totalFee)} ETH`)
            console.log(`  (includes ping A→B and automatic pong B→A)\n`)

            // Check user's balance
            const [signer] = await hre.ethers.getSigners()
            const balance = await signer.getBalance()

            if (balance.lt(totalFee)) {
                throw new Error(
                    `Insufficient balance. Required: ${hre.ethers.utils.formatEther(totalFee)} ETH, Available: ${hre.ethers.utils.formatEther(balance)} ETH`
                )
            }

            console.log(`Account balance: ${hre.ethers.utils.formatEther(balance)} ETH`)

            // Get current ping count before sending
            const pingId = await contract.pingsSent()

            // Send the ping (which will automatically trigger a pong)
            const tx = await contract.send(args.dstEid, sendOptions, returnOptions, { value: totalFee })

            console.log('\n⏳ Sending ping message...\n')

            // Wait for confirmation
            const receipt = await tx.wait()

            // Display results
            console.log('\n✅ Ping message sent successfully!\n')
            console.log('Transaction Details:')
            console.log(`  Hash: ${tx.hash}`)
            console.log(`  Contract: ${contract.address}`)
            console.log(`  Ping ID: ${pingId}`)
            console.log(`  Destination EID: ${args.dstEid}`)
            console.log(`  Send Gas: ${args.sendGas}`)
            console.log(`  Return Gas: ${args.returnGas}`)
            console.log(`  Total Fee: ${hre.ethers.utils.formatEther(totalFee)} ETH`)
            console.log(`  Block: ${receipt.blockNumber}`)
            console.log(`  Gas Used: ${receipt.gasUsed.toString()}`)
            console.log(`\n📊 What happens next:`)
            console.log(`  1. Ping message will be delivered to destination chain`)
            console.log(`  2. Destination will automatically send pong response`)
            console.log(`  3. Pong will be delivered back to this chain`)
            console.log(`  4. Use 'pnpm hardhat lz:oapp:status:pingpong --network ${hre.network.name}' to check status`)
            console.log(`\n🔍 Track on LayerZero Scan:`)
            console.log(`  https://testnet.layerzeroscan.com/tx/${tx.hash}\n`)
        } catch (error: any) {
            console.log('error', error.toString())
            throw error
        }
    })
