import { Contract } from 'ethers'

export const readContractState = async (contract: Contract, address: string, contractName: string) => {
    console.log('Contract Status:')

    if (contractName === 'SimpleMessenger') {
        const messagesSent = await contract.messagesSent()
        const messagesReceived = await contract.messagesReceived()
        const lastMessage = await contract.lastMessage()

        console.log(`  Address: ${address}`)
        console.log(`  Messages Sent: ${messagesSent}`)
        console.log(`  Messages Received: ${messagesReceived}`)
        console.log(`  Last Message Received: "${lastMessage}"\n`)
    }

    if (contractName === 'PingPong') {
        const pingsSent = await contract.pingsSent()
        const pingsReceived = await contract.pingsReceived()
        const pongsSent = await contract.pongsSent()
        const pongsReceived = await contract.pongsReceived()

        console.log(`  Address: ${address}`)
        console.log(`  Pings Sent: ${pingsSent}`)
        console.log(`  Pings Received: ${pingsReceived}`)
        console.log(`  Pongs Sent: ${pongsSent}`)
        console.log(`  Pongs Received: ${pongsReceived}\n`)
    }
}
