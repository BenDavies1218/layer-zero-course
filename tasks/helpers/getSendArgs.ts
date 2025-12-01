import { Contract } from 'ethers'

/**
 * Send cross-chain message based on contract type
 */
export async function sendMessage(
    contract: Contract,
    contractName: string,
    dstEid: number,
    message: string,
    options: string,
    nativeFee: any
) {
    let tx

    if (contractName === 'SimpleMessenger') {
        tx = await contract.send(dstEid, message, options, { value: nativeFee })
    }

    if (contractName === 'PingPong') {
        tx = await contract.send(dstEid, message, options, { value: nativeFee })
    }

    console.log('⏳ Sending message...\n')

    return tx
}
