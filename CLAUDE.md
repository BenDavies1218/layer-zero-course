# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LayerZero V2 educational course repository for learning cross-chain (omnichain) messaging using the OApp standard. The project contains Solidity smart contracts that enable cross-chain communication between EVM chains, along with deployment scripts, configuration utilities, and comprehensive course materials.

## Common Commands

### Build & Test
```bash
# Compile contracts
npx hardhat compile

# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test src/tests/SimpleMessenger.test.ts

# Clean build artifacts
npx hardhat clean
```

### Deployment
```bash
# Deploy to specific testnet (replace network name as needed)
npx hardhat run src/scripts/deploy.ts --network ethereum-sepolia
npx hardhat run src/scripts/deploy.ts --network arbitrum-sepolia

# Configure peers after deployment
npx hardhat run src/scripts/configure.ts --network ethereum-sepolia
npx hardhat run src/scripts/configure.ts --network arbitrum-sepolia
```

### Interactive Console
```bash
# Open Hardhat console for specific network
npx hardhat console --network ethereum-sepolia

# Example console commands:
# const messenger = await ethers.getContractAt("SimpleMessenger", "0xYourAddress");
# const fee = await messenger.quote(40231, "Hello!", "0x", false);
# await messenger.sendMessage(40231, "Hello!", "0x", {value: fee.nativeFee});
```

## Architecture

### Core LayerZero Concepts

**OApp Pattern**: All cross-chain contracts in this repo inherit from LayerZero's `OApp` base contract which provides:
- `_lzSend()` - Send messages to other chains via LayerZero Endpoint V2
- `_lzReceive()` - Receive messages from other chains (must be overridden)
- Peer validation - Only registered peer contracts on other chains can send messages
- Ownership controls via OpenZeppelin's `Ownable`

**Message Flow**:
1. User calls send function on source chain OApp
2. OApp encodes message and calls `_lzSend()` on local Endpoint V2
3. DVNs (Decentralized Verifier Networks) verify the message off-chain
4. Executor delivers verified message to destination chain Endpoint V2
5. Destination Endpoint calls `lzReceive()` on destination OApp
6. Destination OApp's `_lzReceive()` processes the message

**Endpoint IDs (EIDs)**: Each chain has a unique identifier:
- Ethereum Sepolia: 40161
- Arbitrum Sepolia: 40231
- Optimism Sepolia: 40232
- Base Sepolia: 40245
- Polygon Amoy: 40267

### Project Structure

```
src/
├── contracts/          # Solidity smart contracts
│   ├── Oapp/          # Student implementation contracts (incomplete templates)
│   └── examples/Oapp/ # Complete reference implementations
├── scripts/           # Deployment and configuration scripts
│   ├── deploy.ts     # Generic OApp deployment script
│   └── configure.ts  # Peer configuration script
├── tests/            # Hardhat test files
├── utils/            # Utility scripts for complex deployments
└── diagrams/         # Visual documentation (SVG flow diagrams)

courses/              # Course lesson materials (Markdown)
├── Oapp-standard/
│   ├── lesson-01-basics.md
│   ├── lesson-02-simple-oapp.md
│   └── challenges/
```

**Key distinction**:
- `src/contracts/Oapp/` contains starter templates for students to complete
- `src/contracts/examples/Oapp/` contains fully implemented reference contracts
- Example: `SimpleMessenger.sol` in Oapp/ is a template, ExampleSimpleMessenger.sol in examples/Oapp/ is complete

### Contract Requirements

Every OApp implementation must:
1. Inherit from `OApp` and `OAppOptionsType3`
2. Pass `_endpoint` and `_owner` addresses to parent constructors
3. Implement `_lzReceive()` to handle incoming cross-chain messages
4. Define message types as constants (e.g., `uint16 public constant SEND = 1`)
5. Use `combineOptions()` to merge enforced options with caller options
6. Emit events for message sending and receiving

### Deployment & Configuration Pattern

OApps require a two-step setup:
1. **Deploy**: Deploy identical contracts to multiple chains
2. **Configure Peers**: Call `setPeer(dstEid, peerAddress)` on each chain to establish trust relationships

Peers must be set bidirectionally. For example, to enable Sepolia ↔ Arbitrum communication:
- On Sepolia: `setPeer(40231, addressOnArbitrum)`
- On Arbitrum: `setPeer(40161, addressOnSepolia)`

### Fee Quoting & Payment

Always call `quote()` before sending messages to calculate required fees:
```solidity
function quote(
    uint32 _dstEid,
    string calldata _message,
    bytes calldata _options,
    bool _payInLzToken
) external view returns (MessagingFee memory fee);
```

The returned `MessagingFee.nativeFee` covers:
- DVN verification costs
- Executor gas costs on destination chain
- LayerZero protocol fees

Pass this fee as `msg.value` when calling send functions.

## Environment Setup

Required environment variables (see `.env.example`):
- `PRIVATE_KEY` - Deployment wallet private key (must start with 0x and be 66 chars)
- `ALCHEMY_API_KEY` - Alchemy API key for RPC endpoints
- `ETHERSCAN_API_KEY` - Optional, for contract verification

RPC endpoints are configured in `hardhat.config.ts` to use Alchemy with fallback public RPCs.

## Development Notes

**Hardhat Configuration**:
- Solidity version: 0.8.22
- Custom paths: sources in `./src/contracts`, tests in `./src/tests`
- Networks configured with EID properties for LayerZero compatibility

**TypeScript**: Project uses TypeScript for scripts and tests. TypeChain automatically generates type definitions in `typechain-types/` during compilation.

**Message Tracking**: Use [LayerZero Scan](https://layerzeroscan.com) to track cross-chain messages. Expected timeline:
- Verification: 1-5 minutes
- Execution: 1-2 minutes after verification

**Gas Considerations**:
- Use `OptionsBuilder` to set custom gas limits for destination execution
- Set enforced options as contract owner to ensure minimum gas for complex operations
- Default options (`0x`) work for simple messages but may fail for storage-heavy operations

## Testing Strategy

The repo uses Hardhat for testing but note:
- Basic unit tests verify contract deployment and state
- Full cross-chain testing requires LayerZero's mock endpoint utilities
- Testnet deployment and manual testing via console is the primary validation method
- Always test on testnets before mainnet deployment

## Common Patterns

**Encoding/Decoding Messages**:
```solidity
// Encode
bytes memory payload = abi.encode(_message);

// Decode
string memory message = abi.decode(_payload, (string));
```

**Refund Pattern**:
Always specify `payable(msg.sender)` as the refund address in `_lzSend()` to return excess fees.

**Peer Address Conversion**:
Peer addresses must be bytes32. Use `bytes32(uint256(uint160(address)))` or ethers utilities to convert.

## Resources & Documentation

- LayerZero V2 Docs: https://docs.layerzero.network/v2
- OApp Standard: https://docs.layerzero.network/v2/developers/evm/oapp/overview
- Endpoint Addresses: https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts
- Message Tracking: https://layerzeroscan.com

Course materials in `courses/Oapp-standard/` provide step-by-step tutorials with detailed explanations of the protocol architecture, security considerations, and implementation patterns.
