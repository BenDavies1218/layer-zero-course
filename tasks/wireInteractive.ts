import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import * as readline from 'readline'

import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { generateConfigCode, getNetworkDisplayName, scanDeployments } from './helpers/configGenerator'

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

task('lz:oapp:wire:interactive', 'Interactive CLI for configuring and wiring OApp contracts')
    .addFlag('skipWire', 'Skip the wiring step, only generate config')
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        console.log('\n🚀 LayerZero OApp Configuration Wizard\n')
        console.log('═══════════════════════════════════════\n')

        try {
            // Step 1: Scan deployments
            console.log('📡 Scanning deployments directory...\n')
            const deployments = await scanDeployments()

            if (deployments.length === 0) {
                console.log('❌ No deployments found in the deployments directory')
                console.log('💡 Deploy contracts first using: pnpm hardhat lz:deploy\n')
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
                const answer = await askQuestion('\n🔍 Select contract number to configure: ')
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

            // Step 3: Display deployments
            console.log(`📦 Deployments for ${selectedContract}:\n`)
            contractDeployments.forEach((d, idx) => {
                console.log(`   ${idx + 1}. ${getNetworkDisplayName(d.network)}`)
                console.log(`      Network: ${d.network}`)
                console.log(`      Address: ${d.address}`)
                console.log(`      EID: ${d.eid}\n`)
            })

            // Calculate pathways
            const numPathways = (contractDeployments.length * (contractDeployments.length - 1)) / 2
            console.log(`🔗 This will create ${numPathways} bidirectional pathway${numPathways !== 1 ? 's' : ''}\n`)

            // Step 4: Configure gas limit
            const gasAnswer = await askQuestion('⛽ Enter gas limit for _lzReceive execution (default: 200000): ')
            const gasLimit = gasAnswer ? parseInt(gasAnswer) : 200000

            if (isNaN(gasLimit) || gasLimit < 50000 || gasLimit > 10000000) {
                console.error('\n❌ Invalid gas limit. Must be between 50,000 and 10,000,000\n')
                return
            }
            console.log()

            // Step 5: Configure DVN settings (simplified - use defaults)
            const requiredDVNs = ['LayerZero Labs']
            const optionalDVNs: string[] = []
            const confirmations = 1

            console.log('📡 Using default DVN settings: LayerZero Labs with 1 confirmation\n')

            // Step 6: Generate config
            console.log('⚙️  Generating configuration...\n')

            // Generate custom config code with user settings
            const configCode = generateCustomConfigCode(
                contractDeployments,
                selectedContract,
                gasLimit,
                requiredDVNs,
                optionalDVNs,
                confirmations
            )

            // Create peer-configurations directory if it doesn't exist
            const peerConfigsDir = path.join(process.cwd(), 'deployments', 'peer-configurations')
            if (!fs.existsSync(peerConfigsDir)) {
                fs.mkdirSync(peerConfigsDir, { recursive: true })
            }

            const configFileName = `${selectedContract}.config.ts`
            const configPath = path.join(peerConfigsDir, configFileName)

            // Check if config already exists
            if (fs.existsSync(configPath)) {
                const overwriteAnswer = await askQuestion(`⚠️  ${configFileName} already exists. Overwrite? (y/N): `)
                if (overwriteAnswer.toLowerCase() !== 'y' && overwriteAnswer.toLowerCase() !== 'yes') {
                    console.log('\n❌ Cancelled. Existing config file was not modified.\n')
                    return
                }
                console.log()
            }

            // Write config file
            fs.writeFileSync(configPath, configCode)
            console.log(`✅ Configuration written to deployments/peer-configurations/${configFileName}\n`)

            // Step 7: Skip preview to keep it simple
            // Config is already written, user can view the file directly

            // Step 8: Wire the OApp
            const configFilePath = `deployments/peer-configurations/${configFileName}`

            if (args.skipWire) {
                console.log('✅ Configuration complete! (Wiring skipped)\n')
                console.log('💡 To wire the connections later, run:')
                console.log(`   pnpm hardhat lz:oapp:wire --oapp-config ${configFilePath}\n`)
                return
            }

            const wireAnswer = await askQuestion('🔧 Wire the OApp connections now? (Y/n): ')
            const shouldWire = wireAnswer.toLowerCase() !== 'n' && wireAnswer.toLowerCase() !== 'no'

            if (!shouldWire) {
                console.log('\n✅ Configuration complete!\n')
                console.log('💡 To wire the connections later, run:')
                console.log(`   pnpm hardhat lz:oapp:wire --oapp-config ${configFilePath}\n`)
                return
            }

            // Execute wiring
            console.log('\n🔧 Starting interactive wiring process...\n')
            console.log('═══════════════════════════════════════\n')

            try {
                await new Promise<void>((resolve, reject) => {
                    const wire = spawn('pnpm', ['hardhat', 'lz:oapp:wire', '--oapp-config', configFilePath], {
                        cwd: process.cwd(),
                        stdio: 'inherit', // This allows user interaction with the LayerZero CLI
                        env: process.env,
                    })

                    wire.on('close', (code) => {
                        if (code === 0) {
                            console.log('\n✅ OApp wiring complete!\n')
                            console.log('🎉 Your OApp is now configured and ready to send cross-chain messages!\n')
                            console.log('📝 Next steps:')
                            console.log('   - Test sending a message: pnpm hardhat lz:oapp:send')
                            console.log(
                                `   - Check config: pnpm hardhat lz:oapp:config:get --oapp-config ${configFilePath}\n`
                            )
                            resolve()
                        } else {
                            reject(new Error(`Wiring process exited with code ${code}`))
                        }
                    })

                    wire.on('error', (error) => {
                        reject(error)
                    })
                })
            } catch (error: unknown) {
                const err = error as Error
                console.error('\n❌ Wiring failed:\n')
                console.error(err.message)
                console.log('\n💡 You can try wiring manually:')
                console.log(`   pnpm hardhat lz:oapp:wire --oapp-config ${configFilePath}\n`)
            }
        } catch (error: unknown) {
            const err = error as Error
            console.error('\n❌ Error:\n')
            console.error(err.message)
            console.log()
            throw error
        }
    })

/**
 * Generate custom config code with user-specified settings
 */
function generateCustomConfigCode(
    deployments: { network: string; contractName: string; address: string; eid: number }[],
    contractName: string,
    gasLimit: number,
    requiredDVNs: string[],
    optionalDVNs: string[],
    confirmations: number
): string {
    // Import the base generator
    const baseConfig = generateConfigCode(deployments, contractName)

    // Replace the gas limit
    const updatedConfig = baseConfig.replace(/gas: \d+,/, `gas: ${gasLimit},`)

    // Replace DVN configuration
    const dvnConfig = `['${requiredDVNs.join("', '")}']`
    const optionalDvnConfig = optionalDVNs.length > 0 ? `[${optionalDVNs.map((d) => `'${d}'`).join(', ')}, 1]` : '[]'
    const updatedDvnConfig = updatedConfig.replace(
        /\[\['LayerZero Labs'\], \[\]\]/,
        `[${dvnConfig}, ${optionalDvnConfig}]`
    )

    // Replace confirmations
    const finalConfig = updatedDvnConfig.replace(/\[1, 1\]/g, `[${confirmations}, ${confirmations}]`)

    return finalConfig
}
