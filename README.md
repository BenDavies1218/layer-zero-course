# Quick Start: Get Started building Omnichain Apps in 5 minutes

This course will get you from zero to cross-chain hero using LayerZero V2 Protocol.

## Prerequisites Check

Before you start, make sure you have:

- ✅ Node.js v22 installed and running ([Download here](https://nodejs.org/)) hardhat seems to not like the newest version of node.
- ✅ pnpm installed (`pnpm install -g pnpm`)

## Repository Structure

Here's what you'll find in this repository:

```text
layer-zero-course/
├── contracts/
│   ├── Oapp/                         # Your OApp contracts
│   │   └── SimpleMessenger.sol
│   └── lessons/Oapp/                 # Example lesson contracts
│       ├── ExampleSimpleMessenger.sol
│       ├── ExamplePingPong.sol
│       ├── ExampleMultichainBroadcaster.sol
│       ├── ExampleSolanaMessenger.sol
│       └── RivalOappContract.sol
├── courses/
│   └── Oapp-standard/                # OApp course lessons
│       ├── lesson-01-basics.md
│       ├── lesson-02-simple-oapp.md
│       ├── lesson-03-hardhat-tasks.md
│       ├── lesson-04-aba-messaging.md
│       ├── lesson-05-multichain-messaging.md
│       ├── lesson-06-solana-interaction.md
│       ├── lesson-07-protocol-deep-dive.md
│       ├── lesson-08-challenges.md
│       ├── challenges/               # Coding challenges
│       └── solutions/                # Challenge solutions
├── deploy/
│   └── OApp.ts                       # Deployment script
├── deployments/                      # Deployed contract artifacts
│   ├── arbitrum-sepolia/
│   ├── ethereum-sepolia/
│   └── peer-configurations/          # Generated wiring configs
├── tasks/
│   ├── index.ts                      # Task barrel file
│   ├── exampleTask.ts
│   └── helpers/
│       ├── taskHelpers.ts            # Shared task utilities
│       ├── configGenerator.ts        # Config generation
│       ├── deployInteractive.ts      # Interactive deployment
│       └── wireInteractive.ts        # Interactive wiring
├── hardhat.config.ts                 # Hardhat configuration
├── layerzero.config.ts               # LayerZero OApp config
├── foundry.toml                      # Foundry configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript configuration
├── .env.example                      # Environment template
├── QUICKSTART.md                     # This file
├── CLAUDE.md                         # AI assistant instructions
└── README.md                         # Project overview
```

**Key Directories:**

- `contracts/` - Your Solidity contracts
- `contracts/lessons/Oapp/` - Example contracts for each lesson
- `courses/Oapp-standard/` - Step-by-step lessons and challenges
- `tasks/` - Custom Hardhat tasks for deployment and interaction
- `deploy/` - Deployment scripts
- `deployments/` - Deployed contract artifacts and configs

## Step 1: Install Dependencies

```bash
# Install all project dependencies
pnpm install
```

## Step 2: Configure Environment

Create your `.env` file from the template:

```bash
# Copy the example file
cp .env.example .env
```

**Important**: The LayerZero V2 endpoint address is already configured for all testnets.

## Step 3: Run hardhart Compile

```bash
npx hardhat compile
```

## Step 4

**Learn the fundamentals**

Start with the Oapp Standard [Lesson 01 - LayerZero Basics](./courses/Oapp-standard/lesson-01-basics.md)

---
