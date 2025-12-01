import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { readContractState } from './helpers/readContractState'
import { getDeployedContract } from './helpers/taskHelpers'

task('lz:oapp:status', 'Get OApp status and statistics')
    .addParam('contract', 'The contract name to query status')
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        // Get the network that hardhat is connected to
        const network = hre.network.name
        const contractName = args.contract

        console.log(`\n📊 Querying ${contractName} on ${network}...\n`)

        const { contract, address } = await getDeployedContract(hre, contractName)

        await readContractState(contract, address, contractName)
    })
