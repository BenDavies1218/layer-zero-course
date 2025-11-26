# Get Started building Omnichain Apps in 5 minutes

This course will get you from cross-chain messenger boy to using LayerZero hero.

## Prerequisites Check

Before you start, make sure you have:

- ✅ Node.js v22 installed and running ([Download here](https://nodejs.org/)) hardhat seems to not v23 node.
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
│   └── OApp.ts                       # Deployment script don't modify this
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
- `contracts/lessons/Oapp/` - Lesson contracts
- `courses/Oapp-standard/` - Oapp lessons and challenges
- `tasks/` - Hardhat tasks for deployment and interaction
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

**Important**: The LayerZero V2 endpoint address is already configured for all testnets in the hardhat config is you want to add more please make the layerzero V2 endpoint is correctly applied.

## Step 3: Run hardhart Compile

```bash
npx hardhat compile
```

## Where from here?

**Learn the fundamentals**

[Lesson 01 - Oapp Basics](./courses/Oapp-standard/lesson-01-basics.md)

This course is designed to introduce you to the LayerZero protocol. It's a mix of technical and fun challenges designed to indroduce you to the basics of cross-chain messaging, no prerequisites required.

---

**OFT Token Standard** (Coming Soon)

[Lesson 01 - OFT Basics](./courses/Oapp-standard/lesson-01-basics.md)

This course is the next step towards building Omnichain applications. It's recommended you have completed at least the OApp standard lessons, but you're not required to. The OFT standard is technical and the challenges are designed on real use cases and how to implement production-ready solutions for Omnichain apps.

---

**NOFT Standard** (Coming Soon)

[Lesson 01 - NOFT Basics](./courses/Oapp-standard/lesson-01-basics.md)

This course is very similar to the OFT standard. It's recommended you have completed at least the OApp standard lessons, but you're not required to. The NOFT standard is technical and the challenges are designed on real use cases and how to implement production-ready solutions for Omnichain apps.

---

**OVault Standard** (Coming Soon)

[Lesson 01 - OVault Basics](./courses/Oapp-standard/lesson-01-basics.md)

Building an Omnichain vault is the most challenging course here. You should have completed the OFT Standard or NOFT Standard at a minimum before starting this. The OVault standard is quite technical and requires a high level of understanding of the layerzero V2 protocol including: OFT Standard and ERC-4626 vault standard.

---
