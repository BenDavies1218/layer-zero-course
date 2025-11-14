# Lesson 02 — Building Your First OApp

In this lesson, you'll build a simple cross-chain messaging application using LayerZero V2's OApp standard. We'll create a contract that sends messages between chains, deploy it to testnets, and execute cross-chain transactions.

## What We're Building

**SimpleMessenger** - A contract that:

- Sends string messages to the same contract on another chain
- Receives and stores messages from other chains
- Tracks message history and counts
- Demonstrates the complete OApp lifecycle

**There is an example contract located** - @/src/contracts/examples/Oapp/ExampleSimpleMessenger.sol

Should you require the complete contract example

## Prerequisites

Before starting, ensure you have:

- run pnpm install
- Setup the .env
- RPC endpoints configured (we're using Alchemy)

## Understanding the Contract Structure

Every OApp needs three core components:

1. **Inheritance**: Extend `OApp` and `OAppOptionsType3`
2. **Send Logic**: Implement functions that call `_lzSend()`
3. **Receive Logic**: Override `_lzReceive()` to handle incoming messages

## Step 1. Create a SimpleMessager.sol contract

make sure its located in the "src/contracts" directory, hardhat by default will search are .sol files in the sub directorys

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
  mapping(uint256 => string) public messageHistory; // Message history (optional, costs more gas)
  uint16 public constant SEND = 1; // Define message type for enforced options

  // Events for tracking
  event MessageSent(uint32 dstEid, string message, uint256 fee);
  event MessageReceived(string message, uint32 srcEid, bytes32 sender);
```

### Step 3: Constructor

```typescript
  constructor(
        address _endpoint,
        address _owner
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

    bytes memory _payload = abi.encode(_message); // Encode the message

    // Combine enforced options with caller-provided options
    bytes memory options = combineOptions(_dstEid, SEND, _options);

    // Send the message
    _lzSend(
        _dstEid, // Destination endpoint ID
        _payload, // Encoded message
        options, // Execution options
        MessagingFee(msg.value, 0),  // Fee in native gas token
        payable(msg.sender) // Refund address
    );

    // Update state
    messagesSent++;

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
    bytes memory _payload = abi.encode(_message);
    bytes memory options = combineOptions(_dstEid, SEND, _options);

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

    // Update state
    lastMessage = message;
    messagesReceived++;
    messageHistory[messagesReceived] = message;

    emit MessageReceived(message, _origin.srcEid, _origin.sender);
}
```

### Step 5: Complete Contract

Here's the complete `SimpleMessenger.sol`:

```typescript
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleMessenger is OApp, OAppOptionsType3 {
    // State variables
    string public lastMessage;
    uint256 public messagesSent;
    uint256 public messagesReceived;
    mapping(uint256 => string) public messageHistory;

    uint16 public constant SEND = 1;

    // Events
    event MessageSent(uint32 dstEid, string message, uint256 fee);
    event MessageReceived(string message, uint32 srcEid, bytes32 sender);

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    function sendMessage(
        uint32 _dstEid,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        bytes memory _payload = abi.encode(_message);
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        _lzSend(
            _dstEid,
            _payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        messagesSent++;
        emit MessageSent(_dstEid, _message, msg.value);
    }

    function quote(
        uint32 _dstEid,
        string calldata _message,
        bytes calldata _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes memory _payload = abi.encode(_message);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, _payload, options, _payInLzToken);
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        string memory message = abi.decode(_payload, (string));

        lastMessage = message;
        messagesReceived++;
        messageHistory[messagesReceived] = message;

        emit MessageReceived(message, _origin.srcEid, _origin.sender);
    }
}
```

## Hardhat compile

## Deployment Process

Deploying an OApp involves three steps:

1. Deploy the contract on each chain
2. Configure peers (trusted remote contracts)
3. Set enforced options (gas limits, etc.)

### Step 1: Deploy Script

Its up to you I you would like to create your own script or use the ones that I have written.

Deployment Script Located "src/scripts/deploy.ts" the script is able to deploy any compiled contract, just replace the contract name with the Oapp contract you want to deploy. In our case it will SimpleMessenger.sol

### Step 2: Deploy to Networks

Deploy to two testnets (e.g., Sepolia and Arbitrum Sepolia):

```bash
# Deploy to Ethereum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network ethereum-sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network arbitrum-sepolia
```

Save both addresses! You'll need them for peer configuration.

### Step 3: Configure Peers

After deployment, you must set peers so contracts trust each other.

Its up to you I you would like to create your own script or use the ones that I have written.

Deployment Script Located "src/scripts/configure.ts" the script is able to deploy any compiled contract, just replace the contract name with the Oapp contract you want to deploy. In our case it will SimpleMessenger.sol

Run on both networks:

```bash
# Configure on Sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia

# Configure on Arbitrum Sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia
```

## Sending Your First Cross-Chain Message

Now that everything is deployed and configured, let's send a message!

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

## Understanding Gas and Options

### Default Options

When you pass `options = "0x"`, LayerZero uses default gas settings. This works for simple messages but might fail for complex operations.

### Custom Options

For more control, use `OptionsBuilder`:

```typescript
import { Options } from "@layerzerolabs/lz-v2-utilities";

// Create options with 200k gas limit
const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0);

// Send with custom options
const tx = await messenger.sendMessage(dstEid, message, options.toHex(), {
  value: fee.nativeFee,
});
```

### Enforced Options

As the contract owner, you can set minimum gas limits:

```javascript
import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";

// Set enforced option: minimum 100k gas for all sends
const enforcedOption = {
  msgType: 1, // SEND type
  options: Options.newOptions().addExecutorLzReceiveOption(100000, 0).toHex(),
};

await messenger.setEnforcedOptions([
  {
    eid: arbSepoliaEid,
    msgType: 1,
    options: enforcedOption.options,
  },
]);
```

Now all sends to Arbitrum Sepolia will use at least 100k gas, even if the caller provides less.

## Testing

Create `test/SimpleMessenger.test.ts`:

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleMessenger } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("SimpleMessenger", function () {
  let messenger: SimpleMessenger;
  let owner: SignerWithAddress;
  let endpoint: string;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Mock endpoint address (in real tests, use a mock endpoint)
    endpoint = "0x6EDCE65403992e310A62460808c4b910D972f10f";

    const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");
    messenger = await SimpleMessenger.deploy(endpoint, owner.address);
    await messenger.deployed();
  });

  it("Should deploy with correct owner", async function () {
    expect(await messenger.owner()).to.equal(owner.address);
  });

  it("Should start with zero messages", async function () {
    expect(await messenger.messagesSent()).to.equal(0);
    expect(await messenger.messagesReceived()).to.equal(0);
  });

  it("Should increment messagesSent when sending", async function () {
    // Note: This will fail without a proper mock endpoint
    // For real testing, use LayerZero's test utilities
    const dstEid = 40231;
    const message = "Test message";

    // This is a simplified test - production tests need proper mocks
    expect(await messenger.messagesSent()).to.equal(0);
  });
});
```

Run tests:

```bash
npx hardhat test
```

For comprehensive testing, use LayerZero's official test utilities with mock endpoints.

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
