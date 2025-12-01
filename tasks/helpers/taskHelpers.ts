import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'

const logger = createLogger()

/**
 * Get the deployed contract by name from hardhat-deploy
 */
export async function getDeployedContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string
): Promise<{ address: string; contract: Contract }> {
    const [signer] = await hre.ethers.getSigners()

    try {
        const deployment = await hre.deployments.get(contractName)
        const contract = await hre.ethers.getContractAt(contractName, deployment.address, signer)

        logger.info(`✅ Found ${contractName} at: ${deployment.address}\n`)

        return {
            address: deployment.address,
            contract,
        }
    } catch (error) {
        logger.error(`❌ Failed to get ${contractName} deployment on network: ${hre.network.name}`)
        throw error
    }
}
