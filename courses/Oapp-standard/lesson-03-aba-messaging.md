# Lesson 03 — ABA Messaging Pattern (Ping-Pong)

In this lesson, you'll learn how to implement the ABA (A → B → A) pattern, where a message from Chain A triggers a response from Chain B that comes back to Chain A. This is commonly known as the "ping-pong" pattern and is essential for request-response flows in cross-chain applications.

## What You'll Build

**PingPong OApp** - A contract that:

- Sends a "ping" message to another chain
- Receives messages and automatically responds with "pong"
- Tracks ping/pong counts and message history
- Demonstrates nested cross-chain messaging
- Handles automatic response logic in `_lzReceive()`

## Understanding the ABA Pattern

![ABA Pattern](../../src/diagrams/aba-pattern.svg)

### How It Works

1. **User calls `ping()` on Chain A**

   - OApp A sends "ping" message to Chain B
   - Message travels through LayerZero protocol

2. **Chain B receives in `_lzReceive()`**

   - OApp B processes "ping" message
   - OApp B automatically sends "pong" back to Chain A
   - This is a **nested message** - receiving triggers sending

3. **Chain A receives "pong"**
   - OApp A processes the response
   - Completes the round-trip communication

### Real-World Use Cases

The ABA pattern enables powerful request-response flows across chains. Here are practical applications:

#### 1. Multi-Chain Governance

- **Case**: Main DAO on Ethereum requests vote tallies from satellite chains

#### 2. Liquidity Availability Checks

- **Case**: Bridge asks destination chain if sufficient liquidity exists

#### 3. Remote Authentication

- **Case**: App on Base requests authentication on a remote chain

#### 5. Acknowledgment & Confirmation

- **Case**: Managing State on multiply Changes

## Prerequisites

Before starting:

- Complete [Lesson-01-basics](./lesson-01-basics.md)
- Complete [Lesson-02-simple-Oapp](./lesson-02-simple-oapp.md)

## Contract Architecture

### Key Differences from SimpleMessenger

The ABA pattern requires:

1. **Message Type Identification**: Distinguish between "ping" and "pong" messages
2. **Conditional Response Logic**: Only respond to "ping", not to "pong" (avoid infinite loops!)
3. **Gas Pre-Allocation**: Include pong options in ping payload and allocate gas upfront for round trip
4. **Reentrancy Safety**: Calling `_lzSend()` from within `_lzReceive()` requires care

### ABA Gas Planning

For A → B → A messaging, the sender pays for the complete round trip in a single transaction:

1. **A → B Delivery**: Cost to send ping from Chain A to Chain B
2. **B Execution + Pong Gas**: Chain B needs gas to execute `_lzReceive()` AND send pong back
3. **B → A Delivery**: Cost to send pong from Chain B back to Chain A

**Key Insight**: Encode the pong options in your ping message, and use `lzReceiveOption` with native value to pre-allocate the pong fee.

## Building the PingPong Contract

### Step 1: Create Contract File and Imports

Create `src/contracts/Oapp/PingPong.sol`

```javascript
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PingPong is OApp, OAppOptionsType3 {

}
```

### Step 2: Add State Variables

Add the message type enum and counters:

```javascript
    // Message types to distinguish ping from pong
    enum MessageType {
        PING,  // Request message
        PONG   // Response message
    }

    // Counters
    uint256 public pingsSent;        // Total pings sent from this contract
    uint256 public pingsReceived;    // Total pings received by this contract
    uint256 public pongsSent;        // Total pongs sent from this contract
    uint256 public pongsReceived;    // Total pongs received by this contract

    // Message type for enforced options
    uint16 public constant SEND = 1; // Message type identifier
```

### Step 3: Define Events

Add events to track message lifecycle:

```javascript
    event PingSent(uint32 indexed dstEid, uint256 indexed pingId);       // Emitted when ping is sent
    event PingReceived(uint32 indexed srcEid, uint256 indexed pingId);   // Emitted when ping is received
    event PongSent(uint32 indexed dstEid, uint256 indexed pongId);       // Emitted when pong is sent
    event PongReceived(uint32 indexed srcEid, uint256 indexed pongId);   // Emitted when pong is received
```

### Step 4: Add Constructor

Initialize the contract with LayerZero endpoint:

```javascript
    constructor(
        address _endpoint,  // LayerZero V2 endpoint address
        address _owner      // Owner of the contract
    ) OApp(_endpoint, _owner) Ownable(_owner) {}
```

### Step 5: Implement Ping Function

Add the main ping function:

```javascript
    function ping(
        uint32 _dstEid,                  // Destination chain endpoint ID
        bytes calldata _sendOptions,     // Execution options for ping message
        bytes calldata _returnOptions    // Execution options for automatic pong response
    ) external payable {

        // Encode the payload with:       ( Message Type ) (PingsSent)  (Return Options)
        bytes memory payload = abi.encode(MessageType.PING, pingsSent, _returnOptions);

        // Combine enforced options with caller-provided options
        bytes memory options = combineOptions(_dstEid, SEND, _sendOptions);

        // Send using the OApp _lzSend method
        _lzSend(
            _dstEid,                      // Destination endpoint ID
            payload,                      // Encoded payload
            options,                      // Execution sendOptions
            MessagingFee(msg.value, 0),   // Fee in native gas token
            payable(msg.sender)           // Refund address
        );

        // Emit event and update counter
        emit PingSent(_dstEid, pingsSent);
        pingsSent++;
    }
```

### Step 6: Add Quote Function

Add fee estimation for round trip:

```javascript
    function quotePingPong(
        uint32 _dstEid,                  // Destination endpoint ID
        bytes calldata _sendOptions,     // Execution options for send _lzSend call
        bytes calldata _returnOptions    // Execution options for return _lzSend call
    ) external view returns (uint256 totalFee) {

        // Quote the return cost (B → A)
        bytes memory returnPayload = abi.encode(MessageType.PONG, 0);
        bytes memory returnOpts = combineOptions(_dstEid, SEND, _returnOptions);
        MessagingFee memory returnFee = _quote(_dstEid, returnPayload, returnOpts, false);

        // Quote the send cost (A → B)
        bytes memory sendPayload = abi.encode(MessageType.PING, pingsSent, _returnOptions);
        bytes memory sendOpts = combineOptions(_dstEid, SEND, _sendOptions);
        MessagingFee memory sendFee = _quote(_dstEid, sendPayload, sendOpts, false);

        // Calculate total fee for complete round trip
        // Total = send fee + return fee
        // Note: return execution gas is included in sendOptions via lzReceiveOption
        totalFee = sendFee.nativeFee + returnFee.nativeFee;
    }
```

**Why two quotes:**

- First quote: cost of pong message (B → A)
- Second quote: cost of ping message (A → B)
- Total fee covers complete round trip

### Step 7: Implement \_lzReceive

Override the receive handler to process incoming messages:

```javascript
    function _lzReceive(
        Origin calldata _origin,       // Origin chain info (srcEid, sender, nonce)
        bytes32 /*_guid*/,              // Unique message identifier
        bytes calldata _payload,        // Encoded message data
        address /*_executor*/,          // Executor address
        bytes calldata /*_extraData*/   // Additional data
    ) internal override {
        // Decode the message to get type, ID, and return options
        (MessageType messageType, uint256 messageId, bytes memory returnOptions) = abi.decode(
            _payload,
            (MessageType, uint256, bytes)
        );

        if (messageType == MessageType.PING) {
            // Increment the pingsReceived
            pingsReceived++;

            // Emit the pingReceived to the source
            emit PingReceived(_origin.srcEid, messageId);

            // Prepare pongPayload
            bytes memory pongPayload = abi.encode(MessageType.PONG, pongsSent);

            // Use pong options that were encoded in the ping message
            bytes memory options = combineOptions(_origin.srcEid, SEND, returnOptions);

            // Send pong using pre-allocated gas from ping transaction
            // msg.value contains the native fee allocated by sender
            _lzSend(
                _origin.srcEid,              // Send back to origin chain
                pongPayload,                 // Encoded pong message
                options,                     // Use pre-provided pong options
                MessagingFee(msg.value, 0),  // Use pre-allocated gas
                payable(address(this))       // Refund to contract
            );

            // Emit the pong sent
            emit PongSent(_origin.srcEid, pongsSent);
            // Increment the pongs sent
            pongsSent++;

        } else if (messageType == MessageType.PONG) {
            // Increment the pongsReceived
            pongsReceived++;

            // emit the pongReceived to the origin
            emit PongReceived(_origin.srcEid, messageId);
        }
    }
```

### Step 8: Add Helper Functions

Add withdrawal and receive functions:

```javascript
    /**
     * @notice Withdraw any accidental funds (owner only)
     */
    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);  // Transfer balance to owner
    }

    /**
     * @notice Allow contract to receive refunds
     */
    receive() external payable {}  // Accept native token refunds from LayerZero
```

**Purpose:**

- `withdraw()`: Remove any accidentally sent funds
- `receive()`: Accept refunds from LayerZero protocol

## Key Implementation Details

### 1. Encoding Return Options in Send

```javascript
// Ping payload includes pong options
bytes memory payload = abi.encode(MessageType.PING, pingsSent, _returnOptions);
```

### 2. Decoding in \_lzReceive

```javascript
(MessageType messageType, uint256 messageId, bytes memory returnOptions) = abi.decode(_payload,(MessageType, uint256, bytes));
```

### 3. Using Pre-Allocated Gas

```javascript
// msg.value contains the native fee allocated by the sender
_lzSend(
  _origin.srcEid,
  pongPayload,
  options,
  MessagingFee(msg.value, 0),
  payable(address(this))
);
```

The pong uses gas that was allocated in the original ping transaction via `lzReceiveOption`.

### 4. Preventing Infinite Loops

```javascript
if (messageType == MessageType.PING) {
  // Send PONG
} else if (messageType == MessageType.PONG) {
  // Just record, DON'T respond!
}
```

## Compile and Deploy

### Step 1: Compile

```bash
npx hardhat compile
```

### Step 2: Update Deploy Script

Edit `src/scripts/deploy.ts`:

```typescript
const contractName = "PingPong";
```

### Step 3: Deploy to Two Chains

```bash
# Deploy to Sepolia
npx hardhat run src/scripts/deploy.ts --network ethereum-sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run src/scripts/deploy.ts --network arbitrum-sepolia
```

Save both addresses!

### Step 4: Configure Peers

Edit `src/scripts/configure.ts`:

```typescript
const deployments = {
  "ethereum-sepolia": "0xYourSepoliaAddress",
  "arbitrum-sepolia": "0xYourArbitrumAddress",
};

const contractName = "PingPong";
```

Run configuration:

```bash
npx hardhat run src/scripts/configure.ts --network ethereum-sepolia
npx hardhat run src/scripts/configure.ts --network arbitrum-sepolia
```

## Testing the ABA Pattern

### Step 1: Build Options and Quote Fee

```bash
npx hardhat console --network ethereum-sepolia
```

```javascript
const { Options } = require("@layerzerolabs/lz-v2-utilities");
const PingPong = await ethers.getContractFactory("PingPong");
const pingPong = PingPong.attach("0xYourSepoliaAddress");

const arbSepoliaEid = 40231;
const sepoliaEid = 40161;

// 1. Build pong options (B → A)
const returnOptions = Options.newOptions()
  .addExecutorLzReceiveOption(100000, 0)
  .toHex();

// 2. Quote pong cost
const pongFee = await pingPong.quotePong(sepoliaEid, returnOptions, false);
console.log(`Pong fee: ${ethers.utils.formatEther(pongFee.nativeFee)} ETH`);

// 3. Build ping options with pong gas pre-allocated
const sendOptions = Options.newOptions()
  .addExecutorLzReceiveOption(
    150000, // Gas for executing _lzReceive + sending pong
    pongFee.nativeFee // Native fee for pong delivery
  )
  .toHex();

// 4. Quote total ping-pong round trip
const totalFee = await pingPong.quotePingPong(
  arbSepoliaEid,
  sendOptions,
  returnOptions
);
console.log(`Total round trip fee: ${ethers.utils.formatEther(totalFee)} ETH`);
```

### Step 2: Send Ping with Pre-Allocated Gas

```javascript
// Send ping with complete round trip payment
const tx = await pingPong.ping(arbSepoliaEid, sendOptions, returnOptions, {
  value: totalFee,
});

console.log(`Ping sent! Tx: ${tx.hash}`);
await tx.wait();
console.log("✅ Ping sent with gas pre-allocated for automatic pong!");
```

### Step 3: Track the Messages

Go to [LayerZero Scan](https://layerzeroscan.com) and enter your transaction hash.

You should see:

1. **First message**: Ping from Sepolia to Arbitrum (~2-5 minutes)
2. **Second message**: Automatic pong from Arbitrum back to Sepolia (~2-5 minutes)

Total round-trip: ~5-10 minutes

### Step 4: Verify on Both Chains

**On Sepolia** (where you sent ping):

```javascript
const pings = await pingPong.pingsSent();
const pongs = await pingPong.pongsReceived();

console.log(`Pings sent: ${pings}`); // Should be 1
console.log(`Pongs received: ${pongs}`); // Should be 1 (after pong arrives)
```

**On Arbitrum** (destination):

```javascript
const pings = await pingPong.pingsReceived();
const pongs = await pingPong.pongsSent();

console.log(`Pings received: ${pings}`); // Should be 1
console.log(`Pongs sent: ${pongs}`); // Should be 1
```

### Understanding ABA Gas Requirements

For a complete A → B → A flow, you need to pay for:

1. **A → B delivery**: Message delivery from Chain A to Chain B
2. **B → A gas allocation**: Gas for Chain B to execute `_lzReceive()` AND send the return message
3. **B → A delivery**: Message delivery from Chain B back to Chain A

**Key Insight**: The sender pays for the entire round trip upfront by:

- Encoding pong options in the ping payload
- Using `lzReceiveOption` with native value to pre-allocate gas for the pong message
- Calling `quotePingPong()` to calculate the total cost before sending

**Gas Calculation Example:**

```javascript
const { Options } = require("@layerzerolabs/lz-v2-utilities");

// 1. Build pong options (B → A)
const returnOptions = Options.newOptions()
  .addExecutorLzReceiveOption(100000, 0)
  .toHex();

// 2. Quote the pong message cost
const pongFee = await pingPong.quotePong(sepoliaEid, returnOptions, false);

// 3. Build ping options with pong gas pre-allocated
const sendOptions = Options.newOptions()
  .addExecutorLzReceiveOption(
    150000, // Gas for executing _lzReceive + sending pong
    pongFee.nativeFee // Native fee for pong message delivery
  )
  .toHex();

// 4. Quote total round trip and send
const totalFee = await pingPong.quotePingPong(
  arbSepoliaEid,
  sendOptions,
  returnOptions
);

await pingPong.ping(arbSepoliaEid, sendOptions, returnOptions, {
  value: totalFee,
});
```

## Common Issues and Solutions

### Issue 1: "Insufficient fee for pong"

**Problem**: Pong execution fails due to insufficient gas allocation in ping.

**Solution**: Increase the native value in `lzReceiveOption`:

```javascript
// Increase native fee for pong
const pongFee = await pingPong.quotePong(sepoliaEid, returnOptions, false);

const sendOptions = Options.newOptions()
  .addExecutorLzReceiveOption(
    200000, // Increase execution gas
    pongFee.nativeFee // Ensure sufficient native fee
  )
  .toHex();
```

### Issue 2: Pong never arrives

**Problem**: Not enough gas allocated in ping options for destination execution.

**Solution**: Calculate proper gas requirements and use `quotePingPong()`:

```javascript
// Always quote the full round trip
const totalFee = await pingPong.quotePingPong(
  arbSepoliaEid,
  sendOptions,
  returnOptions
);

// Send with quoted fee
await pingPong.ping(arbSepoliaEid, sendOptions, returnOptions, {
  value: totalFee,
});
```

### Issue 3: Infinite loop

**Problem**: Responding to both PING and PONG creates infinite messages.

**Solution**: Only respond to PING messages:

```javascript
if (messageType == MessageType.PING) {
  // Send PONG
} else if (messageType == MessageType.PONG) {
  // DO NOT send anything - just record!
}
```

### Issue 4: Transaction reverts with "Insufficient msg.value"

**Problem**: Not sending enough value to cover ping delivery + pong allocation.

**Solution**: Always use the `quotePingPong()` result:

```javascript
const totalFee = await pingPong.quotePingPong(dstEid, sendOpts, returnOpts);
await pingPong.ping(dstEid, sendOpts, returnOpts, { value: totalFee });
```

## Security Considerations

### 1. Reentrancy

Calling `_lzSend()` from within `_lzReceive()` is generally safe because:

- State is updated before the call
- LayerZero Endpoint is trusted
- No external untrusted calls are made

However, always follow checks-effects-interactions:

```javascript
// ✅ GOOD
pingsReceived++;  // Update state first
emit PingReceived(_origin.srcEid, messageId);
_lzSend(...);  // External call last

// ❌ BAD
_lzSend(...);  // External call first
pingsReceived++;  // State update after
```

### 2. Gas Validation

Always validate that msg.value in `_lzReceive()` is sufficient:

```javascript
// Calculate required fee
MessagingFee memory fee = _quote(_origin.srcEid, payload, options, false);

// Verify pre-allocated gas is sufficient
require(msg.value >= fee.nativeFee, "Insufficient gas for pong");
```

### 3. Message Type Validation

Critical: Prevent infinite loops by validating message types:

```javascript
if (messageType == MessageType.PING) {
  // Only respond to PING, never to PONG
  _sendPong(_origin.srcEid, returnOptions);
} else if (messageType == MessageType.PONG) {
  // Just record, never respond to prevent loop
  pongsReceived++;
}
```

### 4. Options Validation

Validate return options decoded from payload to prevent malicious gas allocation:

```javascript
// Decode return options from payload
(, , bytes memory returnOptions) = abi.decode(_payload, (MessageType, uint256, bytes));

// Optional: Validate options are within acceptable bounds
// This prevents sender from encoding malicious or excessive gas requirements
```

## Monitoring and Debugging

### Track Message Counts

```javascript
// On source chain (Sepolia)
const pingsSent = await pingPong.pingsSent();
const pongsReceived = await pingPong.pongsReceived();
console.log(`Pings sent: ${pingsSent}`);
console.log(`Pongs received: ${pongsReceived}`);

// On destination chain (Arbitrum)
const pingsReceived = await pingPong.pingsReceived();
const pongsSent = await pingPong.pongsSent();
console.log(`Pings received: ${pingsReceived}`);
console.log(`Pongs sent: ${pongsSent}`);
```

### Monitor Events

```javascript
// Listen for ping events
pingPong.on("PingSent", (dstEid, pingId) => {
  console.log(`Ping ${pingId} sent to ${dstEid}`);
});

pingPong.on("PongReceived", (srcEid, pongId) => {
  console.log(`Pong ${pongId} received from ${srcEid}`);
});
```

### Debug Gas Issues

```javascript
// Quote individual components
const pongFee = await pingPong.quotePong(sepoliaEid, returnOptions, false);
console.log(
  `Pong delivery fee: ${ethers.utils.formatEther(pongFee.nativeFee)}`
);

const totalFee = await pingPong.quotePingPong(
  arbSepoliaEid,
  sendOptions,
  returnOptions
);
console.log(`Total round trip: ${ethers.utils.formatEther(totalFee)}`);
```

## Advanced

Try implementing these enhancements:

1. **Timed Responses**: Add timestamps to track round-trip time
2. **Multi-Hop**: A → B → C → A pattern
3. **Conditional Return**: Only respond if certain conditions are met
4. **Data Requests**: Send data in send, get calculations in return
5. **Rate Limiting**: Limit returns per time period to prevent spam

## Key Takeaways

✅ ABA pattern enables request-response flows across chains

✅ Distinguish message types to prevent infinite loops

✅ Encode pong options in ping payload for automatic responses

✅ Use `lzReceiveOption` with native value to pre-allocate pong gas

✅ Sender pays for entire round trip upfront - no contract funding needed

✅ Always quote with `quotePingPong()` to calculate total costs

✅ Follow checks-effects-interactions pattern for safety

✅ Validate message types and gas allocations in `_lzReceive()`

## Next Steps

- **Lesson 04**: Build a multichain messaging OApp that broadcasts to multiple chains instead of just 2

## Resources

- [LayerZero Scan](https://layerzeroscan.com) - Track ping-pong messages
- [ABA Pattern Diagram](../../src/diagrams/aba-pattern.svg) - Visual reference
- [LayerZero Docs](https://docs.layerzero.network/v2) - Official documentation
