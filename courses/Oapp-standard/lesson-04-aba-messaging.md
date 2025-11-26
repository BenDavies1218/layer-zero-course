# Lesson 04 — ABA Messaging Pattern (Ping-Pong)

In this lesson, you'll learn how to implement the ABA (A → B → A) pattern, where a message from Chain A triggers a response from Chain B that comes back to Chain A. This is commonly known as the "ping-pong" pattern and is essential for request-response flows in cross-chain applications.

## What You'll Build

**PingPong OApp** - A contract that:

- Sends a "ping" message to another chain
- Receives messages and automatically responds with "pong"
- Tracks ping/pong counts and message history
- Demonstrates nested cross-chain messaging
- How to handles automatic response logic in `_lzReceive()`

## Prerequisites

Before starting you should have Completed:

- [Lesson 1 Oapp basics](./lesson-01-basics.md)
- [Lesson 2 simple Oapp](./lesson-02-simple-oapp.md)
- [Lesson 3 Hardhat Tasks](./lesson-03-hardhat-tasks.md)

## Contract Architecture

### Key Differences from SimpleMessenger

The ABA pattern requires:

1. **Message Type Identification**: Distinguish between "ping" and "pong" messages
2. **Conditional Response Logic**: Only respond to "ping", not to "pong" (avoid infinite loops!)
3. **Gas Pre-Allocation**: Include pong options in ping payload and allocate gas upfront for round trip
4. **Reentrancy Safety**: Calling `_lzSend()` from within `_lzReceive()` or updating chain state requires care! (Checks, Effects, and Interactions)

### ABA Gas Planning

For A → B → A messaging, the sender pays for the complete round trip in a single transaction:

1. **A → B Delivery**: Cost to send ping from Chain A to Chain B
2. **B Execution + Pong Gas**: Chain B needs gas to execute `_lzReceive()` AND send pong back
3. **B → A Delivery**: Cost to send pong from Chain B back to Chain A

**Key Insight**: Encode the pong options in your ping message, and use `lzReceiveOption` with native value to pre-allocate the pong fee.

## Building the PingPong Contract

### Step 1: Create Contract

Create `contracts/PingPong.sol`

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

Add the message type enum, counters and errors:

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

    // Custom errors
    error InvalidMessageType();
    error OnlyPeersAllowed(uint32 srcEid, bytes32 sender);
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

### Step 5: Add Quote Function

Add fee estimation for round trip:

```javascript
    function quote(
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

### Step 6: Implement Ping Function

Add the main ping function exact same as the simpleMessenger contract:

```javascript
    function send(
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

### Step 7: Implement \_lzReceive

Override the receive handler to process incoming messages:

```javascript
    function _lzReceive(
        Origin calldata _origin, // Origin chain info (srcEid, sender, nonce)
        bytes32 /*_guid*/, // Unique message identifier
        bytes calldata _payload, // Encoded message data
        address /*_executor*/, // Executor address
        bytes calldata /*_extraData*/ // Additional data
    ) internal override {
        // Validate that the message comes from a registered peer
        // Note: OApp base contract already does this check, but we make it explicit for as we are calling _LzSend in the _LzRecieve
        bytes32 expectedPeer = peers[_origin.srcEid];
        if (expectedPeer != _origin.sender) {
            revert OnlyPeersAllowed(_origin.srcEid, _origin.sender);
        }

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

            // Send pong using pre-allocated gas from ping transaction
            // msg.value contains the native fee allocated by sender
            _lzSend(
                _origin.srcEid, // Send back to origin chain
                pongPayload, // Encoded pong message
                returnOptions, // Use pre-provided pong options directly
                MessagingFee(msg.value, 0), // Use pre-allocated gas
                payable(address(this)) // Refund to contract
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
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @notice Allow contract to receive refunds
     */
    receive() external payable {}
```

**Purpose:**

- `withdraw()`: Remove any accidentally sent funds
- `receive()`: Accept refunds from LayerZero protocol

## Compile and Deploy

### Step 1: Compile

```bash
pnpm compile
```

### Step 1: Deploy Contracts

Run the deployment command:

```bash
pnpm deploy:contracts
```

**Run verification (Optional but good practice):**

For Arbitrum Sepolia deployment

```bash
pnpm hardhat verify --network arbitrum-sepolia --contract contracts/Oapp/PingPong.sol:PingPong 0x6EDCE65403992e310A62460808c4b910D972f10f
```

For Arbitrum Sepolia deployment

```bash
pnpm hardhat verify --network ethereum-sepolia --contract contracts/Oapp/PingPong.sol:PingPong 0x6EDCE65403992e310A62460808c4b910D972f10f
```

**Run the interactive wiring tool:**

```bash
pnpm wire
```

### PingPong HardHat Task

```javascript
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

task('lz:oapp:status:pingpong', 'Get PingPong contract status and statistics').setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        // Get the network that hardhat is connected to
        const network = hre.network.name
        console.log(`\n📊 Querying PingPong on ${network}...\n`)

        // Get the deployment
        const deployment = await hre.deployments.get('PingPong')

        // Call the getContractAt()
        const contract = await hre.ethers.getContractAt('PingPong', deployment.address)

        // Query state variables
        const pingsSent = await contract.pingsSent()
        const pingsReceived = await contract.pingsReceived()
        const pongsSent = await contract.pongsSent()
        const pongsReceived = await contract.pongsReceived()

        // Console Log Display results
        console.log('PingPong Contract Status:')
        console.log(`  Address: ${deployment.address}`)
        console.log(`  Pings Sent: ${pingsSent}`)
        console.log(`  Pings Received: ${pingsReceived}`)
        console.log(`  Pongs Sent: ${pongsSent}`)
        console.log(`  Pongs Received: ${pongsReceived}\n`)
    }
)
```

```bash
pnpm hardhat lz:oapp:status:pingpong --network arbitrum-sepolia --dst-eid 40161
```

```bash
pnpm hardhat lz:oapp:status:pingpong --network ethereum-sepolia --dst-eid 40231
```

## Key Takeaways

- ABA pattern enables request-response flows across chains
- Distinguish message types to prevent infinite loops
- Encode pong options in ping payload for automatic responses
- Use `lzReceiveOption` with native value to pre-allocate pong gas
- Sender pays for entire round trip upfront - no contract funding needed
- Always quote with `quote()` to calculate total costs
- Follow checks-effects-interactions pattern for safety
- Validate message types and gas allocations in `_lzReceive()`

## Next Steps

- **Lesson 04**: Build a multichain messaging OApp that broadcasts to multiple chains instead of just 2

## Resources

- [LayerZero Scan](https://layerzeroscan.com) - Track ping-pong messages
- [ABA Pattern Diagram](../../src/diagrams/aba-pattern.svg) - Visual reference
- [LayerZero Docs](https://docs.layerzero.network/v2) - Official documentation
