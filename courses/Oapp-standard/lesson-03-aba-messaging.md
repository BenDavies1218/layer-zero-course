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

### Use Cases

- **Request-Response**: Ask another chain for data and get an answer
- **Cross-Chain Authentication**: Verify actions on another chain
- **Acknowledgments**: Confirm receipt of important messages
- **Bidirectional State Sync**: Keep state synchronized across chains
- **Oracle Patterns**: Request data from another chain

## Prerequisites

Before starting:

- Complete Lesson 02 (SimpleMessenger)
- Understand the basic OApp send/receive pattern
- Have testnet tokens on at least two chains

## Contract Architecture

### Key Differences from SimpleMessenger

The ABA pattern requires:

1. **Message Type Identification**: Distinguish between "ping" and "pong" messages
2. **Conditional Response Logic**: Only respond to "ping", not to "pong" (avoid infinite loops!)
3. **Fee Management**: The contract needs funds to send automatic responses
4. **Reentrancy Safety**: Calling `_lzSend()` from within `_lzReceive()` requires care

## Step 1: Create PingPong.sol

Create `src/contracts/Oapp/PingPong.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PingPong is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    // Message types
    enum MessageType {
        PING,
        PONG
    }

    // Counters
    uint256 public pingsSent;
    uint256 public pingsReceived;
    uint256 public pongsSent;
    uint256 public pongsReceived;

    // Message type for enforced options
    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PingSent(uint32 indexed dstEid, uint256 indexed pingId);
    event PingReceived(uint32 indexed srcEid, uint256 indexed pingId);
    event PongSent(uint32 indexed dstEid, uint256 indexed pongId);
    event PongReceived(uint32 indexed srcEid, uint256 indexed pongId);

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
     * @notice Send a ping to another chain
     * @dev The destination chain will automatically respond with pong
     * @param _dstEid Destination chain endpoint ID
     * @param _options Execution options for the message
     */
    function ping(
        uint32 _dstEid,
        bytes calldata _options
    ) external payable {
        // Encode PING message with current ping count
        bytes memory payload = abi.encode(MessageType.PING, pingsSent);

        // Combine options
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        // Send the ping
        _lzSend(
            _dstEid,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit PingSent(_dstEid, pingsSent);
        pingsSent++;
    }

    /**
     * @notice Quote fee for sending a ping
     * @param _dstEid Destination endpoint ID
     * @param _options Execution options
     * @param _payInLzToken Pay in LZ token
     * @return fee The messaging fee
     */
    function quotePing(
        uint32 _dstEid,
        bytes calldata _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(MessageType.PING, pingsSent);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, payload, options, _payInLzToken);
    }

    /**
     * @notice Quote fee for automatic pong response
     * @dev Used to estimate how much the contract needs to hold for auto-responses
     * @param _dstEid Destination endpoint ID
     * @param _options Execution options
     * @param _payInLzToken Pay in LZ token
     * @return fee The messaging fee
     */
    function quotePong(
        uint32 _dstEid,
        bytes calldata _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(MessageType.PONG, pongsSent);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, payload, options, _payInLzToken);
    }

    /**
     * @notice Fund the contract for automatic pong responses
     * @dev Contract needs native tokens to send pongs automatically
     */
    function fundForResponses() external payable {
        // Funds stored in contract balance for automatic pong sends
    }

    /**
     * @notice Withdraw excess funds (owner only)
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount) external onlyOwner {
        payable(msg.sender).transfer(_amount);
    }

    /**
     * @notice Get contract balance
     * @return balance Current native token balance
     */
    function getBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Handle incoming messages
     * @dev Automatically responds to PING with PONG
     * WARNING: This function sends messages - ensure contract has funds!
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the message
        (MessageType messageType, uint256 messageId) = abi.decode(
            _payload,
            (MessageType, uint256)
        );

        if (messageType == MessageType.PING) {
            // Received a PING - respond with PONG
            pingsReceived++;
            emit PingReceived(_origin.srcEid, messageId);

            // Prepare PONG response
            bytes memory pongPayload = abi.encode(MessageType.PONG, pongsSent);

            // Use default options for response (or could use enforced options)
            bytes memory options = combineOptions(_origin.srcEid, SEND, "");

            // Calculate fee for response
            MessagingFee memory fee = _quote(
                _origin.srcEid,
                pongPayload,
                options,
                false
            );

            // Ensure contract has enough balance
            require(
                address(this).balance >= fee.nativeFee,
                "Insufficient balance for pong"
            );

            // Send PONG back to origin
            _lzSend(
                _origin.srcEid,
                pongPayload,
                options,
                fee,
                payable(address(this)) // Refund to contract
            );

            emit PongSent(_origin.srcEid, pongsSent);
            pongsSent++;
        } else if (messageType == MessageType.PONG) {
            // Received a PONG - just record it, don't respond
            pongsReceived++;
            emit PongReceived(_origin.srcEid, messageId);
        }
    }

    /**
     * @notice Allow contract to receive native tokens
     */
    receive() external payable {}
}
```

## Key Implementation Details

### 1. Message Type Enum

```solidity
enum MessageType {
    PING,
    PONG
}
```

This distinguishes between ping and pong messages, preventing infinite loops.

### 2. Conditional Response Logic

```solidity
if (messageType == MessageType.PING) {
    // Respond with PONG
} else if (messageType == MessageType.PONG) {
    // Just record, don't respond!
}
```

**Critical**: Never respond to a PONG, or you'll create an infinite ping-pong loop!

### 3. Contract Funding

```solidity
function fundForResponses() external payable {}
receive() external payable {}
```

The contract needs native tokens to pay for automatic pong responses.

### 4. Balance Check

```solidity
require(
    address(this).balance >= fee.nativeFee,
    "Insufficient balance for pong"
);
```

Always verify the contract has enough funds before sending automatic responses.

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

### Step 1: Fund the Destination Chain Contract

Before pinging, fund the contract on Chain B so it can respond:

```bash
npx hardhat console --network arbitrum-sepolia
```

```javascript
const PingPong = await ethers.getContractFactory("PingPong");
const pingPong = PingPong.attach("0xYourArbitrumAddress");

// Fund with 0.1 ETH for automatic pong responses
const tx = await pingPong.fundForResponses({
  value: ethers.utils.parseEther("0.1"),
});
await tx.wait();

console.log("Contract funded!");
console.log(
  `Balance: ${ethers.utils.formatEther(await pingPong.getBalance())} ETH`
);
```

### Step 2: Send a Ping from Chain A

```bash
npx hardhat console --network ethereum-sepolia
```

```javascript
const PingPong = await ethers.getContractFactory("PingPong");
const pingPong = PingPong.attach("0xYourSepoliaAddress");

// Quote the ping fee
const arbSepoliaEid = 40231;
const options = "0x";
const fee = await pingPong.quotePing(arbSepoliaEid, options, false);

console.log(`Ping fee: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);

// Send ping
const tx = await pingPong.ping(arbSepoliaEid, options, {
  value: fee.nativeFee,
});

console.log(`Ping sent! Tx: ${tx.hash}`);
await tx.wait();
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

## Advanced: Setting Enforced Options

To ensure automatic pong responses have enough gas:

```javascript
const Options = require("@layerzerolabs/lz-v2-utilities").Options;

// Set minimum 150k gas for automatic responses
const enforcedOptions = Options.newOptions()
  .addExecutorLzReceiveOption(150000, 0)
  .toHex();

await pingPong.setEnforcedOptions([
  {
    eid: sepoliaEid, // For pongs back to Sepolia
    msgType: 1,
    options: enforcedOptions,
  },
]);
```

## Common Issues and Solutions

### Issue 1: "Insufficient balance for pong"

**Problem**: Contract runs out of funds for automatic responses.

**Solution**: Fund the contract on the destination chain:

```javascript
await pingPong.fundForResponses({ value: ethers.utils.parseEther("0.1") });
```

### Issue 2: Pong never arrives

**Problem**: Not enough gas for destination execution.

**Solution**: Increase gas in enforced options or when sending ping:

```javascript
const options = Options.newOptions()
  .addExecutorLzReceiveOption(200000, 0)
  .toHex();
```

### Issue 3: Infinite loop

**Problem**: Responding to both PING and PONG creates infinite messages.

**Solution**: Only respond to PING messages:

```solidity
if (messageType == MessageType.PING) {
    // Send PONG
} else if (messageType == MessageType.PONG) {
    // DO NOT send anything - just record!
}
```

## Security Considerations

### 1. Reentrancy

Calling `_lzSend()` from within `_lzReceive()` is generally safe because:
- State is updated before the call
- LayerZero Endpoint is trusted
- No external untrusted calls are made

However, always follow checks-effects-interactions:

```solidity
// ✅ GOOD
pingsReceived++;  // Update state first
emit PingReceived(_origin.srcEid, messageId);
_lzSend(...);  // External call last

// ❌ BAD
_lzSend(...);  // External call first
pingsReceived++;  // State update after
```

### 2. Funding Requirements

```solidity
require(
    address(this).balance >= fee.nativeFee,
    "Insufficient balance for pong"
);
```

Always check contract balance before automatic sends to prevent reverts.

### 3. Gas Limits

Automatic responses need sufficient gas. Set enforced options as a safety net:

```solidity
// Minimum 100k gas for responses
setEnforcedOptions([...]);
```

### 4. Withdrawal Protection

```solidity
function withdraw(uint256 _amount) external onlyOwner {
    payable(msg.sender).transfer(_amount);
}
```

Only owner can withdraw funds to prevent drainage attacks.

## Monitoring and Debugging

### Check Contract Balance

```javascript
const balance = await pingPong.getBalance();
console.log(`Contract balance: ${ethers.utils.formatEther(balance)} ETH`);
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

## Exercise: Extend the Pattern

Try implementing these enhancements:

1. **Timed Responses**: Add timestamps to track round-trip time
2. **Multi-Hop**: A → B → C → A pattern
3. **Conditional Pong**: Only respond if certain conditions are met
4. **Data Requests**: Send data in ping, get calculations in pong
5. **Rate Limiting**: Limit pongs per time period to prevent spam

## Key Takeaways

✅ ABA pattern enables request-response flows across chains

✅ Distinguish message types to prevent infinite loops

✅ Destination contract needs funding for automatic responses

✅ Always check contract balance before sending automatic messages

✅ Use enforced options to guarantee sufficient gas for responses

✅ Follow checks-effects-interactions pattern for safety

✅ Monitor contract balance and events for reliable operation

## Next Steps

- **Lesson 04**: Build a multichain messaging OApp that broadcasts to multiple chains
- **Lesson 05**: Learn how to interact with Solana OApps
- **Challenges**: Test your skills with advanced exercises

## Resources

- [LayerZero Scan](https://layerzeroscan.com) - Track ping-pong messages
- [ABA Pattern Diagram](../../src/diagrams/aba-pattern.svg) - Visual reference
- [LayerZero Docs](https://docs.layerzero.network/v2) - Official documentation
