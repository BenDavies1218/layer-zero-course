# Lesson 02 — Building Your First OApp

In this lesson, you'll build a simple cross-chain messaging application using LayerZero V2's OApp standard. We'll create a contract that can encoded messages between chains, deploy it to two testnets and verify them.

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

### Step 4: Quoting Fees function

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

### Step 5: Send function

The send function needs to:

1. Encode the message
2. Combine the call options with the contracts enforment options.
3. Call `_lzSend()` with proper parameters

```typescript
function send(
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

### Step 6: Internal Receiving Messages function

Override `_lzReceive()` to handle incoming messages:

```typescript
function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid, // Message GUID
    bytes calldata _payload,
    address _executor, // Executor address
    bytes calldata _extraData // Extra data
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

Compile all contracts

```bash
pnpm compile
```

If you need to clean and recompile

```bash
pnpm clean && pnpm compile
```

This will:

- Compile all Solidity files in `contracts/`
- Generate TypeScript type definitions in `typechain-types/`
- Create artifacts in `artifacts/` and `out/`

## Deployment Process

Deploying an OApp involves three main steps:

1. **Deploy Contracts**
2. **Verify Contracts**
3. **Wire Contracts**

### Step 1: Deploy Contracts

Run the deployment command:

```bash
pnpm hardhat lz:deploy --tags SimplerMessenger
```

**Example Output:**

```text
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

### Step 2: Verify Contracts (Optional but good practice)

After deployment, verify your contracts on block explorers (Etherscan, Arbiscan, etc.) to make the source code publicly viewable.

**Run verification:**

For Arbitrum Sepolia verification

```bash
pnpm hardhat verify --network arbitrum-sepolia --contract contracts/Oapp/SimpleMessenger.sol:SimpleMessenger <DEPLOYED_CONTRACT_ADDRESS> <LAYERZERO_V2_ENDPOINT_ADDRESS> <DEPLOYER_PUBLIC_ADDRESS>
```

For ethereum Sepolia verification

```bash
pnpm hardhat verify --network ethereum-sepolia --contract contracts/Oapp/SimpleMessenger.sol:SimpleMessenger <DEPLOYED_CONTRACT_ADDRESS> <LAYERZERO_V2_ENDPOINT_ADDRESS> <DEPLOYER_PUBLIC_ADDRESS>
```

### Step 3: Wire Contracts (Configure Cross-Chain Connections)

Note that solana peer configuration requires a custom config file and will require the manual deployment, also the solana Oapp needs to be deployed first as well from a repository that supports solana.

After deployment, contracts need to be "wired" to establish trusted peer relationships and configure messaging parameters.

**Run the interactive wiring tool:**

```bash
pnpm wire
```

### Wiring Transaction Execution

Runs: pnpm hardhat lz:oapp:wire --oapp-config deployments/peer-configurations/{ContractName}.config.ts

For each pathway, LayerZero CLI:

1. Prompts for transaction signing:

2. Shows proposed configuration changes
   Asks which network to sign transactions on
   Lists all required transactions (setPeer, setEnforcedOptions, setConfig for DVNs, etc.)

3. Executes transactions on each chain:

4. setPeer(dstEid, peerAddress) - Registers peer contract on destination chain
5. setEnforcedOptions(dstEid, msgType, options) - Sets minimum execution gas
6. setConfig(...) - Configures DVNs and confirmations for message verification
7. Waits for confirmations:
8. Each transaction must be mined before proceeding Shows transaction hashes and block explorer links
9. Verifies configuration:

10. Reads back on-chain configuration Compares with desired configuration from config file Reports any discrepancies

**What Wiring Accomplishes:**

- **Peer Registration**: Each contract knows the trusted address of its counterpart on other chains
- **Enforced Options**: Minimum gas limits are set to prevent execution failures
- **DVN Configuration**: Decentralized verifiers are configured to secure message delivery
- **Bidirectional Communication**: Both directions of each pathway are configured (A→B and B→A)

## Next Steps

Congratulations! You've built and deployed your first OApp.

In the next lesson, you'll learn how to create Hardhat tasks to interact with your deployed contracts, providing a convenient interface for common operations like sending messages and querying status.

[Start Lesson 03 - Hardhat Tasks](./lesson-03-hardhat-tasks.md)

## Key Takeaways

- OApps extend `OApp` and `OAppOptionsType3` for cross-chain messaging
- Always implement both send (`_lzSend`) and receive (`_lzReceive`) logic
- Peers must be set on both chains for bidirectional communication
- Always quote fees before sending messages
- Use enforced options to guarantee sufficient gas for execution
- Track messages on LayerZero Scan for debugging
- Test thoroughly on testnets before mainnet deployment

## Resources

- [LayerZero V2 Documentation](https://docs.layerzero.network/v2) - Official documentation
- [LayerZero Scan](https://layerzeroscan.com) - Track your messages
- [Endpoint Addresses](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts) - All networks
- [Deploying Contracts](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/deploying) - Deployment guide
- [Wiring OApps](https://docs.layerzero.network/v2/developers/evm/create-lz-oapp/wiring) - Configuration guide

## Extended

### Manual Contract Wiring (Required for solana and more custom configs)

1. Create your config file

   ```typescript
   import { EndpointId } from "@layerzerolabs/lz-definitions";
   import { ExecutorOptionType } from "@layerzerolabs/lz-v2-utilities";

   const arbitrumContract: OmniPointHardhat = {
     eid: EndpointId.ARBSEP_V2_TESTNET,
     contractName: "SimpleMessenger",
   };

   const ethereumContract: OmniPointHardhat = {
     eid: EndpointId.SEPOLIA_V2_TESTNET,
     contractName: "SimpleMessenger",
   };

   const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
     {
       msgType: 1,
       optionType: ExecutorOptionType.LZ_RECEIVE,
       gas: 200000,
       value: 0,
     },
   ];

   const pathways: TwoWayConfig[] = [
     [
       arbitrumContract,
       ethereumContract,
       [["LayerZero Labs"], []],
       [1, 1],
       [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
     ],
   ];
   ```

```bash
`pnpm hardhat lz:oapp:wire --oapp-config {path-to-config}
```

**Common Wiring Issues:**

- **"Insufficient funds"**: Ensure deployer has native tokens on all networks
- **"Transaction failed"**: Check gas limits and RPC connectivity
- **"Peer already set"**: This is okay - the tool will skip if already configured
- **"Unauthorized"**: Ensure you're using the owner account specified during deployment
