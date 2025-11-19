import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const contractName = 'MyOApp'

const arbitrumsepoliaContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOApp',
}

const ethereumsepoliaContract: OmniPointHardhat = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'MyOApp',
}

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 200000,
        value: 0,
    },
]

const pathways: TwoWayConfig[] = [
    [
        arbitrumsepoliaContract,
        ethereumsepoliaContract,
        [['LayerZero Labs'], []],
        [1, 1],
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ],
]

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [{ contract: arbitrumsepoliaContract }, { contract: ethereumsepoliaContract }],
        connections,
    }
}
