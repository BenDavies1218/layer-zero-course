import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('lz:oapp:status', 'Get OApp status and statistics').setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    // Get the network that hardhat is connected to
    const network = hre.network.name
    console.log(`\n📊 Querying OApp on ${network}...\n`)

    // Get the deployment
    const deployment = await hre.deployments.get('SimpleMessenger')

    // Call the getContractAt()
    const contract = await hre.ethers.getContractAt('SimpleMessenger', deployment.address)

    // Now you can call any method on the contract you want.

    // Lets Query state
    const messagesSent = await contract.messagesSent()
    const messagesReceived = await contract.messagesReceived()
    const lastMessage = await contract.lastMessage()

    // Console Log Display results, here you could write stuff to a JSON or whatever you want.
    console.log('Contract Status:')
    console.log(`  Address: ${deployment.address}`)
    console.log(`  Messages Sent: ${messagesSent}`)
    console.log(`  Messages Received: ${messagesReceived}`)
    console.log(`  Last Message Received: "${lastMessage}"\n`)
})
