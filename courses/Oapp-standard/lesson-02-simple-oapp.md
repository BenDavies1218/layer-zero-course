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

### Step 4: Send function

The send function needs to:

1. Encode the message
2. Combine the call options with the contracts enforment options.
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
function quoteSend(
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

Compile all contracts (uses both Forge and Hardhat)

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

1. **Deploy Contracts** - Use `pnpm deploy:contracts` to deploy to multiple chains
2. **Verify Contracts** - Verify the contracts so there methods can be seen on block explorers
3. **Wire Contracts** - Configure the contracts to only accept messages from one another

### Step 1: Deploy Contracts

Run the deployment command:

```bash
pnpm deploy:contracts
```

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

### Step 2: Verify Contracts

After deployment, verify your contracts on block explorers (Etherscan, Arbiscan, etc.) to make the source code publicly viewable.

**Run verification:**

```bash
# For Arbitrum Sepolia deployment
pnpm hardhat verify --network arbitrum-sepolia --contract contracts/Oapp/SimpleMessenger.sol:SimpleMessenger 0x6EDCE65403992e310A62460808c4b910D972f10f

# For Ethereum Sepolia deployment
pnpm hardhat verify --network ethereum-sepolia --contract contracts/Oapp/SimpleMessenger.sol:SimpleMessenger 0x6EDCE65403992e310A62460808c4b910D972f10f
```

**Note:** The `--contract` flag specifies the exact contract path to avoid ambiguity. The EndpointV2 address (`0x6EDCE65403992e310A62460808c4b910D972f10f`) is the same for all testnets. This will change for mainnet deployment / solana deployments.

**Example Output:**

```
Successfully submitted source code for contract
contracts/Oapp/SimpleMessenger.sol:SimpleMessenger at 0xABC123...
for verification on the block explorer. Waiting for verification result...

Successfully verified contract SimpleMessenger on the block explorer.
https://sepolia.arbiscan.io/address/0xABC123...#code
```

### Step 3: Wire Contracts (Configure Cross-Chain Connections)

Note that solana peer configuration requires a custom config file and will require the manual deployment, also the solana Oapp needs to be deployed first as well from a repository that supports solana.

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

**What Wiring Accomplishes:**

- **Peer Registration**: Each contract knows the trusted address of its counterpart on other chains
- **Enforced Options**: Minimum gas limits are set to prevent execution failures
- **DVN Configuration**: Decentralized verifiers are configured to secure message delivery
- **Bidirectional Communication**: Both directions of each pathway are configured (A→B and B→A)

## Next Steps

Congratulations! You've built and deployed your first OApp.

In the next lesson, you'll learn how to create custom Hardhat tasks to interact with your deployed contracts, providing a convenient interface for common operations like sending messages and querying status.

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
