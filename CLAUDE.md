# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a LayerZero V2 OApp (Omnichain Application) development repository that serves both as a working example and an educational course. It demonstrates cross-chain messaging using LayerZero protocol and includes comprehensive lessons and challenges for learning omnichain development.

## Essential Commands

### Build & Compile
```bash
pnpm compile              # Compile using both Forge and Hardhat
pnpm compile:forge        # Compile using Foundry only
pnpm compile:hardhat      # Compile using Hardhat only
pnpm clean                # Clean artifacts, cache, and build outputs
```

### Testing
```bash
pnpm test                 # Run all tests (Forge + Hardhat)
pnpm test:forge           # Run Foundry tests only
pnpm test:hardhat         # Run Hardhat tests only
```

### Linting
```bash
pnpm lint                 # Lint JavaScript/TypeScript and Solidity
pnpm lint:js              # Lint JS/TS files only
pnpm lint:sol             # Lint Solidity files only
pnpm lint:fix             # Auto-fix linting issues
```

### Deployment & Configuration

**Deploy OApp contracts:**
```bash
pnpm hardhat lz:deploy --tags MyOApp
```
Select chains interactively. Deploys to networks defined in `hardhat.config.ts` with their corresponding Endpoint IDs (EIDs).

**Wire OApp connections (enable cross-chain messaging):**
```bash
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```
Configures peers, enforced options, DVNs, and message libraries. Run this after deployment and whenever you update `layerzero.config.ts`.

**Check current configuration:**
```bash
pnpm hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
```
Shows custom, default, and active configurations for each pathway.

**Initialize new config file:**
```bash
pnpm hardhat lz:oapp:config:init --contract-name CONTRACT_NAME --oapp-config FILE_NAME
```

### Sending Cross-Chain Messages

```bash
pnpm hardhat lz:oapp:send --dst-eid 40231 --string 'Hello from Base!' --network base-sepolia
```
- `--dst-eid`: Destination Endpoint ID (e.g., 40231 for Arbitrum Sepolia, 40245 for Base Sepolia)
- `--string`: Message to send
- `--network`: Source network (from hardhat.config.ts)
- Returns LayerZero Scan link for tracking message delivery

## Architecture

### Core Contracts

**MyOApp.sol** (`contracts/MyOApp.sol`)
- Main OApp implementation inheriting from `OApp` and `OAppOptionsType3`
- Implements `sendString()` for sending cross-chain messages
- Overrides `_lzReceive()` to handle incoming messages
- Stores last received message in `lastMessage` state variable
- Uses message type `SEND = 1` for enforced options

### Key Architectural Concepts

**OApp Pattern:**
- Contracts inherit from `OApp` base contract from `@layerzerolabs/oapp-evm`
- `_lzSend()` sends messages to destination chains via local Endpoint V2
- `_lzReceive()` receives and processes messages from peer OApps
- Peer validation is automatic - only registered peers can communicate
- Each OApp has one owner who controls configuration

**LayerZero Components:**
- **Endpoint V2**: Chain-specific LayerZero contract handling all cross-chain operations
- **DVNs (Decentralized Verifier Networks)**: Off-chain services that verify cross-chain messages
- **Executors**: Deliver verified messages to destination chain and pay gas for execution
- **Peers**: Trusted counterpart OApp addresses on other chains (registered via `setPeer()`)

**Message Flow:**
1. User calls `sendString()` with destination EID and message
2. OApp calls `_lzSend()` to local Endpoint V2
3. DVNs verify the message cross-chain
4. Executor delivers message to destination Endpoint V2
5. Destination Endpoint calls `lzReceive()` on peer OApp
6. OApp's `_lzReceive()` processes the message

### Configuration Files

**layerzero.config.ts**
- Defines OApp contracts per chain with their Endpoint IDs
- Configures pathways between chains (automatically bidirectional)
- Sets enforced options (gas limits for `lzReceive` execution)
- Specifies DVN requirements and confirmations per pathway
- Used by wiring task to configure OApp connections

**hardhat.config.ts**
- Network configurations with RPC URLs and accounts
- Each network must have an `eid` property set to its LayerZero Endpoint ID
- Default networks: `arbitrum-sepolia` (EID 40231) and `base-sepolia` (EID 40245)
- Uses environment variables for MNEMONIC/PRIVATE_KEY and ALCHEMY_API_KEY

**foundry.toml**
- Foundry-specific configuration with Solidity 0.8.22
- Custom remappings for LayerZero and OpenZeppelin packages
- Source in `contracts/`, tests in `test/foundry/`, output in `out/`

### Testing Architecture

**Foundry Tests** (`test/foundry/MyOApp.t.sol`)
- Uses `TestHelperOz5` from `@layerzerolabs/test-devtools-evm-foundry`
- Sets up mock endpoints for multiple chains (aEid, bEid)
- `wireOApps()` helper automatically configures peer relationships
- `verifyPackets()` simulates cross-chain message delivery
- Tests use `OptionsBuilder` to construct execution options

**Hardhat Tests** (`test/hardhat/MyOApp.test.ts`)
- Standard Hardhat + Ethers.js testing setup

### Deployment System

**Deploy Scripts** (`deploy/MyOApp.ts`)
- Uses `hardhat-deploy` plugin with named accounts
- Automatically retrieves LayerZero EndpointV2 address for the network
- Deploys with deployer as initial owner
- Tag system allows selective deployment (e.g., `--tags MyOApp`)

**Custom Tasks** (`tasks/sendString.ts`)
- Implements `lz:oapp:send` task for sending messages
- Quotes gas costs before sending
- Provides structured error handling and logging
- Returns LayerZero Scan links and block explorer links

### Environment Setup

Required environment variables (see `.env.example`):
- `MNEMONIC` or `PRIVATE_KEY` - Deployer account credentials
- `ALCHEMY_API_KEY` - Shared Alchemy API key for RPC access
- RPC URLs are constructed as `RPC_URL_BASE + ALCHEMY_API_KEY`

## Important Development Notes

### Working with OApps

1. **Peer Configuration**: OApps must have peers configured on both chains before messaging works. The `lz:oapp:wire` task handles this automatically based on `layerzero.config.ts`.

2. **Enforced Options**: Set minimum gas limits for destination execution in `layerzero.config.ts`. The value of 80,000 gas for `LZ_RECEIVE` is a starting point - profile your `_lzReceive()` function to determine actual requirements.

3. **Fee Estimation**: Always call `quoteSendString()` before sending to get the required native fee. Fees cover DVN verification and Executor delivery costs.

4. **Message Encoding**: Use `abi.encode()` and `abi.decode()` for structured data. For complex types, consider using custom encoding patterns.

5. **Endpoint IDs (EIDs)**: Each chain has a unique EID (e.g., 40231 for Arbitrum Sepolia). These are defined in `@layerzerolabs/lz-definitions` and must match in `hardhat.config.ts`.

### Security Considerations

- **Origin Validation**: The base `OApp` contract automatically validates that messages come from registered peers. No additional validation needed in `_lzReceive()`.
- **Reentrancy**: Follow checks-effects-interactions pattern in `_lzReceive()` - update state before external calls.
- **Gas Limits**: Insufficient gas in enforced options will cause message delivery failure on destination chain.
- **Ownership**: Contract owner controls peer configuration, enforced options, and DVN settings. Use multisig for production.

### Common Patterns

**ABA Pattern (Ping-Pong)**: Message from Chain A to Chain B triggers another message back to Chain A. Used for request-response workflows.

**Batch Send Pattern**: Send multiple messages to different chains in a single transaction. Useful for broadcasting state updates.

### TypeScript Configuration

- Target: ES2020, CommonJS modules
- Includes: `deploy/`, `test/`, `tasks/`, `hardhat.config.ts`
- Types available: Node.js and Mocha

## Course Structure

The repository includes educational content in `courses/Oapp-standard/`:
- **lesson-01-basics.md**: LayerZero architecture and core concepts
- **lesson-02-simple-oapp.md**: Building and deploying your first OApp
- **lesson-03-aba-messaging.md**: Ping-pong messaging pattern
- **lesson-04-multichain-messaging.md**: Broadcasting to multiple chains
- **lesson-05-solana-interaction.md**: Cross-chain with Solana
- **lesson-06-challenges.md**: Overview of challenge exercises
- **challenges/**: Practical coding challenges (Chain Whisperer, Quantum Thief, Cosmic Voting, Bridge Breaker, Nexus Prime)

When modifying code for lessons or challenges, ensure changes align with the educational objectives and maintain working examples.

## Package Management

This project uses `pnpm` as the primary package manager. The repository includes `pnpm-lock.yaml` and `pnpm` overrides in `package.json`. While npm/yarn should work, pnpm is recommended for consistency.

## Troubleshooting

- **"No send library"**: Network config missing `eid` property in `hardhat.config.ts`
- **"Only peer" error**: Peers not configured - run `lz:oapp:wire`
- **Message not delivered**: Check LayerZero Scan link for status, verify gas limits in enforced options
- **Deployment fails**: Ensure deployer account has native tokens on target chain
- **Contract size limit**: Hardhat config already sets `allowUnlimitedContractSize: true` for local testing

Refer to [LayerZero Troubleshooting Docs](https://docs.layerzero.network/v2/developers/evm/troubleshooting/debugging-messages) for detailed debugging.
