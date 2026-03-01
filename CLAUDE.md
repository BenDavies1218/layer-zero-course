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
pnpm deploy:contracts
```

Interactive deployment script that deploys OApp contracts to networks defined in `hardhat.config.ts` with their corresponding Endpoint IDs (EIDs).

**Wire OApp connections (enable cross-chain messaging):**

```bash
pnpm wire
```

Configures peers, enforced options, DVNs, and message libraries. Run this after deployment and whenever you update peer configuration files in `deployments/peer-configurations/`.

**Check current configuration:**

```bash
pnpm hardhat lz:oapp:config:get --oapp-config deployments/peer-configurations/CONTRACT_NAME.config.ts
```

Shows custom, default, and active configurations for each pathway.

### Sending Cross-Chain Messages

```bash
pnpm hardhat lz:oapp:send --contract SimpleMessenger --dst-eid 40231 --message 'Hello from Base!' --network base-sepolia
```

- `--contract`: Contract name to send from (e.g., SimpleMessenger, PingPong)
- `--dst-eid`: Destination Endpoint ID (e.g., 40231 for Arbitrum Sepolia, 40245 for Base Sepolia)
- `--message`: Message to send
- `--network`: Source network (from hardhat.config.ts)
- `--gas-limit`: Optional gas limit for lzReceive (default: 200000)
- Returns LayerZero Scan link for tracking message delivery

## Architecture

### Core Contracts

**SimpleMessenger.sol** (`contracts/Oapp/SimpleMessenger.sol`)

- Basic OApp implementation inheriting from `OApp` and `OAppOptionsType3`
- Implements `send()` for sending cross-chain messages
- Overrides `_lzReceive()` to handle incoming messages
- Stores last received message in `lastMessage` state variable
- Uses message type `SEND = 1` for enforced options

**PingPong.sol** (`contracts/Oapp/PingPong.sol`)

- ABA pattern implementation (ping-pong messaging)
- Demonstrates request-response workflow between chains
- Implements automatic reply mechanism in `_lzReceive()`

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

1. User calls `send()` with destination EID and message
2. OApp calls `_lzSend()` to local Endpoint V2
3. DVNs verify the message cross-chain
4. Executor delivers message to destination Endpoint V2
5. Destination Endpoint calls `lzReceive()` on peer OApp
6. OApp's `_lzReceive()` processes the message

### Configuration Files

**Peer Configuration Files** (`deployments/peer-configurations/`)

- Each OApp has a dedicated config file (e.g., `SimpleMessenger.config.ts`, `PingPong.config.ts`)
- Defines OApp contracts per chain with their Endpoint IDs
- Configures pathways between chains (automatically bidirectional)
- Sets enforced options (gas limits for `lzReceive` execution)
- Specifies DVN requirements and confirmations per pathway
- Used by wiring script to configure OApp connections

**hardhat.config.ts**

- Network configurations with RPC URLs and accounts
- Each network must have an `eid` property set to its LayerZero Endpoint ID
- Default networks: `arbitrum-sepolia` (EID 40231), `base-sepolia` (EID 40245), and `ethereum-sepolia` (EID 40161)
- Uses environment variables for EVM_PRIVATE_KEY and ALCHEMY_API_KEY

**foundry.toml**

- Foundry-specific configuration with Solidity 0.8.22
- Custom remappings for LayerZero and OpenZeppelin packages
- Source in `contracts/`, tests in `test/foundry/`, output in `out/`

### Testing Architecture

**Foundry Tests** (`test/foundry/`)

- Uses `TestHelperOz5` from `@layerzerolabs/test-devtools-evm-foundry`
- Sets up mock endpoints for multiple chains (aEid, bEid)
- `wireOApps()` helper automatically configures peer relationships
- `verifyPackets()` simulates cross-chain message delivery
- Tests use `OptionsBuilder` to construct execution options

**Hardhat Tests** (`test/hardhat/`)

- Standard Hardhat + Ethers.js testing setup

### Deployment System

**Interactive Deployment** (`pnpm deploy:contracts`)

- Uses LayerZero Hardhat toolbox for interactive deployment
- Automatically retrieves LayerZero EndpointV2 address for the network
- Deploys with deployer as initial owner
- Deployment artifacts stored in `deployments/{network}/` directories

**Wiring Script** (`scripts/wire.sh`)

- Configures peer relationships between deployed contracts
- Uses configuration from `deployments/peer-configurations/`
- Sets up DVNs, enforced options, and message libraries

**Custom Tasks** (`tasks/send.ts`)

- Implements `lz:oapp:send` task for sending messages
- Quotes gas costs before sending
- Provides structured error handling and logging
- Returns LayerZero Scan links and block explorer links

### Environment Setup

Required environment variables (see `.env.example`):

- `EVM_PRIVATE_KEY` - Deployer account private key
- `ALCHEMY_API_KEY` - Shared Alchemy API key for RPC access
- `RPC_URL_ARB_SEPOLIA` - Base RPC URL for Arbitrum Sepolia
- `RPC_URL_BASE_SEPOLIA` - Base RPC URL for Base Sepolia
- `RPC_URL_SEPOLIA` - Base RPC URL for Ethereum Sepolia
- RPC URLs are constructed as `RPC_URL_BASE + ALCHEMY_API_KEY`

## Important Development Notes

### Working with OApps

1. **Peer Configuration**: OApps must have peers configured on both chains before messaging works. The `pnpm wire` script handles this automatically based on config files in `deployments/peer-configurations/`.

2. **Enforced Options**: Set minimum gas limits for destination execution in peer configuration files (`deployments/peer-configurations/`). The value of 80,000 gas for `LZ_RECEIVE` is a starting point - profile your `_lzReceive()` function to determine actual requirements.

3. **Fee Estimation**: Always call `quote()` before sending to get the required native fee. Fees cover DVN verification and Executor delivery costs.

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
- **lesson-03-hardhat-tasks.md**: Working with LayerZero Hardhat tasks
- **lesson-04-aba-messaging.md**: Ping-pong messaging pattern (ABA pattern)
- **lesson-05-multichain-messaging.md**: Broadcasting to multiple chains
- **lesson-06-protocol-deep-dive.md**: Low-level protocol internals and message flow
- **lesson-07-challenges.md**: Overview of challenge exercises
- **challenges/**: Practical coding challenges (Chain Whisperer, Quantum Thief, Cosmic Voting, Bridge Breaker)

### Example Contracts

The repository includes example contracts in `contracts/lessons/Oapp/` for educational purposes:

- **ExampleSimpleMessenger.sol**: Basic cross-chain messaging (used in lesson-02)
- **ExamplePingPong.sol**: ABA pattern implementation (used in lesson-04)
- **ExampleMultichainBroadcaster.sol**: Broadcasting to multiple chains (used in lesson-05)
- **EscrowRaceVulnerable.sol**: Intentionally vulnerable contract for security challenges
- **VaultCorp.sol**: Challenge contract for security exercises

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
