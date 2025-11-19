# LayerZero OApp Course Documentation

This directory contains comprehensive documentation for developing LayerZero OApps.

## 📚 Available Guides

### [Writing Hardhat Tasks](./WRITING_TASKS.md)
Learn how to create custom Hardhat tasks for interacting with your LayerZero OApp contracts.

**Contents:**
- Task basics and structure
- Using helper functions
- Complete examples (send tasks, query tasks)
- Best practices and common patterns
- Parameter types and validation

**Quick Start:**
```typescript
import { task } from 'hardhat/config'
import { getDeployedContract, logSuccess } from './helpers/taskHelpers'

task('lz:oapp:myTask', 'Task description')
    .addParam('param', 'Parameter description')
    .setAction(async (args, hre) => {
        const { contract } = await getDeployedContract(hre, 'MyOApp')
        // Your task logic here
        logSuccess('Done!')
    })
```

## 🛠️ Helper Utilities

### Task Helpers
Located at `../tasks/helpers/taskHelpers.ts`

**Key Functions:**
- `getDeployedContract()` - Get deployed contract instances
- `logNetworkInfo()` - Display network and signer info
- `logMessagingFee()` - Format and display LayerZero fees
- `logTransactionDetails()` - Show transaction results
- `getLayerZeroScanLink()` - Generate tracking links
- `getBlockExplorerLink()` - Generate explorer links

**Network Utilities:**
- `getNetworkFromEid()` - Convert endpoint ID to network name
- `getEidFromNetwork()` - Convert network name to endpoint ID
- `ENDPOINT_IDS` - Reference object with all endpoint IDs

## 📖 Course Lessons

The main course content is located in `../courses/Oapp-standard/`:

1. **[Lesson 01](../courses/Oapp-standard/lesson-01-basics.md)** - LayerZero Basics
2. **[Lesson 02](../courses/Oapp-standard/lesson-02-simple-oapp.md)** - Building Your First OApp
3. **[Lesson 03](../courses/Oapp-standard/lesson-03-aba-messaging.md)** - ABA Messaging Pattern
4. **[Lesson 04](../courses/Oapp-standard/lesson-04-multichain-messaging.md)** - Multichain Messaging
5. **[Lesson 05](../courses/Oapp-standard/lesson-05-solana-interaction.md)** - Solana Interaction

## 🚀 Quick Reference

### Deployment Commands
```bash
# Compile contracts
pnpm compile

# Deploy to networks
pnpm hardhat lz:deploy --tags OApp

# Wire connections
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts

# Check configuration
pnpm hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
```

### Common Task Commands
```bash
# Send a message
npx hardhat lz:oapp:sendMessage \
  --dst-eid 40161 \
  --string "Hello World" \
  --network arbitrum-sepolia

# Get OApp status
npx hardhat lz:oapp:status --network arbitrum-sepolia

# List available tasks
npx hardhat --help
```

### Endpoint IDs Reference

**Testnets:**
- Ethereum Sepolia: `40161`
- Arbitrum Sepolia: `40231`
- Base Sepolia: `40245`
- Optimism Sepolia: `40232`
- Polygon Amoy: `40267`
- Solana Devnet: `40168`

**Mainnets:**
- Ethereum: `30101`
- Arbitrum: `30110`
- Base: `30184`
- Optimism: `30111`
- Polygon: `30109`
- Solana: `30168`

## 📝 Additional Resources

### External Documentation
- [LayerZero V2 Docs](https://docs.layerzero.network/v2)
- [LayerZero Scan](https://layerzeroscan.com)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Deploy Plugin](https://github.com/wighawag/hardhat-deploy)

### Repository Structure
```
layer-zero-course/
├── contracts/           # Solidity contracts
├── deploy/             # Deployment scripts
├── tasks/              # Custom Hardhat tasks
│   └── helpers/        # Task helper utilities
├── test/               # Test files
├── courses/            # Course lessons and challenges
├── docs/               # Documentation (you are here)
└── layerzero.config.ts # LayerZero configuration
```

## 🤝 Contributing

When adding new documentation:

1. Follow the existing format and style
2. Include code examples
3. Add links to related resources
4. Update this README with links to new guides
5. Test all code examples

## 💡 Tips

- **Always compile** before deploying: `pnpm compile`
- **Wire after deployment** to configure peers and options
- **Use task helpers** to avoid code duplication
- **Test on testnets** before deploying to mainnet
- **Check LayerZero Scan** to track cross-chain messages
- **Profile gas usage** of `_lzReceive()` for production

## 🐛 Troubleshooting

### Common Issues

**"No contract found"**
- Run `pnpm hardhat lz:deploy --tags OApp` first
- Check contract name matches in task and deploy script

**"Peer not set"**
- Run `pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts`
- Verify `layerzero.config.ts` includes both chains

**"Out of gas on destination"**
- Increase gas in `layerzero.config.ts` enforced options
- Re-run wiring task after changes

**"Task not found"**
- Check task is imported in `hardhat.config.ts`
- Verify task name matches (e.g., `lz:oapp:sendMessage`)

## 📞 Support

- Check [LayerZero Docs](https://docs.layerzero.network/v2)
- Visit [LayerZero Discord](https://discord-layerzero.netlify.app/discord)
- Review course lessons in `../courses/`
- See task examples in `../tasks/`
