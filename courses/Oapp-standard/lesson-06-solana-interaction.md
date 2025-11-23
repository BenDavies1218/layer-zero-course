# Lesson 05 — Interacting with Solana OApps

In this lesson, you'll learn how to send cross-chain messages from EVM chains to Solana using LayerZero V2. This opens up powerful possibilities for bridging the EVM and Solana ecosystems.

## What You'll Learn

- **Cross-VM Communication**: How EVM and Solana chains communicate via LayerZero
- **Address Encoding**: Converting between EVM addresses (20 bytes) and Solana public keys (32 bytes)
- **Endpoint IDs**: Solana's unique endpoint identifiers
- **Payload Compatibility**: Encoding messages that work across VMs
- **Gas Considerations**: Fee management for cross-VM messaging
- **Practical Examples**: Real-world EVM → Solana messaging patterns

## Understanding Cross-VM Messaging

### The Challenge

EVM and Solana are fundamentally different:

| Aspect | EVM | Solana |
|--------|-----|--------|
| Address Size | 20 bytes (0x...) | 32 bytes (base58) |
| Smart Contracts | Solidity | Rust (Programs) |
| Account Model | Account-based | Account-based with PDAs |
| Execution | Sequential | Parallel |
| Gas Model | Gas limits | Compute units |

LayerZero V2 abstracts these differences, allowing seamless cross-chain messaging.

### How LayerZero Bridges the Gap

1. **Unified Endpoint Interface**: Both EVM and Solana use LayerZero Endpoints
2. **32-byte Addressing**: All addresses are converted to 32-byte format
3. **Standardized Payloads**: Messages use bytes format compatible with both VMs
4. **DVN Verification**: Same security model across all chains
5. **Executor Delivery**: Handles VM-specific delivery details

## Solana Endpoint IDs

Solana chains have unique endpoint IDs just like EVM chains:

| Network | Endpoint ID | Description |
|---------|-------------|-------------|
| Solana Mainnet | 30168 | Production Solana network |
| Solana Devnet | 40168 | Solana test network |

For this lesson, we'll use **Solana Devnet (40168)**.

## Address Conversion

### EVM Address → 32 Bytes

EVM addresses are 20 bytes. To use them in LayerZero:

```solidity
// Solidity: Convert address to bytes32
function addressToBytes32(address _addr) internal pure returns (bytes32) {
    return bytes32(uint256(uint160(_addr)));
}

// Example:
address evmAddress = 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb;
bytes32 lzAddress = bytes32(uint256(uint160(evmAddress)));
// Result: 0x000000000000000000000000742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Solana Public Key → 32 Bytes

Solana public keys are already 32 bytes:

```javascript
// JavaScript/TypeScript
import { PublicKey } from "@solana/web3.js";

const solanaPubkey = new PublicKey("DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK");
const bytes32 = "0x" + solanaPubkey.toBuffer().toString("hex");
// Result: 0xb91f6a3c6b0f8a5c7d2e9f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c
```

### Setting Solana Peer in Solidity

```solidity
// Set Solana OApp as a trusted peer
uint32 solanaDevnetEid = 40168;
bytes32 solanaPeer = 0xb91f6a3c6b0f8a5c7d2e9f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c;

oapp.setPeer(solanaDevnetEid, solanaPeer);
```

## Building an EVM → Solana Messenger

Let's create a contract that sends messages to Solana.

### Step 1: Create SolanaMessenger.sol

Create `contracts/SolanaMessenger.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SolanaMessenger
 * @notice Send messages from EVM chains to Solana via LayerZero
 */
contract SolanaMessenger is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 public messagesSentToSolana;
    uint256 public messagesReceivedFromSolana;

    // Track messages by ID
    mapping(uint256 => string) public sentMessages;
    mapping(uint256 => string) public receivedMessages;

    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event MessageSentToSolana(
        uint32 indexed solanaEid,
        uint256 indexed messageId,
        string message,
        uint256 fee
    );

    event MessageReceivedFromSolana(
        uint32 indexed solanaEid,
        uint256 indexed messageId,
        string message
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
     * @notice Send a message to Solana
     * @param _solanaEid Solana endpoint ID (40168 for devnet)
     * @param _message Message content
     * @param _options Execution options
     */
    function sendToSolana(
        uint32 _solanaEid,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        // Encode message with ID
        uint256 messageId = messagesSentToSolana;
        bytes memory payload = abi.encode(messageId, _message);

        // Store sent message
        sentMessages[messageId] = _message;

        // Combine options
        bytes memory options = combineOptions(_solanaEid, SEND, _options);

        // Send to Solana
        _lzSend(
            _solanaEid,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit MessageSentToSolana(_solanaEid, messageId, _message, msg.value);
        messagesSentToSolana++;
    }

    /**
     * @notice Quote fee for sending to Solana
     * @param _solanaEid Solana endpoint ID
     * @param _message Message content
     * @param _options Execution options
     * @return fee Messaging fee
     */
    function quoteToSolana(
        uint32 _solanaEid,
        string calldata _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(messagesSentToSolana, _message);
        bytes memory options = combineOptions(_solanaEid, SEND, _options);
        fee = _quote(_solanaEid, payload, options, false);
    }

    /**
     * @notice Helper to convert Solana pubkey string to bytes32
     * @dev This is a simplified version - in production, do this off-chain
     * @param _solanaPubkey Solana public key as bytes32
     */
    function setSolanaPeer(uint32 _solanaEid, bytes32 _solanaPubkey) external onlyOwner {
        setPeer(_solanaEid, _solanaPubkey);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Receive messages from Solana
     * @dev Solana programs send bytes that we decode
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode message from Solana
        // Note: Solana sends data in a compatible format
        (uint256 messageId, string memory message) = abi.decode(
            _payload,
            (uint256, string)
        );

        // Store received message
        receivedMessages[messagesReceivedFromSolana] = message;

        emit MessageReceivedFromSolana(_origin.srcEid, messageId, message);
        messagesReceivedFromSolana++;
    }
}
```

## Deployment and Configuration

### Step 1: Compile and Deploy

```bash
# Compile
pnpm compile
```

Create `deploy/SolanaMessenger.ts`:

```typescript
import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'SolanaMessenger'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [endpointV2Deployment.address, deployer],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed: ${contractName} at ${address}`)
}

deploy.tags = [contractName]

export default deploy
```

Deploy to an EVM testnet:

```bash
# Deploy using LayerZero deployment
pnpm hardhat lz:deploy --tags SolanaMessenger
```

Select Base Sepolia or another EVM testnet.

### Step 2: Get Solana OApp Address

You'll need a LayerZero OApp deployed on Solana Devnet. For this lesson, you can:

1. **Use a demo Solana OApp** (if provided by LayerZero)
2. **Deploy your own Solana OApp** (requires Rust/Anchor knowledge)
3. **Use the LayerZero testnet contracts**

Example Solana Devnet OApp address (for demonstration):
```
Pubkey: DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK
Bytes32: 0xb91f6a3c6b0f8a5c7d2e9f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c
```

### Step 3: Configure Solana Peer

```bash
npx hardhat console --network base-sepolia
```

```javascript
const SolanaMessenger = await ethers.getContractFactory("SolanaMessenger");
const messenger = SolanaMessenger.attach("0xYourBaseSepoliaAddress");

// Solana Devnet endpoint ID
const solanaDevnetEid = 40168;

// Solana OApp address as bytes32
const solanaPeer =
  "0xb91f6a3c6b0f8a5c7d2e9f1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c";

// Set peer
const tx = await messenger.setSolanaPeer(solanaDevnetEid, solanaPeer);
await tx.wait();

console.log("✅ Solana peer configured!");
```

### Step 4: Send Message to Solana

```javascript
const solanaDevnetEid = 40168;
const message = "Hello Solana from Ethereum!";
const options = "0x";

// Quote fee
const fee = await messenger.quoteToSolana(solanaDevnetEid, message, options);
console.log(`Fee to Solana: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);

// Send message
const tx = await messenger.sendToSolana(solanaDevnetEid, message, options, {
  value: fee.nativeFee,
});

console.log(`Message sent! Tx: ${tx.hash}`);
await tx.wait();

// Check counter
const sent = await messenger.messagesSentToSolana();
console.log(`Total messages sent to Solana: ${sent}`);
```

### Step 5: Track on LayerZero Scan

Visit [LayerZero Scan](https://layerzeroscan.com) and enter your transaction hash.

You'll see:
- **Source**: Base Sepolia (EVM)
- **Destination**: Solana Devnet
- **Status**: Verification → Execution

Cross-VM messages may take slightly longer (5-10 minutes).

## Solana-Specific Considerations

### 1. Compute Units vs Gas

Solana uses "compute units" instead of gas:

```javascript
// EVM: Gas limit in options
const evmOptions = Options.newOptions().addExecutorLzReceiveOption(200000, 0);

// Solana: Compute units (typically lower)
const solanaOptions = Options.newOptions().addExecutorLzReceiveOption(
  100000,
  0
);
```

### 2. Account Structure

Solana programs use Program Derived Addresses (PDAs). Your Solana OApp needs:
- **Config Account**: Stores peers and settings
- **Message Accounts**: Store incoming/outgoing messages
- **Authority**: Controls the program

### 3. Fees

Solana has lower transaction fees, but LayerZero fees include:
- DVN verification (same as EVM)
- Executor costs (lower on Solana)
- Solana rent (for account creation)

Typical Solana message fee: **~0.001-0.01 ETH** (varies by DVN/Executor)

### 4. Confirmation Times

Solana has faster finality:
- **Solana finality**: ~30 seconds
- **EVM → Solana**: Wait for EVM finality (1-5 minutes)
- **Solana → EVM**: Faster verification on Solana side

**Note:** For cross-VM messaging with Solana, you can also configure the connection in `layerzero.config.ts` if you have both EVM and Solana contracts deployed. However, due to the different tooling requirements, manual peer configuration (as shown above) is often easier for initial setup.

## Receiving Messages from Solana

When Solana sends to your EVM contract:

```solidity
function _lzReceive(
    Origin calldata _origin,
    bytes32 /*_guid*/,
    bytes calldata _payload,
    address /*_executor*/,
    bytes calldata /*_extraData*/
) internal override {
    // Decode Solana-sent data
    // Solana programs can encode data in compatible formats
    (uint256 id, string memory data) = abi.decode(_payload, (uint256, string));

    // Process message from Solana
    handleSolanaMessage(_origin.srcEid, id, data);
}
```

## Practical Use Cases

### 1. Solana NFT Bridging

```solidity
// EVM → Solana: Lock NFT on EVM, mint on Solana
function bridgeNFTToSolana(uint256 tokenId, bytes32 solanaRecipient) external {
    // Lock NFT
    nft.transferFrom(msg.sender, address(this), tokenId);

    // Send mint instruction to Solana
    bytes memory payload = abi.encode("MINT", tokenId, solanaRecipient);
    _lzSend(solanaEid, payload, options, fee, refundAddress);
}
```

### 2. Price Oracle

```solidity
// Request price data from Solana DeFi
function requestSolanaPrice(string calldata token) external payable {
    bytes memory payload = abi.encode("PRICE_REQUEST", token);
    _lzSend(solanaEid, payload, options, fee, refundAddress);
}

// Receive price from Solana
function _lzReceive(...) internal override {
    (string memory action, uint256 price) = abi.decode(_payload, (string, uint256));
    if (keccak256(bytes(action)) == keccak256("PRICE_RESPONSE")) {
        updatePrice(price);
    }
}
```

### 3. Cross-VM Governance

```solidity
// Broadcast governance decision to Solana
function notifySolana(uint256 proposalId, bool approved) external onlyGovernance {
    bytes memory payload = abi.encode("GOVERNANCE", proposalId, approved);
    _lzSend(solanaEid, payload, options, fee, refundAddress);
}
```

## Testing Without Solana Deployment

If you don't have a Solana OApp deployed, you can still test the EVM side:

1. **Deploy the EVM contract**
2. **Set a dummy Solana peer** (any bytes32 value)
3. **Send messages** (they won't be delivered but you can verify encoding/fees)
4. **Monitor LayerZero Scan** to see messages reach the DVN stage

```javascript
// Set a test peer
const testSolanaPeer =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
await messenger.setSolanaPeer(40168, testSolanaPeer);

// Send test message
const fee = await messenger.quoteToSolana(40168, "Test", "0x");
await messenger.sendToSolana(40168, "Test", "0x", { value: fee.nativeFee });
```

## Common Issues and Solutions

### Issue 1: "Peer not found" on Solana side

**Problem**: Solana OApp doesn't have EVM contract set as peer.

**Solution**: Configure peers on both sides:
- EVM: `setPeer(solanaEid, solanaPubkey)` (via console or `lz:oapp:wire` if configured)
- Solana: Configure equivalent peer setting using Solana tooling

### Issue 2: Address conversion errors

**Problem**: Incorrect bytes32 format.

**Solution**: Use proper conversion:

```javascript
// JavaScript: Solana pubkey to bytes32
const { PublicKey } = require("@solana/web3.js");
const pubkey = new PublicKey("YourSolanaPubkey");
const bytes32 = "0x" + pubkey.toBuffer().toString("hex");
```

### Issue 3: High fees for Solana

**Problem**: Fees seem higher than expected.

**Solution**: Solana messages cost similar to EVM due to DVN/Executor costs. Optimize payload size:

```solidity
// Use packed encoding for smaller payloads
bytes memory payload = abi.encodePacked(id, message);
```

## Advanced Topics

### Message Encoding Best Practices

```solidity
// For cross-VM compatibility, use simple types:
// ✅ GOOD
bytes memory payload = abi.encode(uint256, bytes32, bool);

// ⚠️ BE CAREFUL
bytes memory payload = abi.encode(string, address[], struct);
// Strings and arrays work but cost more gas
// Structs need careful handling on Solana side
```

### Gas Estimation for Solana

```javascript
// Solana typically needs less compute than EVM
const solanaOptions = Options.newOptions()
  .addExecutorLzReceiveOption(
    50000, // Lower compute units
    0 // No native value transfer
  )
  .toHex();
```

### Monitoring Cross-VM Messages

```javascript
// Listen for Solana-bound messages
messenger.on("MessageSentToSolana", (solanaEid, messageId, message, fee) => {
  console.log(`Message ${messageId} sent to Solana: "${message}"`);
  console.log(`Fee paid: ${ethers.utils.formatEther(fee)} ETH`);
});
```

## Resources

### LayerZero Solana Documentation

- [Solana OApp Guide](https://docs.layerzero.network/v2/developers/solana/overview)
- [Endpoint Addresses](https://docs.layerzero.network/v2/developers/solana/technical-reference/deployed-contracts)
- [Solana Message Lib](https://docs.layerzero.network/v2/developers/solana/configuration/default-config)

### Solana Development

- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Devnet Faucet](https://faucet.solana.com/)

### Tools

- [LayerZero Scan](https://layerzeroscan.com) - Track cross-VM messages
- [Solana Explorer](https://explorer.solana.com/?cluster=devnet) - View Solana transactions
- [Base58 Converter](https://appdevtools.com/base58-encoder-decoder) - Convert Solana addresses

## Key Takeaways

✅ EVM and Solana can communicate via LayerZero V2

✅ All addresses are converted to 32-byte format

✅ Solana uses compute units instead of gas

✅ Cross-VM messages work the same as EVM-to-EVM

✅ Both sides need proper peer configuration

✅ Fees are similar to EVM messaging (DVN + Executor costs)

✅ Payload encoding should be simple for cross-VM compatibility

✅ Track messages on LayerZero Scan across both ecosystems

## Next Steps

- **Challenges**: Complete the OApp challenges to test your knowledge
- **Build a Bridge**: Create a full EVM ↔ Solana asset bridge
- **Explore Solana**: Learn Rust/Anchor to build Solana OApps
- **Production**: Deploy to mainnets and implement security best practices

## Exercise: Build a Cross-VM Counter

Challenge: Create a synchronized counter that works across EVM and Solana:

1. Deploy on Ethereum Sepolia
2. Deploy on Solana Devnet (if you know Solana)
3. Increment counter on EVM → Sync to Solana
4. Increment counter on Solana → Sync to EVM
5. Keep global count synchronized

This demonstrates bidirectional cross-VM state synchronization!
