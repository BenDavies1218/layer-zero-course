# Writing Hardhat Tasks for LayerZero OApps

This guide explains how to create custom Hardhat tasks for interacting with your LayerZero OApp contracts.

## Table of Contents

- [Task Basics](#task-basics)
- [Helper Functions](#helper-functions)
- [Example: Creating a Send Task](#example-creating-a-send-task)
- [Example: Creating a Query Task](#example-creating-a-query-task)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Task Basics

### Basic Task Structure

Create task files in the `tasks/` directory:

```typescript
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('taskName', 'Task description')
    .addParam('paramName', 'Parameter description', undefined, types.string)
    .addOptionalParam('optionalParam', 'Optional parameter', 'default', types.string)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        // Task implementation
    })
```

### Parameter Types

Hardhat provides several built-in types:

```typescript
import { types } from 'hardhat/config'

// Available types:
types.string    // String parameter
types.boolean   // Boolean flag
types.int       // Integer number
types.float     // Floating point number
types.json      // JSON object
```

### Importing Tasks

Tasks are automatically loaded when imported in `hardhat.config.ts`:

```typescript
// hardhat.config.ts
import './tasks/sendMessage'
import './tasks/queryStatus'
// Tasks are now available
```

## Helper Functions

The `tasks/helpers/taskHelpers.ts` file provides reusable utilities:

### Getting Deployed Contracts

```typescript
import { getDeployedContract } from './helpers/taskHelpers'

const { address, contract } = await getDeployedContract(hre, 'MyOApp')
```

### Logging Network Information

```typescript
import { logNetworkInfo } from './helpers/taskHelpers'

await logNetworkInfo(hre)
// Outputs:
// 🌐 Network: arbitrum-sepolia
// 👤 Signer: 0x1234...
// 💰 Balance: 1.5 ETH
```

### Logging Messages

```typescript
import { logSuccess, logError, logInfo, logWarning } from './helpers/taskHelpers'

logInfo('Processing transaction...')
logSuccess('Transaction confirmed!')
logWarning('Gas price is high')
logError('Transaction failed', error)
```

### Getting Network Information

```typescript
import { getNetworkFromEid, getEidFromNetwork, ENDPOINT_IDS } from './helpers/taskHelpers'

const networkName = getNetworkFromEid(40231) // Returns: 'arbitrum-sepolia'
const eid = getEidFromNetwork('base-sepolia') // Returns: 40245

// All available endpoint IDs
console.log(ENDPOINT_IDS)
```

### Transaction Links

```typescript
import { getLayerZeroScanLink, getBlockExplorerLink } from './helpers/taskHelpers'

const scanLink = getLayerZeroScanLink(txHash, true) // true = testnet
const explorerLink = getBlockExplorerLink('arbitrum-sepolia', txHash)
```

## Example: Creating a Send Task

Here's a complete example of a task that sends cross-chain messages:

```typescript
// tasks/sendMessage.ts
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import {
    getDeployedContract,
    logNetworkInfo,
    logMessagingFee,
    logTransactionDetails,
    getNetworkFromEid,
    logSuccess,
    logError,
    logInfo,
} from './helpers/taskHelpers'

task('lz:oapp:sendMessage', 'Sends a string cross-chain using MyOApp contract')
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('string', 'String to send', undefined, types.string)
    .addOptionalParam('options', 'Execution options (hex string)', '0x', types.string)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            // 1. Log initial information
            await logNetworkInfo(hre)
            logInfo(`Destination: ${getNetworkFromEid(args.dstEid)}`)
            logInfo(`Message: "${args.string}"`)

            // 2. Get deployed contract
            const { contract } = await getDeployedContract(hre, 'MyOApp')

            // 3. Quote the fee
            const fee = await contract.quoteSendString(
                args.dstEid,
                args.string,
                args.options || '0x',
                false
            )
            logMessagingFee(hre, fee)

            // 4. Send the transaction
            const tx = await contract.sendString(args.dstEid, args.string, args.options || '0x', {
                value: fee.nativeFee,
            })

            // 5. Wait for confirmation
            const receipt = await tx.wait()
            await logTransactionDetails(hre, receipt, args.dstEid)

            logSuccess('Message sent successfully!')

            return { txHash: receipt.transactionHash }
        } catch (error) {
            logError('Failed to send message', error)
            throw error
        }
    })
```

**Usage:**

```bash
npx hardhat lz:oapp:sendMessage \
  --dst-eid 40161 \
  --string "Hello World" \
  --network arbitrum-sepolia
```

## Example: Creating a Query Task

Create a read-only task to query contract state:

```typescript
// tasks/getStatus.ts
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { getDeployedContract, logInfo, logError } from './helpers/taskHelpers'

task('lz:oapp:status', 'Get OApp status and statistics')
    .addOptionalParam('contract', 'Contract name', 'MyOApp', types.string)
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const { address, contract } = await getDeployedContract(hre, args.contract)

            logInfo(`Contract: ${args.contract} at ${address}`)

            // Query contract state
            const lastMessage = await contract.lastMessage()
            const messagesSent = await contract.messagesSent()
            const messagesReceived = await contract.messagesReceived()

            console.log('\n📊 Contract Status:')
            console.log(`  Messages Sent: ${messagesSent}`)
            console.log(`  Messages Received: ${messagesReceived}`)
            console.log(`  Last Message: "${lastMessage}"`)

            return {
                address,
                messagesSent: messagesSent.toString(),
                messagesReceived: messagesReceived.toString(),
                lastMessage,
            }
        } catch (error) {
            logError('Failed to get status', error)
            throw error
        }
    })
```

**Usage:**

```bash
npx hardhat lz:oapp:status --network arbitrum-sepolia
```

## Best Practices

### 1. Use TypeScript

Always use TypeScript for type safety:

```typescript
interface TaskArgs {
    dstEid: number
    string: string
    options?: string
}

.setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
    // args are now typed
})
```

### 2. Error Handling

Always wrap task logic in try-catch:

```typescript
.setAction(async (args, hre) => {
    try {
        // Task logic
    } catch (error) {
        logError('Task failed', error)
        throw error // Re-throw to show in Hardhat output
    }
})
```

### 3. Validate Inputs

Validate parameters before executing:

```typescript
.setAction(async (args, hre) => {
    // Validate endpoint ID
    if (!isValidEid(args.dstEid)) {
        throw new Error(`Invalid endpoint ID: ${args.dstEid}`)
    }

    // Validate message
    if (!args.string || args.string.trim().length === 0) {
        throw new Error('Message cannot be empty')
    }

    // Continue with task...
})
```

### 4. Provide Clear Output

Use consistent formatting for output:

```typescript
console.log('\n' + '='.repeat(60))
console.log('🚀 Task Name')
console.log('='.repeat(60) + '\n')

// Task operations...

logSuccess('Task completed!')
console.log('\n' + '='.repeat(60) + '\n')
```

### 5. Return Useful Data

Return structured data that can be used programmatically:

```typescript
return {
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    scanLink: getLayerZeroScanLink(receipt.transactionHash, true),
}
```

## Common Patterns

### Pattern 1: Transaction Task

For tasks that submit transactions:

```typescript
task('task-name', 'Description')
    .addParam('param', 'Description')
    .setAction(async (args, hre) => {
        // 1. Get contract
        const { contract } = await getDeployedContract(hre, 'ContractName')

        // 2. Quote fee (if needed)
        const fee = await contract.quoteSomething(...)

        // 3. Send transaction
        const tx = await contract.doSomething(..., { value: fee })

        // 4. Wait for confirmation
        const receipt = await tx.wait()

        // 5. Log results
        await logTransactionDetails(hre, receipt, dstEid)

        return { txHash: receipt.transactionHash }
    })
```

### Pattern 2: Query Task

For tasks that only read data:

```typescript
task('task-name', 'Description')
    .addParam('param', 'Description')
    .setAction(async (args, hre) => {
        // 1. Get contract
        const { contract } = await getDeployedContract(hre, 'ContractName')

        // 2. Query data
        const data = await contract.getData(...)

        // 3. Format and display
        console.log('Results:', data)

        return { data }
    })
```

### Pattern 3: Batch Operation Task

For tasks that perform multiple operations:

```typescript
task('task-name', 'Description')
    .addParam('addresses', 'Comma-separated addresses', undefined, types.string)
    .setAction(async (args, hre) => {
        const addressList = args.addresses.split(',')
        const results = []

        for (const address of addressList) {
            // Process each address
            logInfo(`Processing ${address}...`)
            // ... do work
            results.push({ address, status: 'success' })
        }

        return { results }
    })
```

### Pattern 4: Interactive Task

For tasks that require user confirmation:

```typescript
task('task-name', 'Description')
    .addParam('param', 'Description')
    .setAction(async (args, hre) => {
        // Show what will happen
        console.log('This will:')
        console.log('  1. Do something')
        console.log('  2. Do something else')

        // In production, use inquirer or similar
        logWarning('Proceeding with operation...')

        // Continue with task...
    })
```

## Testing Your Tasks

Test tasks manually before committing:

```bash
# Test with different networks
npx hardhat your-task --param value --network arbitrum-sepolia
npx hardhat your-task --param value --network base-sepolia

# Test error handling
npx hardhat your-task --param invalid

# Test help output
npx hardhat help your-task
```

## Additional Resources

- [Hardhat Tasks Documentation](https://hardhat.org/guides/create-task.html)
- [LayerZero V2 Docs](https://docs.layerzero.network/v2)
- [Example Tasks](../tasks/) - See existing tasks for reference

## Task Naming Convention

Follow this convention for task names:

- **Namespace**: `lz:oapp:` for LayerZero OApp tasks
- **Action**: Use verbs like `send`, `get`, `set`, `list`
- **Resource**: What the task operates on

Examples:
- `lz:oapp:sendMessage` - Send a message
- `lz:oapp:getStatus` - Get contract status
- `lz:oapp:setPeer` - Set a peer address
- `lz:oapp:listPeers` - List all configured peers
