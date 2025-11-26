import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('lz:oapp:status:pingpong', 'Get PingPong contract status and statistics').setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        // Get the network that hardhat is connected to
        const network = hre.network.name
        console.log(`\n📊 Querying PingPong on ${network}...\n`)

        // Get the deployment
        const deployment = await hre.deployments.get('PingPong')

        // Call the getContractAt()
        const contract = await hre.ethers.getContractAt('PingPong', deployment.address)

        // Query state variables
        const pingsSent = await contract.pingsSent()
        const pingsReceived = await contract.pingsReceived()
        const pongsSent = await contract.pongsSent()
        const pongsReceived = await contract.pongsReceived()

        // Console Log Display results
        console.log('PingPong Contract Status:')
        console.log(`  Address: ${deployment.address}`)
        console.log(`  Pings Sent: ${pingsSent}`)
        console.log(`  Pings Received: ${pingsReceived}`)
        console.log(`  Pongs Sent: ${pongsSent}`)
        console.log(`  Pongs Received: ${pongsReceived}\n`)
    }
)
