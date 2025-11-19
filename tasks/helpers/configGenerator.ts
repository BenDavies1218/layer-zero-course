import { EndpointId } from '@layerzerolabs/lz-definitions'
import fs from 'fs'
import path from 'path'

/**
 * Maps network names (as they appear in deployments folder) to LayerZero Endpoint IDs
 */
export const NETWORK_TO_EID: Record<string, EndpointId> = {
    // Mainnets
    ethereum: EndpointId.ETHEREUM_V2_MAINNET,
    arbitrum: EndpointId.ARBITRUM_V2_MAINNET,
    optimism: EndpointId.OPTIMISM_V2_MAINNET,
    polygon: EndpointId.POLYGON_V2_MAINNET,
    base: EndpointId.BASE_V2_MAINNET,
    bsc: EndpointId.BSC_V2_MAINNET,
    avalanche: EndpointId.AVALANCHE_V2_MAINNET,

    // Testnets
    'ethereum-sepolia': EndpointId.SEPOLIA_V2_TESTNET,
    'arbitrum-sepolia': EndpointId.ARBSEP_V2_TESTNET,
    'optimism-sepolia': EndpointId.OPTSEP_V2_TESTNET,
    'base-sepolia': EndpointId.BASESEP_V2_TESTNET,
    'polygon-amoy': EndpointId.AMOY_V2_TESTNET,
    amoy: EndpointId.AMOY_V2_TESTNET,
}

/**
 * Gets the friendly network name for display
 */
export function getNetworkDisplayName(networkName: string): string {
    const displayNames: Record<string, string> = {
        'ethereum-sepolia': 'Ethereum Sepolia',
        'arbitrum-sepolia': 'Arbitrum Sepolia',
        'optimism-sepolia': 'Optimism Sepolia',
        'base-sepolia': 'Base Sepolia',
        'polygon-amoy': 'Polygon Amoy',
        amoy: 'Polygon Amoy',
        ethereum: 'Ethereum',
        arbitrum: 'Arbitrum',
        optimism: 'Optimism',
        base: 'Base',
        polygon: 'Polygon',
        bsc: 'BSC',
        avalanche: 'Avalanche',
    }
    return displayNames[networkName] || networkName
}

export interface DeploymentInfo {
    network: string
    contractName: string
    address: string
    eid: EndpointId
}

/**
 * Scans the deployments directory and returns deployment information
 */
export async function scanDeployments(contractName?: string): Promise<DeploymentInfo[]> {
    const deploymentsPath = path.join(process.cwd(), 'deployments')
    const deployments: DeploymentInfo[] = []

    // Check if deployments directory exists
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error(`Deployments directory not found at ${deploymentsPath}`)
    }

    // Get all network directories
    const networkDirs = fs.readdirSync(deploymentsPath).filter((dir) => {
        const fullPath = path.join(deploymentsPath, dir)
        return fs.statSync(fullPath).isDirectory() && dir !== 'solcInputs'
    })

    // For each network, find contract deployments
    for (const network of networkDirs) {
        const networkPath = path.join(deploymentsPath, network)
        const files = fs.readdirSync(networkPath).filter((file) => file.endsWith('.json') && file !== '.chainId')

        for (const file of files) {
            const currentContractName = file.replace('.json', '')

            // If contractName is specified, only include that contract
            if (contractName && currentContractName !== contractName) {
                continue
            }

            const filePath = path.join(networkPath, file)
            const deploymentData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

            // Get EID for this network
            const eid = NETWORK_TO_EID[network]
            if (!eid) {
                console.warn(`⚠️  Warning: No EID mapping found for network "${network}" - skipping`)
                continue
            }

            deployments.push({
                network,
                contractName: currentContractName,
                address: deploymentData.address,
                eid,
            })
        }
    }

    return deployments
}

/**
 * Generates LayerZero config code from deployment information
 */
export function generateConfigCode(deployments: DeploymentInfo[], contractName: string): string {
    // Group deployments by contract name
    const contractDeployments = deployments.filter((d) => d.contractName === contractName)

    if (contractDeployments.length === 0) {
        throw new Error(`No deployments found for contract "${contractName}"`)
    }

    // Generate contract definitions
    const contractDefs = contractDeployments
        .map((d) => {
            const varName = `${d.network.replace(/-/g, '')}Contract`
            return `const ${varName}: OmniPointHardhat = {
    eid: EndpointId.${getEidConstantName(d.eid)},
    contractName: '${d.contractName}',
}`
        })
        .join('\n\n')

    // Generate pathways (connect all pairs)
    const pathways: string[] = []
    for (let i = 0; i < contractDeployments.length; i++) {
        for (let j = i + 1; j < contractDeployments.length; j++) {
            const networkA = contractDeployments[i].network.replace(/-/g, '')
            const networkB = contractDeployments[j].network.replace(/-/g, '')
            pathways.push(`    [
        ${networkA}Contract,
        ${networkB}Contract,
        [['LayerZero Labs'], []],
        [1, 1],
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    ]`)
        }
    }

    // Generate contracts array
    const contractsArray = contractDeployments
        .map((d) => {
            const varName = `${d.network.replace(/-/g, '')}Contract`
            return `        { contract: ${varName} }`
        })
        .join(',\n')

    return `import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const contractName = '${contractName}'

${contractDefs}

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 200000,
        value: 0,
    },
]

const pathways: TwoWayConfig[] = [
${pathways.join(',\n')}
]

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [
${contractsArray},
        ],
        connections,
    }
}
`
}

/**
 * Gets the EndpointId constant name from the numeric value
 */
function getEidConstantName(eid: EndpointId): string {
    // Reverse lookup in NETWORK_TO_EID to find the constant name
    for (const [network, id] of Object.entries(NETWORK_TO_EID)) {
        if (id === eid) {
            // Map network name to EndpointId constant name
            const mapping: Record<string, string> = {
                'ethereum-sepolia': 'SEPOLIA_V2_TESTNET',
                'arbitrum-sepolia': 'ARBSEP_V2_TESTNET',
                'optimism-sepolia': 'OPTSEP_V2_TESTNET',
                'base-sepolia': 'BASESEP_V2_TESTNET',
                'polygon-amoy': 'AMOY_V2_TESTNET',
                amoy: 'AMOY_V2_TESTNET',
                ethereum: 'ETHEREUM_V2_MAINNET',
                arbitrum: 'ARBITRUM_V2_MAINNET',
                optimism: 'OPTIMISM_V2_MAINNET',
                base: 'BASE_V2_MAINNET',
                polygon: 'POLYGON_V2_MAINNET',
                bsc: 'BSC_V2_MAINNET',
                avalanche: 'AVALANCHE_V2_MAINNET',
            }
            return mapping[network] || network.toUpperCase() + '_V2_TESTNET'
        }
    }
    return eid.toString()
}
