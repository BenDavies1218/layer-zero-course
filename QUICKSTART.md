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
├── courses/
│   ├── Oapp-standard/
│   ├── OFT-standard (Coming Soon)/
│   ├── ONFT-standard (Coming Soon)/
│   └── Ovault-standard (Coming Soon)/
├── src/
│   ├── contracts/
│   │   └── lessons/Oapp/ # Oapp Example lesson contracts and challenge contracts
│   ├── scripts/
│   │   ├── deploy.ts      # Generic Oapp deployment script
│   │   └── configure.ts   # Generic Peer configuration script
│   ├── utils/
│   │   ├── deploy-oapp.ts              # Deployment utilities
│   │   └── configure-oapp-peers.ts     # Peer configuration utilities
│   ├── tests/ # Contract test
│   └── diagrams/ # course images and diagrams
├── hardhat.config.ts                 # Hardhat configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript configuration
├── .env.example                      # Environment template
├── QUICKSTART.md                     # This file
└── LICENSE                           # MIT License
```

**Key Directories:**

- `src/contracts/` - Where you build your contracts
- `src/scripts/` - Deployment and configuration scripts
- `courses/` - Step-by-step lessons and challenges

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
