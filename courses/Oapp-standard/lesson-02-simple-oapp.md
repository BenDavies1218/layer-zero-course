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

Deploying an OApp involves two main steps:

1. **Deploy** the contract on each chain using `lz:deploy`
2. **Wire connections** using `lz:oapp:wire` to configure peers and options automatically

### Step 1: Using a Deployment Script

Update the contract name in the deploy script located here

View `deploy/OApp.ts` [View Here](../../deploy/OApp.ts)

This script will be used to deploy all Oapps

### Step 2: Deploy to Networks

```bash
# Deploy using the contract tag
pnpm hardhat lz:deploy --tags OApp
```

You'll be prompted to select which networks to deploy to. Choose at least two networks (e.g., Base Sepolia and Arbitrum Sepolia).

**The deployment will:**

- Automatically inject the correct LayerZero Endpoint V2 address for each network
- Set the deployer as the contract owner
- Show deployment addresses and transaction hashes
- Save deployment information in `deployments/` folder

### Step 3: Create LayerZero Config

Create or update `layerzero.config.ts` with your contract configuration:

```typescript
import { EndpointId } from "@layerzerolabs/lz-definitions";
import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";
import {
  TwoWayConfig,
  generateConnectionsConfig,
} from "@layerzerolabs/metadata-tools";
import {
  OAppEnforcedOption,
  OmniPointHardhat,
} from "@layerzerolabs/toolbox-hardhat";

const baseContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: "SimpleMessenger",
};

const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.ARBSEP_V2_TESTNET,
  contractName: "SimpleMessenger",
};

// Set enforced options for gas limits
const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
  {
    msgType: 1,
    optionType: ExecutorOptionType.LZ_RECEIVE,
    gas: 200000, // Gas for _lzReceive execution
    value: 0,
  },
];

// Define pathways between chains
const pathways: TwoWayConfig[] = [
  [
    baseContract,
    arbitrumContract,
    [["LayerZero Labs"], []], // DVN configuration
    [1, 1], // Block confirmations
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
  ],
];

export default async function () {
  const connections = await generateConnectionsConfig(pathways);
  return {
    contracts: [{ contract: baseContract }, { contract: arbitrumContract }],
    connections,
  };
}
```

### Step 4: Wire the Connections

Run the wiring command to configure peers, DVNs, and enforced options automatically:

```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

**This single command will:**

- Set peers on both chains (bidirectional)
- Configure DVNs for message verification
- Set enforced options (gas limits)
- Configure send/receive libraries
- Show you what changes will be made before executing

**Important:** Review the proposed changes carefully before confirming. The wiring task only applies NEW changes, so it's safe to run multiple times.

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
