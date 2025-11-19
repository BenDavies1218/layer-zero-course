# Lesson 02 — Building Your First OApp

In this lesson, you'll build a simple cross-chain messaging application using LayerZero V2's OApp standard. We'll create a contract that sends messages between chains, deploy it to testnets, and execute cross-chain transactions.

## What We're Building

**SimpleMessenger** - A contract that:

- Sends string messages to the same contract on another chain
- Receives and stores messages from other chains
- Tracks message history and counts sent and received messages

## Prerequisites

Before starting, ensure you have:

- run pnpm install
- populated the .env file

## Understanding the Contract Structure

Every OApp needs three core components:

1. **Inheritance**: Extend `OApp` and `OAppOptionsType3`
2. **Send Logic**: Implement a function that calls `_lzSend()`
3. **Receive Logic**: Override `_lzReceive()` to handle incoming messages send from the executor

## Step 1. Create a SimpleMessenger.sol contract

Make sure its located in the "contracts" directory (hardhat by default will compile all .sol files in the sub directorys)

```typescript
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleMessenger is OApp, OAppOptionsType3 {

}
```

### Step 2: State Variables

```typescript
  string public lastMessage; // Store the last received message
  uint256 public messagesSent; // Track total messages sent
  uint256 public messagesReceived; // Track total messages received
  mapping(uint256 => string) public messageHistory; // Message history
  uint16 public constant SEND = 1; // Define message type for enforced options

  // Events for tracking
  event MessageSent(uint32 dstEid, string message, uint256 fee);
  event MessageReceived(string message, uint32 srcEid, bytes32 sender);
```

### Step 3: Constructor

```typescript
  constructor(
        address _endpoint, // Layerzero V2 endpoint address
        address _owner // Owner of the contract
    ) OApp(_endpoint, _owner) Ownable(_owner) {}
```

### Step 4: Send function

The send function needs to:

1. Encode the message
2. Calculate the fee
3. Call `_lzSend()` with proper parameters

```typescript
function sendMessage(
  uint32 _dstEid, // Destination endpoint ID
  string calldata _message, // Message to send
  bytes calldata _options // Execution options (gas limit, etc.)
  ) external payable {

    // Encode the message
    bytes memory _payload = abi.encode(_message);

    // Combine enforced options with caller-provided options
    bytes memory options = combineOptions(_dstEid, SEND, _options);

    // Send the message with the Oapp _lzSend method
    _lzSend(
        _dstEid, // Destination endpoint ID
        _payload, // Encoded message
        options, // Execution options
        MessagingFee(msg.value, 0),  // Fee in native gas token
        payable(msg.sender) // Refund address
    );

    // Update the message sent state
    messagesSent++;

    // emit the messageSent to the destination chain
    emit MessageSent(_dstEid, _message, msg.value);
}
```

### Step 5: Quoting Fees function

Always provide a quote function so users can check costs before sending:

```typescript
function quote(
    uint32 _dstEid, // Destination Endpoint ID
    string calldata _message, // Message to send
    bytes calldata _options, // Execution options (gas limit, etc.)
    bool _payInLzToken // Is it being payed in LZO Token
) external view returns (MessagingFee memory fee) {
    // encode the message
    bytes memory _payload = abi.encode(_message);
    // Create the options object
    bytes memory options = combineOptions(_dstEid, SEND, _options);

    // call the quote method of the Oapp _quote method
    fee = _quote(_dstEid, _payload, options, _payInLzToken);
}
```

### Step 6: Internal Receiving Messages function

Override `_lzReceive()` to handle incoming messages:

```typescript
function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid, // Message GUID (not used here in this example)
    bytes calldata _payload,
    address _executor, // Executor address (not used here in this example)
    bytes calldata _extraData // Extra data (not used here in this example)
) internal override {
    // Decode the message
    string memory message = abi.decode(_payload, (string));

    // Update the last message
    lastMessage = message;

    // increment the messageRecieved by 1
    messagesReceived++;

    // Save the message to the message history
    messageHistory[messagesReceived] = message;

    // emit the messageReceive to the origin chain
    emit MessageReceived(message, _origin.srcEid, _origin.sender);
}
```

## Compile Your Contract

Before deployment, compile your contract to verify there are no errors:

```bash
# Compile all contracts (uses both Forge and Hardhat)
pnpm compile

# Or compile with specific tools
pnpm compile:hardhat  # Hardhat only
pnpm compile:forge    # Foundry only

# If you need to clean and recompile
pnpm clean && pnpm compile
```

This will:

- Compile all Solidity files in `contracts/`
- Generate TypeScript type definitions in `typechain-types/`
- Create artifacts in `artifacts/` and `out/`

## Deployment Process

Deploying an OApp involves three main steps:

1. **Deploy Contracts** - Use `pnpm deploy:contracts` to deploy to multiple chains
2. **Verify Contracts** - Use `pnpm verify` to verify your contracts
3. **Wire Contracts** - Use `pnpm wire` to wire your contracts and set there peers

### Step 1: Deploy Contracts

Run the interactive deployment command:

```bash
pnpm deploy:contract
```

**What happens step-by-step:**

1. **Contract Selection**
   - The script scans your `contracts/` directory for all `.sol` files
   - You'll see a numbered list of available contracts (e.g., SimpleMessenger, RivalOappContract, etc.)
   - Enter the number corresponding to the contract you want to deploy

2. **Deploy Script Update**
   - The script automatically updates `deploy/OApp.ts`, replacing the `contractName` variable with your selection
   - This ensures the correct contract will be deployed

3. **Network Selection** (Interactive)
   - LayerZero's deployment tool will prompt you to select networks
   - You'll see a list of available networks from your `hardhat.config.ts`
   - Use the arrow keys and spacebar to select multiple networks (e.g., Arbitrum Sepolia and Ethereum Sepolia)
   - Press Enter to confirm your selection

4. **Deployment Execution**
   - For each selected network, the script:
     - Connects to the network using your configured RPC URL
     - Retrieves the LayerZero EndpointV2 address for that network
     - Deploys your contract with constructor arguments:
       - `_endpoint`: The LayerZero EndpointV2 address for that chain
       - `_owner`: Your deployer address (from MNEMONIC or PRIVATE_KEY)
     - Waits for deployment confirmation
     - Saves deployment artifacts to `deployments/{network-name}/{ContractName}.json`

5. **Deployment Summary**
   - You'll see output showing:
     - Network name
     - Deployer address
     - Deployed contract address
     - Gas used
     - Transaction hash

**Example Output:**
```
📦 Available contracts:

  1. SimpleMessenger
  2. RivalOappContract

🔍 Select contract number to deploy: 1

✅ Selected contract: SimpleMessenger

📝 Updated deploy/OApp.ts with contract: SimpleMessenger

🚀 Running deployment for SimpleMessenger...

? Select networks to deploy to: (Use arrow keys + space to select, Enter to confirm)
❯ ◯ arbitrum-sepolia
  ◯ ethereum-sepolia
  ◯ base-sepolia

Network: arbitrum-sepolia
Deployer: 0xYourAddress
Deployed contract: SimpleMessenger, network: arbitrum-sepolia, address: 0xABC123...

Network: ethereum-sepolia
Deployer: 0xYourAddress
Deployed contract: SimpleMessenger, network: ethereum-sepolia, address: 0xDEF456...

✅ Deployment complete!
```

**Files Created:**
- `deployments/arbitrum-sepolia/SimpleMessenger.json` - Contract ABI, address, and deployment details
- `deployments/ethereum-sepolia/SimpleMessenger.json` - Contract ABI, address, and deployment details
- `deployments/{network}/solcInputs/*.json` - Compiler input for verification

### Step 2: Verify Contracts

After deployment, verify your contracts on block explorers (Etherscan, Arbiscan, etc.) to make the source code publicly viewable.

**Run verification:**

```bash
pnpm verify
```

**What happens step-by-step:**

1. **Hardhat Verify Task**
   - Uses `@nomicfoundation/hardhat-verify` plugin
   - Reads deployment artifacts from `deployments/` directory

2. **Interactive Network Selection**
   - The command will prompt you to select which network to verify
   - Or you can specify directly: `pnpm hardhat verify --network arbitrum-sepolia 0xYourContractAddress "constructor-arg-1" "constructor-arg-2"`

3. **For Each Contract:**
   - Retrieves the contract address from deployment artifacts
   - Gets constructor arguments (EndpointV2 address and owner)
   - Compiles the contract to generate standard JSON input
   - Submits source code to the appropriate block explorer API

4. **API Key Validation**
   - Checks for API keys in your `.env` file:
     - `ETHERSCAN_API_KEY` - For Ethereum, Arbitrum, Base, Optimism testnets
     - `POLYGONSCAN_API_KEY` - For Polygon Amoy
   - If missing, you'll get an error message

5. **Verification Confirmation**
   - Once verified, you'll receive confirmation with a link to the verified contract
   - The contract's source code, ABI, and compiler settings become publicly viewable

**Manual Verification (Alternative):**

If automated verification fails, you can verify manually:

```bash
# For Arbitrum Sepolia deployment
pnpm hardhat verify --network arbitrum-sepolia \
  0xYourContractAddress \
  "0xEndpointV2Address" \
  "0xYourOwnerAddress"

# For Ethereum Sepolia deployment
pnpm hardhat verify --network ethereum-sepolia \
  0xYourContractAddress \
  "0xEndpointV2Address" \
  "0xYourOwnerAddress"
```

**Example Output:**
```
Verifying contract on Arbiscan...
Successfully submitted source code for contract
contracts/SimpleMessenger.sol:SimpleMessenger at 0xABC123...
for verification on the block explorer. Waiting for verification result...

Successfully verified contract SimpleMessenger on Arbiscan.
https://sepolia.arbiscan.io/address/0xABC123...#code

Verifying contract on Etherscan...
Successfully verified contract SimpleMessenger on Etherscan.
https://sepolia.etherscan.io/address/0xDEF456...#code
```

**Troubleshooting Verification:**

- **"Missing API Key"**: Add the required API key to your `.env` file
- **"Already Verified"**: Contract was previously verified, you can skip this
- **"Compiler version mismatch"**: Ensure your `hardhat.config.ts` Solidity version matches the deployment
- **"Constructor arguments mismatch"**: Double-check the EndpointV2 and owner addresses

### Step 3: Wire Contracts (Configure Cross-Chain Connections)

After deployment, contracts need to be "wired" to establish trusted peer relationships and configure messaging parameters.

**Run the interactive wiring tool:**

```bash
pnpm wire
```

**What happens step-by-step:**

1. **Deployment Scanning**
   - Scans `deployments/` directory for all deployed contracts
   - Reads deployment JSON files to extract:
     - Contract name
     - Network name
     - Contract address
     - Endpoint ID (EID)

2. **Contract Selection**
   - Shows a list of deployed contracts with deployment counts
   - Example: `SimpleMessenger (2 deployments)`
   - If only one contract type exists, it auto-selects
   - Otherwise, prompts you to select which contract to configure

3. **Deployment Display**
   - Shows all deployments for the selected contract:
     ```
     📦 Deployments for SimpleMessenger:

        1. Arbitrum Sepolia
           Network: arbitrum-sepolia
           Address: 0xABC123...
           EID: 40231

        2. Ethereum Sepolia
           Network: ethereum-sepolia
           Address: 0xDEF456...
           EID: 40161
     ```

4. **Pathway Calculation**
   - Calculates number of bidirectional pathways
   - Formula: `n * (n-1) / 2` where n = number of deployments
   - Example: 2 deployments = 1 pathway (A↔B)
   - Example: 3 deployments = 3 pathways (A↔B, A↔C, B↔C)

5. **Gas Limit Configuration**
   - Prompts: `⛽ Enter gas limit for _lzReceive execution (default: 200000):`
   - This sets the minimum gas that will be available when your `_lzReceive()` function executes on the destination chain
   - Recommended: Profile your `_lzReceive()` function and add 20-30% buffer
   - For SimpleMessenger, 200,000 is sufficient for basic string storage

6. **DVN Configuration** (Default Settings Applied)
   - Uses default configuration:
     - Required DVNs: `['LayerZero Labs']`
     - Optional DVNs: `[]`
     - Confirmations: `1`
   - DVNs (Decentralized Verifier Networks) verify cross-chain messages
   - LayerZero Labs DVN is the default verifier for testnets

7. **Config File Generation**
   - Generates TypeScript configuration file at:
     `deployments/peer-configurations/{ContractName}.config.ts`
   - Contains:
     - Contract definitions for each network with EIDs
     - Enforced options (gas limits)
     - Pathway configurations (peers, DVNs, confirmations)
   - If file exists, prompts to overwrite

8. **Config File Structure** (Example):
   ```typescript
   import { EndpointId } from '@layerzerolabs/lz-definitions'
   import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

   const arbitrumContract: OmniPointHardhat = {
       eid: EndpointId.ARBSEP_V2_TESTNET,
       contractName: 'SimpleMessenger',
   }

   const ethereumContract: OmniPointHardhat = {
       eid: EndpointId.SEPOLIA_V2_TESTNET,
       contractName: 'SimpleMessenger',
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
           arbitrumContract,
           ethereumContract,
           [['LayerZero Labs'], []],
           [1, 1],
           [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
       ],
   ]
   ```

9. **Wiring Execution Prompt**
   - Asks: `🔧 Wire the OApp connections now? (Y/n):`
   - If you select No, the config is saved and you can wire later
   - If you select Yes, proceeds to execute wiring transactions

10. **Wiring Transaction Execution** (If confirmed)
    - Runs: `pnpm hardhat lz:oapp:wire --oapp-config deployments/peer-configurations/{ContractName}.config.ts`
    - For each pathway, LayerZero CLI:

      **a) Prompts for transaction signing:**
      - Shows proposed configuration changes
      - Asks which network to sign transactions on
      - Lists all required transactions (setPeer, setEnforcedOptions, setConfig for DVNs, etc.)

      **b) Executes transactions on each chain:**
      - `setPeer(dstEid, peerAddress)` - Registers peer contract on destination chain
      - `setEnforcedOptions(dstEid, msgType, options)` - Sets minimum execution gas
      - `setConfig(...)` - Configures DVNs and confirmations for message verification

      **c) Waits for confirmations:**
      - Each transaction must be mined before proceeding
      - Shows transaction hashes and block explorer links

      **d) Verifies configuration:**
      - Reads back on-chain configuration
      - Compares with desired configuration from config file
      - Reports any discrepancies

11. **Completion Summary**
    ```
    ✅ OApp wiring complete!

    🎉 Your OApp is now configured and ready to send cross-chain messages!

    📝 Next steps:
       - Test sending a message: pnpm hardhat lz:oapp:send
       - Check config: pnpm hardhat lz:oapp:config:get --oapp-config deployments/peer-configurations/SimpleMessenger.config.ts
    ```

**What Wiring Accomplishes:**

✅ **Peer Registration**: Each contract knows the trusted address of its counterpart on other chains

✅ **Enforced Options**: Minimum gas limits are set to prevent execution failures

✅ **DVN Configuration**: Decentralized verifiers are configured to secure message delivery

✅ **Bidirectional Communication**: Both directions of each pathway are configured (A→B and B→A)

**Verify Wiring (Optional):**

Check the current configuration:

```bash
pnpm hardhat lz:oapp:config:get --oapp-config deployments/peer-configurations/SimpleMessenger.config.ts
```

This shows:
- Custom configurations you've set
- Default configurations (inherited from global defaults)
- Active configurations (what's currently enforced)

**Manual Wiring (Alternative):**

If you skipped wiring or need to wire later:

```bash
pnpm hardhat lz:oapp:wire --oapp-config deployments/peer-configurations/SimpleMessenger.config.ts
```

**Updating Configuration:**

If you need to change gas limits or DVN settings:

1. Edit the config file in `deployments/peer-configurations/{ContractName}.config.ts`
2. Run wiring again: `pnpm wire` or `pnpm hardhat lz:oapp:wire --oapp-config {path-to-config}`
3. The tool will only execute transactions for changed settings

**Common Wiring Issues:**

- **"Insufficient funds"**: Ensure deployer has native tokens on all networks
- **"Transaction failed"**: Check gas limits and RPC connectivity
- **"Peer already set"**: This is okay - the tool will skip if already configured
- **"Unauthorized"**: Ensure you're using the owner account specified during deployment

## Sending Your First Cross-Chain Message

Now that everything is deployed and configured, let's send a message!

### Option 1: Using LayerZero Send Task (Recommended)

If you created a custom task for your SimpleMessenger, you can use it directly:

```bash
# Send from Base Sepolia to Arbitrum Sepolia
pnpm hardhat lz:oapp:send --dst-eid 40231 --string "Hello from Base!" --network base-sepolia
```

Replace `lz:oapp:send` with your custom task name if different. This will:

- Automatically quote the gas cost
- Send the message with proper fee
- Return a LayerZero Scan link to track the message

### Option 2: Using Hardhat Console

For more control, use the Hardhat console:

```bash
# Connect to Base Sepolia
npx hardhat console --network base-sepolia
```

Then in the console:

```javascript
// Get contract instance
const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");
const messenger = SimpleMessenger.attach("0xYourBaseSepoliaAddress");

// Get quote for sending to Arbitrum Sepolia
const arbSepoliaEid = 40231; // Arbitrum Sepolia endpoint ID
const message = "Hello from Base Sepolia!";
const options = "0x"; // Use default options

const fee = await messenger.quote(arbSepoliaEid, message, options, false);
console.log(`Fee: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);

// Send the message
const tx = await messenger.sendMessage(arbSepoliaEid, message, options, {
  value: fee.nativeFee,
});
console.log(`Transaction hash: ${tx.hash}`);

// Wait for confirmation
await tx.wait();
console.log("✅ Message sent!");
```

### Option 3: Using Block Explorers

You can also interact directly through block explorers like Etherscan:

1. Go to your contract address on Base Sepolia Etherscan
2. Navigate to "Write Contract"
3. Connect your wallet
4. Call `quote()` first to get the fee
5. Call `sendMessage()` with the message and fee value

### Tracking Your Message

After sending, you can track your cross-chain message on LayerZero Scan:

1. Go to [LayerZero Scan](https://layerzeroscan.com)
2. Enter your transaction hash
3. Watch the message progress through verification and execution

Expected timeline:

- **Verification**: 1-5 minutes (depends on block confirmations)
- **Execution**: 1-2 minutes (after verification)

### Verifying Receipt

Check on the destination chain (Arbitrum Sepolia):

```bash
# Connect to Arbitrum Sepolia
npx hardhat console --network arbitrum-sepolia
```

```javascript
const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");
const messenger = SimpleMessenger.attach("0xYourArbitrumSepoliaAddress");

// Check last received message
const lastMessage = await messenger.lastMessage();
console.log(`Last message: ${lastMessage}`);

// Check message count
const count = await messenger.messagesReceived();
console.log(`Messages received: ${count}`);

// Get specific message from history
const firstMessage = await messenger.messageHistory(1);
console.log(`Message #1: ${firstMessage}`);
```

## Common Issues and Solutions

### Issue 1: "Insufficient fee"

**Problem**: Transaction reverts with insufficient fee error.

**Solution**: Always call `quote()` first and use the returned fee:

```javascript
const fee = await messenger.quote(dstEid, message, options, false);
await messenger.sendMessage(dstEid, message, options, { value: fee.nativeFee });
```

### Issue 2: "Peer not set"

**Problem**: Message fails with "no peer" error.

**Solution**: Ensure you've run `lz:oapp:wire` to configure peers:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

Or manually set peers if needed:

```javascript
await messenger.setPeer(dstEid, ethers.utils.zeroPad(dstAddress, 32));
```

### Issue 3: Message stuck in "Verification"

**Problem**: Message verified but not executed.

**Solution**: Check enforced options in your `layerzero.config.ts`. Increase gas limits:

```typescript
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 300000, // Increased from 200000
    value: 0,
  },
];
```

Then re-run `pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts`.

### Issue 4: "Out of gas" on destination

**Problem**: Execution fails due to insufficient gas.

**Solution**: Update enforced options in `layerzero.config.ts` with sufficient gas for your `_lzReceive()` function, then re-wire.

## Writing Custom Tasks

You can create custom Hardhat tasks to interact with your OApp. Tasks provide a convenient CLI interface for common operations.

### Task Structure

Create task files in the `tasks/` directory:

```typescript
// tasks/myCustomTask.ts
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
  getDeployedContract,
  logNetworkInfo,
  logSuccess,
  logError,
} from "./helpers/taskHelpers";

task("lz:oapp:myTask", "Description of what this task does")
  .addParam("dstEid", "Destination endpoint ID", undefined, types.int)
  .addParam("message", "Message to send", undefined, types.string)
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    try {
      // Log network info
      await logNetworkInfo(hre);

      // Get deployed contract
      const { contract } = await getDeployedContract(hre, "MyOApp");

      // Interact with contract
      const tx = await contract.doSomething(args.dstEid, args.message);
      await tx.wait();

      logSuccess("Task completed!");
    } catch (error) {
      logError("Task failed", error);
      throw error;
    }
  });
```

### Using Helper Functions

The repository includes helper functions in `tasks/helpers/taskHelpers.ts`:

```typescript
// Get deployed contract
const { address, contract } = await getDeployedContract(hre, "MyOApp");

// Log network information
await logNetworkInfo(hre);
// Outputs: Network, Signer address, Balance

// Logging messages
logInfo("Processing...");
logSuccess("Done!");
logWarning("Be careful!");
logError("Failed!", error);

// Get network from endpoint ID
const networkName = getNetworkFromEid(40231); // 'arbitrum-sepolia'

// Get transaction links
const scanLink = getLayerZeroScanLink(txHash, true);
const explorerLink = getBlockExplorerLink("arbitrum-sepolia", txHash);
```

### Example: Query Status Task

Create a task to query your OApp status:

```typescript
// tasks/getStatus.ts
import { task } from "hardhat/config";
import { getDeployedContract, logInfo } from "./helpers/taskHelpers";

task("lz:oapp:status", "Get OApp status and statistics").setAction(
  async (args, hre) => {
    const { address, contract } = await getDeployedContract(hre, "MyOApp");

    const messagesSent = await contract.messagesSent();
    const messagesReceived = await contract.messagesReceived();
    const lastMessage = await contract.lastMessage();

    console.log("\n📊 Contract Status:");
    console.log(`  Address: ${address}`);
    console.log(`  Messages Sent: ${messagesSent}`);
    console.log(`  Messages Received: ${messagesReceived}`);
    console.log(`  Last Message: "${lastMessage}"\n`);

    return {
      address,
      messagesSent: messagesSent.toString(),
      messagesReceived: messagesReceived.toString(),
      lastMessage,
    };
  },
);
```

**Usage:**

```bash
npx hardhat lz:oapp:status --network arbitrum-sepolia
```

### Importing Tasks

Import your task in `hardhat.config.ts`:

```typescript
// hardhat.config.ts
import "./tasks/myCustomTask";
import "./tasks/getStatus";
```

### Complete Task Example

The `tasks/sendMessage.ts` file provides a complete example of a production-ready task. Key features:

1. **Parameter validation** - Validates inputs before execution
2. **Fee quoting** - Automatically quotes gas costs
3. **Transaction handling** - Sends transaction and waits for confirmation
4. **Comprehensive logging** - Shows network info, fees, and transaction details
5. **Error handling** - Catches and logs errors appropriately
6. **Return values** - Returns structured data for programmatic use

**View the complete implementation**: [tasks/sendMessage.ts](../../tasks/sendMessage.ts)

### Task Best Practices

1. **Use TypeScript** for type safety
2. **Validate inputs** before executing transactions
3. **Use helper functions** to avoid code duplication
4. **Provide clear output** with emojis and formatting
5. **Handle errors** gracefully with try-catch blocks
6. **Return structured data** for programmatic use
7. **Follow naming conventions**: `lz:oapp:action` format

### Learn More

For a comprehensive guide on writing tasks, including more examples and patterns, see:

- [Writing Tasks Guide](../../docs/WRITING_TASKS.md)
- [Task Helpers Reference](../../tasks/helpers/taskHelpers.ts)

## Next Steps

Congratulations! You've built and deployed your first OApp. Next, you can:

1. **Add Features**: Store sender addresses, add message replies, implement access controls
2. **Optimize Gas**: Use packed encoding, optimize storage patterns
3. **Multi-Chain**: Deploy to all 5 supported testnets and create a mesh network
4. **Build UIs**: Create a frontend with wagmi/viem to interact with your OApp

In **Lesson 03**, we'll explore advanced patterns like:

- Token transfers with OFT (Omnichain Fungible Tokens)
- Batching multiple messages
- Handling failed messages and retries
- Security best practices and auditing

## Key Takeaways

✅ OApps extend `OApp` and `OAppOptionsType3` for cross-chain messaging

✅ Always implement both send (`_lzSend`) and receive (`_lzReceive`) logic

✅ Peers must be set on both chains for bidirectional communication

✅ Always quote fees before sending messages

✅ Use enforced options to guarantee sufficient gas for execution

✅ Track messages on LayerZero Scan for debugging

✅ Test thoroughly on testnets before mainnet deployment

## Resources

- [LayerZero V2 Documentation](https://docs.layerzero.network/v2) - Official documentation
- [LayerZero Scan](https://layerzeroscan.com) - Track your messages
- [Endpoint Addresses](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts) - All networks
- [Deploying Contracts](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying) - Deployment guide
- [Wiring OApps](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring) - Configuration guide
