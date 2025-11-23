import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('lz:oapp:status', 'Get OApp status and statistics').setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name
    console.log(`\n📊 Querying OApp on ${network}...\n`)

    // Get deployment
    const deployment = await hre.deployments.get('SimpleMessenger')
    const contract = await hre.ethers.getContractAt('SimpleMessenger', deployment.address)

    // Query state
    const messagesSent = await contract.messagesSent()
    const messagesReceived = await contract.messagesReceived()
    const lastMessage = await contract.lastMessage()

    // Display results
    console.log('Contract Status:')
    console.log(`  Address: ${deployment.address}`)
    console.log(`  Messages Sent: ${messagesSent}`)
    console.log(`  Messages Received: ${messagesReceived}`)
    console.log(`  Last Message: "${lastMessage}"\n`)
})
