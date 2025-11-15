# Lesson 04 — Multichain Messaging (Batch Send Pattern)

In this lesson, you'll learn how to build an OApp that broadcasts messages to multiple chains simultaneously. This is the batch send pattern (one-to-many), essential for multi-chain state synchronization, governance, and notifications.

## What You'll Build

**MultichainBroadcaster OApp** - A contract that:

- Broadcasts messages to multiple chains in a single transaction
- Receives messages from any configured chain
- Tracks message statistics per chain
- Handles variable fee calculations for multiple destinations
- Demonstrates efficient multi-chain communication

## Understanding the Batch Send Pattern

![Batch Send Pattern](../../src/diagrams/batch-send-pattern.svg)

### How It Works

1. **User calls `broadcast()` on Chain A** with an array of destination chains
2. **Loop through destinations** and call `_lzSend()` for each
3. **Each destination receives** the message independently
4. **Parallel delivery** - messages don't depend on each other

### Use Cases

- **Multi-Chain Governance**: Synchronize voting results across all chains
- **Price Oracle Updates**: Distribute price feeds to multiple chains
- **Token Launches**: Announce new tokens on all supported chains
- **Event Broadcasting**: Notify all chains of important events
- **State Synchronization**: Keep global state consistent across chains
- **Emergency Pauses**: Instantly pause contracts across all chains

## Prerequisites

Before starting:

- Complete Lesson 02 (SimpleMessenger)
- Complete Lesson 03 (PingPong ABA pattern)
- Understand gas fee calculations
- Have testnet tokens on 3+ chains

## Contract Architecture

### Key Features

1. **Dynamic Destination Lists**: Send to any combination of chains
2. **Fee Aggregation**: Calculate total fees for all destinations
3. **Per-Chain Statistics**: Track messages sent/received per chain
4. **Flexible Message Types**: Support different message categories
5. **Gas Optimization**: Efficient loops and storage patterns

## Step 1: Create MultichainBroadcaster.sol

Create `src/contracts/Oapp/MultichainBroadcaster.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MultichainBroadcaster is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    // Message categories
    enum Category {
        GENERAL,
        GOVERNANCE,
        EMERGENCY,
        PRICE_UPDATE
    }

    // Global counters
    uint256 public totalBroadcasts;
    uint256 public totalMessagesReceived;

    // Per-chain statistics
    mapping(uint32 => uint256) public messagesSentTo; // eid => count
    mapping(uint32 => uint256) public messagesReceivedFrom; // eid => count

    // Message history
    struct Message {
        Category category;
        string content;
        uint256 timestamp;
        uint32 srcEid;
    }

    Message[] public messageHistory;

    // Latest message by category
    mapping(Category => string) public latestByCategory;

    // Message type for enforced options
    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BroadcastSent(
        uint32[] dstEids,
        Category category,
        string message,
        uint256 totalFee
    );

    event MessageReceived(
        uint32 indexed srcEid,
        Category category,
        string message,
        uint256 timestamp
    );

    event SingleMessageSent(
        uint32 indexed dstEid,
        Category category,
        string message,
        uint256 fee
    );

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Broadcast a message to multiple chains
     * @dev Sends the same message to all specified destinations
     * @param _dstEids Array of destination endpoint IDs
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options (same for all destinations)
     */
    function broadcast(
        uint32[] calldata _dstEids,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        require(_dstEids.length > 0, "No destinations specified");

        // Encode the message once (gas optimization)
        bytes memory payload = abi.encode(_category, _message, block.timestamp);

        uint256 totalFeeRequired = 0;

        // Send to each destination
        for (uint256 i = 0; i < _dstEids.length; i++) {
            uint32 dstEid = _dstEids[i];

            // Combine options for this destination
            bytes memory options = combineOptions(dstEid, SEND, _options);

            // Calculate fee for this destination
            MessagingFee memory fee = _quote(dstEid, payload, options, false);

            // Accumulate total fee
            totalFeeRequired += fee.nativeFee;

            // Send the message
            _lzSend(
                dstEid,
                payload,
                options,
                MessagingFee(fee.nativeFee, 0),
                payable(msg.sender) // Refund excess to sender
            );

            // Update statistics
            messagesSentTo[dstEid]++;

            emit SingleMessageSent(dstEid, _category, _message, fee.nativeFee);
        }

        // Verify sufficient payment
        require(msg.value >= totalFeeRequired, "Insufficient fee provided");

        // Refund excess
        if (msg.value > totalFeeRequired) {
            payable(msg.sender).transfer(msg.value - totalFeeRequired);
        }

        totalBroadcasts++;

        emit BroadcastSent(_dstEids, _category, _message, totalFeeRequired);
    }

    /**
     * @notice Send a message to a single destination
     * @param _dstEid Destination endpoint ID
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options
     */
    function sendToChain(
        uint32 _dstEid,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        bytes memory payload = abi.encode(_category, _message, block.timestamp);
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        _lzSend(
            _dstEid,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        messagesSentTo[_dstEid]++;

        emit SingleMessageSent(_dstEid, _category, _message, msg.value);
    }

    /**
     * @notice Quote total fee for broadcasting to multiple chains
     * @param _dstEids Array of destination endpoint IDs
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options
     * @return totalFee Total fee in native token
     */
    function quoteBroadcast(
        uint32[] calldata _dstEids,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external view returns (uint256 totalFee) {
        bytes memory payload = abi.encode(_category, _message, block.timestamp);

        for (uint256 i = 0; i < _dstEids.length; i++) {
            bytes memory options = combineOptions(_dstEids[i], SEND, _options);
            MessagingFee memory fee = _quote(_dstEids[i], payload, options, false);
            totalFee += fee.nativeFee;
        }
    }

    /**
     * @notice Quote fee for a single destination
     * @param _dstEid Destination endpoint ID
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options
     * @return fee Messaging fee
     */
    function quoteSingle(
        uint32 _dstEid,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_category, _message, block.timestamp);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, payload, options, false);
    }

    /**
     * @notice Get message history
     * @param _startIndex Start index
     * @param _count Number of messages to retrieve
     * @return messages Array of messages
     */
    function getMessageHistory(
        uint256 _startIndex,
        uint256 _count
    ) external view returns (Message[] memory messages) {
        require(_startIndex < messageHistory.length, "Invalid start index");

        uint256 end = _startIndex + _count;
        if (end > messageHistory.length) {
            end = messageHistory.length;
        }

        messages = new Message[](end - _startIndex);
        for (uint256 i = _startIndex; i < end; i++) {
            messages[i - _startIndex] = messageHistory[i];
        }
    }

    /**
     * @notice Get total number of messages in history
     * @return count Total message count
     */
    function getMessageCount() external view returns (uint256 count) {
        return messageHistory.length;
    }

    /**
     * @notice Get statistics for a specific chain
     * @param _eid Endpoint ID
     * @return sent Messages sent to this chain
     * @return received Messages received from this chain
     */
    function getChainStats(
        uint32 _eid
    ) external view returns (uint256 sent, uint256 received) {
        sent = messagesSentTo[_eid];
        received = messagesReceivedFrom[_eid];
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Handle incoming messages
     * @dev Stores message in history and updates statistics
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the message
        (Category category, string memory content, uint256 timestamp) = abi.decode(
            _payload,
            (Category, string, uint256)
        );

        // Store in history
        messageHistory.push(
            Message({
                category: category,
                content: content,
                timestamp: timestamp,
                srcEid: _origin.srcEid
            })
        );

        // Update latest by category
        latestByCategory[category] = content;

        // Update statistics
        messagesReceivedFrom[_origin.srcEid]++;
        totalMessagesReceived++;

        emit MessageReceived(_origin.srcEid, category, content, timestamp);
    }
}
```

## Key Implementation Details

### 1. Fee Aggregation

```solidity
uint256 totalFeeRequired = 0;

for (uint256 i = 0; i < _dstEids.length; i++) {
    MessagingFee memory fee = _quote(dstEid, payload, options, false);
    totalFeeRequired += fee.nativeFee;
    // ... send message
}

require(msg.value >= totalFeeRequired, "Insufficient fee provided");
```

Calculate and verify total fees before sending.

### 2. Gas Optimization

```solidity
// Encode payload once, use for all destinations
bytes memory payload = abi.encode(_category, _message, block.timestamp);

for (uint256 i = 0; i < _dstEids.length; i++) {
    // Reuse same payload for all sends
    _lzSend(dstEid, payload, options, fee, refundAddress);
}
```

### 3. Per-Chain Statistics

```solidity
mapping(uint32 => uint256) public messagesSentTo;
mapping(uint32 => uint256) public messagesReceivedFrom;

messagesSentTo[dstEid]++;
messagesReceivedFrom[_origin.srcEid]++;
```

Track activity per chain for analytics.

### 4. Message Categorization

```solidity
enum Category {
    GENERAL,
    GOVERNANCE,
    EMERGENCY,
    PRICE_UPDATE
}

mapping(Category => string) public latestByCategory;
```

Organize messages by type for easy retrieval.

## Compile and Deploy

### Step 1: Compile

```bash
npx hardhat compile
```

### Step 2: Deploy to Multiple Chains

Update `src/scripts/deploy.ts`:

```typescript
const contractName = "MultichainBroadcaster";
```

Deploy to at least 3 chains:

```bash
# Deploy to Sepolia
npx hardhat run src/scripts/deploy.ts --network ethereum-sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run src/scripts/deploy.ts --network arbitrum-sepolia

# Deploy to Optimism Sepolia
npx hardhat run src/scripts/deploy.ts --network optimism-sepolia

# Deploy to Base Sepolia
npx hardhat run src/scripts/deploy.ts --network base-sepolia
```

### Step 3: Configure Peers

Update `src/scripts/configure.ts`:

```typescript
const deployments = {
  "ethereum-sepolia": "0xYourSepoliaAddress",
  "arbitrum-sepolia": "0xYourArbitrumAddress",
  "optimism-sepolia": "0xYourOptimismAddress",
  "base-sepolia": "0xYourBaseAddress",
};

const contractName = "MultichainBroadcaster";
```

Run on all chains:

```bash
npx hardhat run src/scripts/configure.ts --network ethereum-sepolia
npx hardhat run src/scripts/configure.ts --network arbitrum-sepolia
npx hardhat run src/scripts/configure.ts --network optimism-sepolia
npx hardhat run src/scripts/configure.ts --network base-sepolia
```

## Testing Multichain Broadcasting

### Step 1: Quote Broadcast Fee

```bash
npx hardhat console --network ethereum-sepolia
```

```javascript
const MultichainBroadcaster = await ethers.getContractFactory(
  "MultichainBroadcaster"
);
const broadcaster = MultichainBroadcaster.attach("0xYourSepoliaAddress");

// Define destination chains
const arbSepoliaEid = 40231;
const opSepoliaEid = 40232;
const baseSepoliaEid = 40245;

const dstEids = [arbSepoliaEid, opSepoliaEid, baseSepoliaEid];
const category = 0; // GENERAL
const message = "Hello from Sepolia to all chains!";
const options = "0x";

// Quote total fee
const totalFee = await broadcaster.quoteBroadcast(
  dstEids,
  category,
  message,
  options
);

console.log(`Total fee: ${ethers.utils.formatEther(totalFee)} ETH`);
console.log(`Broadcasting to ${dstEids.length} chains`);
```

### Step 2: Broadcast to Multiple Chains

```javascript
const tx = await broadcaster.broadcast(dstEids, category, message, options, {
  value: totalFee,
});

console.log(`Broadcast tx: ${tx.hash}`);
await tx.wait();

console.log("✅ Broadcast sent to all chains!");
```

### Step 3: Track on LayerZero Scan

Visit [LayerZero Scan](https://layerzeroscan.com) and search for your transaction.

You'll see **three separate messages**:
- Sepolia → Arbitrum
- Sepolia → Optimism
- Sepolia → Base

Each message is independent and may arrive at different times.

### Step 4: Verify on Destination Chains

**On Arbitrum:**

```bash
npx hardhat console --network arbitrum-sepolia
```

```javascript
const broadcaster = MultichainBroadcaster.attach("0xYourArbitrumAddress");

const received = await broadcaster.totalMessagesReceived();
console.log(`Messages received: ${received}`);

// Get the latest message
const messageCount = await broadcaster.getMessageCount();
if (messageCount > 0) {
  const latestMessage = await broadcaster.messageHistory(messageCount - 1);
  console.log(`Latest message: ${latestMessage.content}`);
  console.log(`Category: ${latestMessage.category}`);
  console.log(`From chain: ${latestMessage.srcEid}`);
}
```

Repeat for Optimism and Base to verify all received the broadcast.

## Advanced Usage Examples

### Example 1: Emergency Pause Broadcast

```javascript
// Broadcast emergency pause to all chains
const category = 2; // EMERGENCY
const message = "PAUSE: Security incident detected";

const fee = await broadcaster.quoteBroadcast(allChains, category, message, "0x");

await broadcaster.broadcast(allChains, category, message, "0x", {
  value: fee,
});
```

### Example 2: Governance Vote Result

```javascript
// Broadcast governance result
const category = 1; // GOVERNANCE
const message = JSON.stringify({
  proposalId: 42,
  result: "APPROVED",
  votes: { for: 1000000, against: 50000 },
});

await broadcaster.broadcast(allChains, category, message, "0x", {
  value: fee,
});
```

### Example 3: Price Oracle Update

```javascript
// Broadcast price update
const category = 3; // PRICE_UPDATE
const message = JSON.stringify({
  asset: "ETH",
  price: 3500.5,
  timestamp: Date.now(),
});

await broadcaster.broadcast(allChains, category, message, "0x", {
  value: fee,
});
```

## Gas Optimization Strategies

### 1. Batch Processing

Send to multiple chains in one transaction instead of separate transactions:

```javascript
// ✅ EFFICIENT: One transaction, multiple sends
await broadcaster.broadcast([eid1, eid2, eid3], category, msg, options, {
  value: totalFee,
});

// ❌ INEFFICIENT: Multiple transactions
await broadcaster.sendToChain(eid1, category, msg, options, { value: fee1 });
await broadcaster.sendToChain(eid2, category, msg, options, { value: fee2 });
await broadcaster.sendToChain(eid3, category, msg, options, { value: fee3 });
```

### 2. Optimize Payload Size

```solidity
// Use packed encoding for smaller payloads
bytes memory payload = abi.encodePacked(_category, _message);

// Instead of full encoding
bytes memory payload = abi.encode(_category, _message, timestamp);
```

### 3. Minimal Options

Use minimal options for simple messages:

```javascript
const options = "0x"; // Default options, smallest size
```

## Monitoring and Analytics

### Get Per-Chain Statistics

```javascript
// Check stats for Arbitrum
const arbEid = 40231;
const stats = await broadcaster.getChainStats(arbEid);

console.log(`To Arbitrum: ${stats.sent} sent, ${stats.received} received`);
```

### View Message History

```javascript
// Get last 10 messages
const count = await broadcaster.getMessageCount();
const startIndex = count > 10 ? count - 10 : 0;
const messages = await broadcaster.getMessageHistory(startIndex, 10);

messages.forEach((msg, i) => {
  console.log(`\nMessage ${startIndex + i}:`);
  console.log(`  Category: ${msg.category}`);
  console.log(`  Content: ${msg.content}`);
  console.log(`  From Chain: ${msg.srcEid}`);
  console.log(`  Timestamp: ${new Date(msg.timestamp * 1000).toISOString()}`);
});
```

### Get Latest by Category

```javascript
const latestGovernance = await broadcaster.latestByCategory(1);
console.log(`Latest governance message: ${latestGovernance}`);
```

## Common Issues and Solutions

### Issue 1: "Insufficient fee provided"

**Problem**: Didn't send enough ETH to cover all destinations.

**Solution**: Always call `quoteBroadcast()` first:

```javascript
const totalFee = await broadcaster.quoteBroadcast(dstEids, category, msg, "0x");
await broadcaster.broadcast(dstEids, category, msg, "0x", { value: totalFee });
```

### Issue 2: Some messages don't arrive

**Problem**: Different chains have different gas requirements.

**Solution**: Use higher gas limits in options:

```javascript
const Options = require("@layerzerolabs/lz-v2-utilities").Options;
const options = Options.newOptions()
  .addExecutorLzReceiveOption(250000, 0)
  .toHex();
```

### Issue 3: High gas costs

**Problem**: Broadcasting to many chains is expensive.

**Solution**:
1. Use smaller payloads
2. Set enforced options to optimize gas
3. Consider batching less frequently but with more data

## Security Considerations

### 1. Fee Validation

```solidity
require(msg.value >= totalFeeRequired, "Insufficient fee provided");
```

Always verify sufficient payment before sending.

### 2. Destination Validation

```solidity
require(_dstEids.length > 0, "No destinations specified");
```

Prevent empty broadcasts.

### 3. Refund Mechanism

```solidity
if (msg.value > totalFeeRequired) {
    payable(msg.sender).transfer(msg.value - totalFeeRequired);
}
```

Return excess fees to prevent fund locking.

### 4. Array Length Limits

Consider limiting array size to prevent gas issues:

```solidity
require(_dstEids.length <= 10, "Too many destinations");
```

## Exercise: Build a Multi-Chain Counter

Try implementing a synchronized counter across all chains:

```solidity
uint256 public globalCounter;

function incrementAndBroadcast(uint32[] calldata _dstEids) external payable {
    globalCounter++;
    bytes memory payload = abi.encode(globalCounter);
    // Broadcast new counter value to all chains
}
```

## Key Takeaways

✅ Batch sending broadcasts to multiple chains in one transaction

✅ Calculate total fees by summing individual destination fees

✅ Encode payload once and reuse for gas efficiency

✅ Track per-chain statistics for monitoring

✅ Use message categories for organized data handling

✅ Always validate fees and refund excess payments

✅ Messages arrive independently on each chain

✅ Consider gas costs when broadcasting to many chains

## Next Steps

- **Lesson 05**: Learn how to interact with Solana OApps
- **Challenges**: Apply multichain patterns to real-world scenarios

## Resources

- [Batch Send Pattern Diagram](../../src/diagrams/batch-send-pattern.svg)
- [LayerZero Scan](https://layerzeroscan.com) - Track broadcasts
- [LayerZero Docs - OApp](https://docs.layerzero.network/v2/developers/evm/oapp/overview)
- [Gas Optimization Guide](https://docs.layerzero.network/v2/developers/evm/gas-settings/options)
