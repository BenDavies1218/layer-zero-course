import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { getQuoteArgs } from './helpers/getQuoteArgs'
import { sendMessage } from './helpers/getSendArgs'
import { logTransaction } from './helpers/logTransaction'
import { getDeployedContract } from './helpers/taskHelpers'

task('lz:oapp:send', 'Send a cross-chain message')
    .addParam('contract', 'The contract name to send from')
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addOptionalParam('message', 'Message to send', undefined, types.string)
    .addOptionalParam('gasLimit', 'Gas limit for lzReceive', 200000, types.int)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contractName = args.contract

            const { contract, address } = await getDeployedContract(hre, contractName)

            const { options, fee } = await getQuoteArgs(
                contract,
                hre,
                contractName,
                args.dstEid,
                args.message,
                args.gasLimit
            )

            const tx = await sendMessage(contract, contractName, args.dstEid, args.message, options, fee.nativeFee)
            const receipt = await tx.wait()

            await logTransaction(hre, tx, receipt, address, args.message, fee.nativeFee)
        } catch (error: any) {
            console.log('❌ Error:', error.toString())
            throw error
        }
    })
