import { task } from 'hardhat/config'
import { ActionType } from 'hardhat/types'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

interface DeployTaskArgs {
    contract?: string
}

const deployInteractive: ActionType<DeployTaskArgs> = async (taskArgs, hre) => {
    const { contract } = taskArgs

    // Find all Solidity contracts
    const contractsDir = path.join(__dirname, '..', 'contracts')
    const contracts: string[] = []

    function findContracts(dir: string) {
        const files = fs.readdirSync(dir)
        for (const file of files) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) {
                findContracts(filePath)
            } else if (file.endsWith('.sol')) {
                const contractName = file.replace('.sol', '')
                contracts.push(contractName)
            }
        }
    }

    findContracts(contractsDir)

    if (contracts.length === 0) {
        console.error('No contracts found in contracts/ directory')
        return
    }

    let selectedContract: string

    if (contract) {
        // Contract specified via CLI arg
        if (!contracts.includes(contract)) {
            console.error(`Contract "${contract}" not found. Available contracts:`)
            contracts.forEach((c, i) => console.log(`  ${i + 1}. ${c}`))
            return
        }
        selectedContract = contract
    } else {
        // Interactive selection
        console.log('\n📦 Available contracts:\n')
        contracts.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c}`)
        })

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })

        const answer = await new Promise<string>((resolve) => {
            rl.question('\n🔍 Select contract number to deploy: ', (ans) => {
                rl.close()
                resolve(ans)
            })
        })

        const selection = parseInt(answer.trim())
        if (isNaN(selection) || selection < 1 || selection > contracts.length) {
            console.error('Invalid selection')
            return
        }

        selectedContract = contracts[selection - 1]
    }

    console.log(`\n✅ Selected contract: ${selectedContract}\n`)

    // Update deploy/OApp.ts with selected contract
    const deployScriptPath = path.join(__dirname, '..', 'deploy', 'OApp.ts')
    let deployScript = fs.readFileSync(deployScriptPath, 'utf-8')

    // Replace the contractName value
    deployScript = deployScript.replace(
        /const contractName = ['"].*?['"]/,
        `const contractName = '${selectedContract}'`
    )

    fs.writeFileSync(deployScriptPath, deployScript)
    console.log(`📝 Updated deploy/OApp.ts with contract: ${selectedContract}`)

    // Run the deployment
    console.log(`\n🚀 Running deployment for ${selectedContract}...\n`)

    try {
        await hre.run('lz:deploy', { tags: [selectedContract] })
        console.log(`\n✅ Deployment complete!`)
    } catch (error) {
        console.error(`\n❌ Deployment failed:`, error)
        throw error
    }
}

task('deploy:interactive', 'Interactively select and deploy a contract')
    .addOptionalParam('contract', 'Contract name to deploy (skip interactive selection)')
    .setAction(deployInteractive)
