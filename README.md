# LayerZero V2 OApp Course

Learn to build cross-chain applications with LayerZero V2. This comprehensive course covers omnichain messaging, token transfers, and advanced patterns for building production-ready decentralized applications that span multiple blockchains.

## What You'll Learn

- **Omnichain Messaging**: Send arbitrary messages between chains
- **OApp Standard**: Build contracts using LayerZero's OApp pattern
- **Cross-Chain Architecture**: Understand endpoints, DVNs, and executors
- **Gas Optimization**: Manage fees and execution options
- **Security Best Practices**: Validate sources, handle errors, protect against attacks
- **Production Deployment**: Deploy and configure multi-chain applications

## Prerequisites

Before starting, ensure you have:

- **Node.js v22 (LTS) installed** - [Download here](https://nodejs.org/)
- **pnpm** package manager - Install with `npm install -g pnpm`
- **A wallet** with testnet tokens (Sepolia ETH, Arbitrum Sepolia ETH, etc.)
- **Your private key** ready for deployment
- **Alchemy API key** (free tier works) - [Sign up here](https://www.alchemy.com/)

### Get Testnet Tokens

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucets](https://www.alchemy.com/faucets)
- [Chainlink Faucets](https://faucets.chain.link/)

## Project Setup

### 1. Install Dependencies

```bash
# Clone the repository (if applicable)
git clone <your-repo-url>
cd layer-zero-course

# Install all dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your credentials
```

Your `.env` file should look like:

```bash
# Deployment account
PRIVATE_KEY=0x...

# Alchemy RPC endpoints
ALCHEMY_API_KEY=your_alchemy_api_key_here

# Optional: Contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

### 3. Verify Setup

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Check network connectivity
npx hardhat run --network ethereum-sepolia
```

## Quick Start

Get your first cross-chain message working in 5 minutes:

👉 **See [QUICKSTART.md](./QUICKSTART.md)** for step-by-step instructions.

## Course Structure

### Omnichain Messaging

Learn the fundamentals of LayerZero cross-chain messaging.

**Lessons:**
- [Lesson 01 - LayerZero Basics](./courses/omnichain-messaging/lesson-01-basics.md) - Protocol architecture and core concepts
- [Lesson 02 - Building Your First OApp](./courses/omnichain-messaging/lesson-02-simple-oapp.md) - Deploy a simple cross-chain messenger
- Lesson 03 - Advanced Patterns *(coming soon)*

**Contracts:**
- [SimpleMessenger.sol](./src/contracts/omnichain-messaging/SimpleMessenger.sol) - Basic cross-chain messaging
- [MyOApp.sol](./src/contracts/omnichain-messaging/MyOApp.sol) - Complete OApp example

**Scripts:**
- [Deploy Script](./courses/omnichain-messaging/utils/deploy-simple-messenger.ts)
- [Configure Peers](./courses/omnichain-messaging/utils/configure-peers.ts)

### Coming Soon

- **Omnichain Tokens (OFT)** - Cross-chain fungible tokens
- **Composed Calls** - Trigger external contracts on destination
- **Rate Limiting** - Control message frequency
- **Batch Operations** - Optimize multi-message patterns

## Supported Networks

This course uses the following testnets:

| Network | Endpoint ID | Get Testnet Tokens |
|---------|-------------|-------------------|
| Ethereum Sepolia | 40161 | [Faucet](https://sepoliafaucet.com/) |
| Arbitrum Sepolia | 40231 | [Faucet](https://www.alchemy.com/faucets/arbitrum-sepolia) |
| Optimism Sepolia | 40232 | [Faucet](https://www.alchemy.com/faucets/optimism-sepolia) |
| Base Sepolia | 40245 | [Faucet](https://www.alchemy.com/faucets/base-sepolia) |
| Polygon Amoy | 40267 | [Faucet](https://www.alchemy.com/faucets/polygon-amoy) |

## Project Structure

```
layer-zero-course/
├── courses/
│   └── omnichain-messaging/
│       ├── lesson-01-basics.md           # Protocol fundamentals
│       ├── lesson-02-simple-oapp.md      # First OApp tutorial
│       ├── challenges/                    # Practice exercises
│       └── utils/                         # Deployment scripts
│           ├── deploy-simple-messenger.ts
│           ├── configure-peers.ts
│           └── README.md
├── src/
│   ├── contracts/
│   │   └── omnichain-messaging/
│   │       ├── SimpleMessenger.sol       # Lesson 02 contract
│   │       ├── MyOApp.sol                # Reference implementation
│   │       └── README.md
│   └── tests/
│       └── SimpleMessenger.test.ts       # Unit tests
├── diagrams/                              # Visual guides
│   ├── layerzero-flow.svg
│   ├── aba-pattern.svg
│   ├── batch-send-pattern.svg
│   ├── message-lifecycle.svg
│   └── fee-payment-flow.svg
├── hardhat.config.ts                      # Hardhat configuration
├── package.json                           # Dependencies
├── .env.example                           # Environment template
├── QUICKSTART.md                          # 5-minute setup guide
└── README.md                              # This file
```

## Development Workflow

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/SimpleMessenger.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Deploy to Testnet

```bash
# Deploy SimpleMessenger to Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network ethereum-sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network arbitrum-sepolia
```

### Configure Cross-Chain

```bash
# Set up peer relationships
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia
```

### Interact with Contracts

```bash
# Open Hardhat console
npx hardhat console --network ethereum-sepolia

# In the console:
const messenger = await ethers.getContractAt("SimpleMessenger", "0xYourAddress");
const fee = await messenger.quote(40231, "Hello!", "0x", false);
await messenger.sendMessage(40231, "Hello!", "0x", {value: fee.nativeFee});
```

## Tracking Messages

Track your cross-chain messages in real-time:

🔍 **[LayerZero Scan](https://layerzeroscan.com)** - Paste your transaction hash

Expected timeline:
- **Send**: Instant (on-chain transaction)
- **Verification**: 1-5 minutes (DVN confirmations)
- **Execution**: 1-2 minutes (after verification)

## Troubleshooting

### Common Issues

**"Insufficient fee"**
- Always call `quote()` before sending
- Use the exact fee returned: `{value: fee.nativeFee}`

**"Peer not set"**
- Run `configure-peers.ts` on BOTH chains
- Verify with: `messenger.peers(dstEid)`

**"Out of gas" on destination**
- Increase gas in options
- Set enforced options with higher gas limits

**Message stuck in verification**
- Check [LayerZero Scan](https://layerzeroscan.com)
- First messages can take 5-10 minutes
- Verify DVN configuration

**Compilation errors**
- Ensure Node.js v22 is installed
- Clear cache: `npx hardhat clean`
- Reinstall: `rm -rf node_modules && pnpm install`

### Get Help

- 📚 [LayerZero V2 Docs](https://docs.layerzero.network/v2)
- 💬 [Discord Community](https://discord.gg/layerzero)
- 🐛 [GitHub Issues](https://github.com/LayerZero-Labs/devtools/issues)
- 🎓 [Developer Guides](https://docs.layerzero.network/v2/developers/evm/oapp/overview)

## Resources

### Official LayerZero

- [LayerZero V2 Documentation](https://docs.layerzero.network/v2)
- [OApp Standard](https://docs.layerzero.network/v2/developers/evm/oapp/overview)
- [Endpoint Addresses](https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts)
- [GitHub Repository](https://github.com/LayerZero-Labs/devtools)

### Tools

- [LayerZero Scan](https://layerzeroscan.com) - Message tracking
- [Hardhat](https://hardhat.org/) - Development environment
- [Alchemy](https://www.alchemy.com/) - RPC provider

### Community

- [Discord](https://discord.gg/layerzero)
- [Twitter](https://twitter.com/LayerZero_Labs)
- [Forum](https://layerzero.network/community)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with LayerZero V2, leveraging:
- [@layerzerolabs/oapp-evm](https://www.npmjs.com/package/@layerzerolabs/oapp-evm)
- [@layerzerolabs/lz-evm-protocol-v2](https://www.npmjs.com/package/@layerzerolabs/lz-evm-protocol-v2)
- [@openzeppelin/contracts](https://www.npmjs.com/package/@openzeppelin/contracts)

---

**Ready to build?** Start with [QUICKSTART.md](./QUICKSTART.md) or dive into [Lesson 01](./courses/omnichain-messaging/lesson-01-basics.md)!
