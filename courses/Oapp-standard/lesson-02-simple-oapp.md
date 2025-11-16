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

## Step 1. Create a SimpleMessager.sol contract

Make sure its located in the "src/contracts" directory, (hardhat by default will compile all .sol files in the sub directorys)

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
    bytes32 _guid,
    bytes calldata _payload,
    address _executor,
    bytes calldata _extraData
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
# Compile all contracts
npx hardhat compile

# If you need to clean and recompile
npx hardhat clean && npx hardhat compile
```

This will:

- Compile all Solidity files in `src/contracts/`
- Generate TypeScript type definitions in `typechain-types/`
- Create artifacts in `src/artifacts/`

## Should you require the complete contract example

There is the complete code here - [View Here](../../src/contracts/lessons/Oapp/ExampleSimpleMessenger.sol)

## Deployment Process

Deploying an OApp involves three main steps:

1. **Deploy** the contract on each chain
2. **Configure peers** (trusted remote contracts)
3. **Set enforced options** (optional: gas limits, etc.)

### Step 1: Configure the Deploy Script

Open `src/scripts/deploy.ts` and update the contract name:

```typescript
async function main() {
  // Enter the contract name to deploy
  const contractName = "SimpleMessenger"; // Update this line

  const result = await deployOApp({
    contractName,
    constructorArgs: [], // Endpoint and owner are added automatically
    verify: true, // Set to true to verify on block explorer
  });
}
```

**How it works:**

- The script automatically injects the LayerZero endpoint address for the network
- The deployer's address is automatically set as the contract owner
- Optional: Enable contract verification on Etherscan

### Step 2: Deploy to Networks

Deploy to two or more testnets. For example, Sepolia and Arbitrum Sepolia:

```bash
# Deploy to Ethereum Sepolia
npx hardhat run src/scripts/deploy.ts --network ethereum-sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run src/scripts/deploy.ts --network arbitrum-sepolia
```

**Important:** Save the deployed addresses! You'll see output like:

```
📋 Deployment Summary:
   Contract: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   Network: ethereum-sepolia
   Chain ID: 11155111
   Block: 5234567
   Tx: 0xabc123...
```

Copy these addresses - you'll need them for the next step.

### Step 3: Configure Peers

After deploying to all desired networks, configure the peer relationships.

Open `src/scripts/configure.ts` and update with your deployed addresses:

```typescript
async function main() {
  // UPDATE THESE WITH YOUR DEPLOYED ADDRESSES
  const deployments = {
    "ethereum-sepolia": "0xYourSepoliaAddress",
    "arbitrum-sepolia": "0xYourArbitrumAddress",
    // Only include networks where you've deployed
    "optimism-sepolia": "0x0000000000000000000000000000000000000000", // Leave as 0x0 if no contract was deployed to this network
    "base-sepolia": "0x0000000000000000000000000000000000000000",
    "polygon-amoy": "0x0000000000000000000000000000000000000000",
  };

  // Enter the contract name to configure
  const contractName = "SimpleMessenger"; // Update this line
}
```

**Run the configuration on each network:**

```bash
# Configure on Sepolia
npx hardhat run src/scripts/configure.ts --network ethereum-sepolia

# Configure on Arbitrum Sepolia
npx hardhat run src/scripts/configure.ts --network arbitrum-sepolia
```

**What this does:**

- Sets up trusted peer relationships between your contracts
- Only includes networks with valid (non-zero) addresses
- Skips peers that are already configured
- Shows a summary of successful and failed configurations

**Important:** You must run the configure script on **each network** where you deployed. For bidirectional messaging between Sepolia and Arbitrum, you need to configure peers on both chains:

- On Sepolia: Sets Arbitrum contract as a trusted peer
- On Arbitrum: Sets Sepolia contract as a trusted peer

## Sending Your First Cross-Chain Message

Now that everything is deployed and configured, let's send a message!

You have a many options for interacting with your contract this course shows you how to use the hardhat console, sometimes I prefer to use browser based GUI's to interact with the contract such as remix IDE or etherscan.

### Using Hardhat Console

```bash
# Connect to Sepolia
npx hardhat console --network ethereum-sepolia
```

Then in the console:

```javascript
// Get contract instance
const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");
const messenger = SimpleMessenger.attach("0xYourSepoliaAddress");

// Get quote for sending to Arbitrum Sepolia
const arbSepoliaEid = 40231; // Arbitrum Sepolia endpoint ID
const message = "Hello from Sepolia!";
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
const messenger = SimpleMessenger.attach("0xYourArbSepoliaAddress");

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

**Solution**: Ensure you've called `setPeer()` on both source and destination:

```javascript
// On source chain
await messenger.setPeer(dstEid, ethers.utils.zeroPad(dstAddress, 32));

// On destination chain
await messenger.setPeer(srcEid, ethers.utils.zeroPad(srcAddress, 32));
```

### Issue 3: Message stuck in "Verification"

**Problem**: Message verified but not executed.

**Solution**: Check gas limits. Increase gas in options:

```javascript
const options = Options.newOptions().addExecutorLzReceiveOption(300000, 0);
```

### Issue 4: "Out of gas" on destination

**Problem**: Execution fails due to insufficient gas.

**Solution**: Set enforced options with sufficient gas:

```javascript
await messenger.setEnforcedOptions([
  {
    eid: dstEid,
    msgType: 1,
    options: Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex(),
  },
]);
```

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

- [SimpleMessenger.sol](../../src/contracts/omnichain-messaging/SimpleMessenger.sol) - Complete contract code
- [Deploy Script](./utils/deploy-simple-messenger.ts) - Deployment automation
- [Configure Script](./utils/configure-peers.ts) - Peer configuration
- [LayerZero Scan](https://layerzeroscan.com) - Track your messages
- [Endpoint Addresses](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts) - All networks
