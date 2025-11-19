import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { scanDeployments, getNetworkDisplayName } from './helpers/configGenerator'
import * as readline from 'readline'
import { createLogger } from '@layerzerolabs/io-devtools'
import {
    getNetworkFromEid,
    logError,
    logInfo,
    logMessagingFee,
    logSuccess,
    logTransactionDetails,
} from './helpers/taskHelpers'

const logger = createLogger()

function askQuestion(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

task('lz:send:interactive', 'Interactively send a cross-chain message')
    .setAction(async (_args, hre: HardhatRuntimeEnvironment) => {
        console.log('\n🚀 LayerZero Cross-Chain Message Sender\n')
        console.log('═══════════════════════════════════════\n')

        try {
            // Step 1: Scan deployments
            console.log('📡 Scanning deployments...\n')
            const deployments = await scanDeployments()

            if (deployments.length === 0) {
                console.log('❌ No deployments found')
                console.log('💡 Deploy contracts first using: pnpm deploy:contract\n')
                return
            }

            console.log(`✅ Found ${deployments.length} deployment${deployments.length !== 1 ? 's' : ''}\n`)

            // Group by contract name
            const contractNames = [...new Set(deployments.map((d) => d.contractName))]

            console.log('Available Contracts:\n')
            contractNames.forEach((name, idx) => {
                const count = deployments.filter((d) => d.contractName === name).length
                console.log(`   ${idx + 1}. ${name} (${count} deployment${count > 1 ? 's' : ''})`)
            })

            // Step 2: Select contract
            let selectedContract: string

            if (contractNames.length === 1) {
                selectedContract = contractNames[0]
                console.log(`\n✅ Auto-selected: ${selectedContract}\n`)
            } else {
                const answer = await askQuestion('\n🔍 Select contract number: ')
                const selection = parseInt(answer)
                if (isNaN(selection) || selection < 1 || selection > contractNames.length) {
                    console.error('\n❌ Invalid selection\n')
                    return
                }
                selectedContract = contractNames[selection - 1]
                console.log(`\n✅ Selected: ${selectedContract}\n`)
            }

            // Get deployments for selected contract
            const contractDeployments = deployments.filter((d) => d.contractName === selectedContract)

            // Step 3: Select source network (must match current network)
            console.log('📍 Source Networks:\n')
            contractDeployments.forEach((d, idx) => {
                const displayName = getNetworkDisplayName(d.network)
                const current = d.network === hre.network.name ? ' (current)' : ''
                console.log(`   ${idx + 1}. ${displayName}${current}`)
                console.log(`      Network: ${d.network}`)
                console.log(`      Address: ${d.address}`)
                console.log(`      EID: ${d.eid}\n`)
            })

            const sourceDeployment = contractDeployments.find((d) => d.network === hre.network.name)

            if (!sourceDeployment) {
                console.error(`❌ No deployment found for current network: ${hre.network.name}`)
                console.log('\n💡 Available networks for this contract:')
                contractDeployments.forEach((d) => console.log(`   - ${d.network}`))
                console.log('\n💡 Run this command with --network flag:')
                console.log(`   pnpm hardhat lz:send:interactive --network ${contractDeployments[0].network}\n`)
                return
            }

            console.log(`✅ Source: ${getNetworkDisplayName(sourceDeployment.network)} (EID: ${sourceDeployment.eid})\n`)

            // Step 4: Select destination network
            const destinationOptions = contractDeployments.filter((d) => d.network !== hre.network.name)

            if (destinationOptions.length === 0) {
                console.error('❌ No other networks found for this contract')
                console.log('💡 Deploy to another network first\n')
                return
            }

            console.log('🎯 Destination Networks:\n')
            destinationOptions.forEach((d, idx) => {
                const displayName = getNetworkDisplayName(d.network)
                console.log(`   ${idx + 1}. ${displayName}`)
                console.log(`      Network: ${d.network}`)
                console.log(`      Address: ${d.address}`)
                console.log(`      EID: ${d.eid}\n`)
            })

            const destAnswer = await askQuestion('🔍 Select destination number: ')
            const destSelection = parseInt(destAnswer)
            if (isNaN(destSelection) || destSelection < 1 || destSelection > destinationOptions.length) {
                console.error('\n❌ Invalid selection\n')
                return
            }

            const destinationDeployment = destinationOptions[destSelection - 1]
            console.log(
                `\n✅ Destination: ${getNetworkDisplayName(destinationDeployment.network)} (EID: ${destinationDeployment.eid})\n`
            )

            // Step 5: Get message to send
            const message = await askQuestion('💬 Enter message to send: ')
            if (!message) {
                console.error('\n❌ Message cannot be empty\n')
                return
            }
            console.log()

            // Step 6: Get contract instance
            logger.info('📋 Loading contract...\n')
            const contractArtifact = await hre.deployments.get(selectedContract)
            const [signer] = await hre.ethers.getSigners()
            const contract = await hre.ethers.getContractAt(contractArtifact.abi, contractArtifact.address, signer)

            // Step 7: Detect available methods and quote gas cost
            logger.info('📊 Quoting gas cost...\n')
            const options = '0x' // Default empty options

            // Dynamically detect which methods are available
            let messagingFee
            let sendMethod: string
            let quoteMethod: string

            if (typeof contract.quoteSendString === 'function') {
                // MyOApp-style interface
                quoteMethod = 'quoteSendString'
                sendMethod = 'sendString'
                messagingFee = await contract.quoteSendString(destinationDeployment.eid, message, options, false)
            } else if (typeof contract.quote === 'function') {
                // SimpleMessenger-style interface
                quoteMethod = 'quote'
                sendMethod = 'sendMessage'
                messagingFee = await contract.quote(destinationDeployment.eid, message, options, false)
            } else {
                throw new Error(
                    `Contract does not have a supported quote method. Available methods: ${Object.keys(contract.functions).join(', ')}`
                )
            }

            logMessagingFee(hre, messagingFee)

            // Step 8: Confirm send
            const confirmAnswer = await askQuestion('\n✅ Send this message? (Y/n): ')
            const shouldSend = confirmAnswer.toLowerCase() !== 'n' && confirmAnswer.toLowerCase() !== 'no'

            if (!shouldSend) {
                console.log('\n❌ Cancelled\n')
                return
            }

            // Step 9: Send transaction
            logger.info('\n📤 Sending message...\n')
            logInfo(`Using method: ${sendMethod}()\n`)

            const tx = await contract[sendMethod](destinationDeployment.eid, message, options, {
                value: messagingFee.nativeFee,
            })

            logInfo(`Transaction submitted: ${tx.hash}`)

            // Step 10: Wait for confirmation
            logger.info('⏳ Waiting for confirmation...\n')
            const receipt = await tx.wait()

            // Step 11: Log results
            await logTransactionDetails(hre, receipt, destinationDeployment.eid)

            console.log('\n')
            logSuccess(`Message sent successfully!`)
            console.log('\n' + '═'.repeat(60) + '\n')

            console.log('📝 Summary:\n')
            console.log(`   From: ${getNetworkDisplayName(sourceDeployment.network)} (EID: ${sourceDeployment.eid})`)
            console.log(
                `   To:   ${getNetworkDisplayName(destinationDeployment.network)} (EID: ${destinationDeployment.eid})`
            )
            console.log(`   Message: "${message}"`)
            console.log(`   Tx Hash: ${receipt.transactionHash}`)
            console.log(`   Gas Used: ${receipt.gasUsed.toString()}`)
            console.log(`\n   🔍 Track: https://testnet.layerzeroscan.com/tx/${receipt.transactionHash}\n`)

            console.log('💡 Next steps:')
            console.log('   - Check message status on LayerZero Scan')
            console.log(`   - Verify receipt on ${getNetworkDisplayName(destinationDeployment.network)}`)
            console.log(
                `   - View config: pnpm hardhat lz:oapp:config:get --oapp-config deployments/peer-configurations/${selectedContract}.config.ts\n`
            )
        } catch (error: unknown) {
            logError('Failed to send message', error)
            throw error
        }
    })
