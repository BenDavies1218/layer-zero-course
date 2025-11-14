# Omnichain Messaging Utilities

Scripts and utilities for deploying and managing LayerZero OApp contracts.

## Scripts

### deploy-simple-messenger.ts

Deploys the SimpleMessenger contract to any configured testnet.

**Features:**
- Validates network configuration
- Checks deployer balance
- Provides clear deployment output
- Includes verification command

**Usage:**

```bash
# Deploy to Ethereum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network ethereum-sepolia

# Deploy to Arbitrum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network arbitrum-sepolia

# Deploy to Optimism Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network optimism-sepolia

# Deploy to Base Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network base-sepolia

# Deploy to Polygon Amoy
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network polygon-amoy
```

**Output:**
- Contract address
- Transaction hash
- Owner address
- Endpoint address
- Verification command

**Next Steps:**
1. Save the deployed contract address
2. Deploy to at least one other network
3. Run `configure-peers.ts` to enable cross-chain communication

### configure-peers.ts

Configures trusted peer relationships between deployed OApp contracts on different chains.

**Features:**
- Multi-network peer configuration
- Automatic ownership validation
- Skip already-configured peers
- Status summary and verification

**Setup:**

Edit the `deployments` object in the script with your deployed addresses:

```typescript
const deployments: { [key: string]: string } = {
  "ethereum-sepolia": "0xYourSepoliaAddress",
  "arbitrum-sepolia": "0xYourArbSepoliaAddress",
  "optimism-sepolia": "0xYourOptimismAddress",
  // ... add more as needed
};
```

**Usage:**

```bash
# Configure peers on Ethereum Sepolia
# (Sets up trust relationships with all other configured networks)
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia

# Configure peers on Arbitrum Sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia

# Repeat for each network where you've deployed
```

**Important:**
- You must run this script on EACH network where you've deployed
- Only the contract owner can configure peers
- Peer relationships are unidirectional (set both A→B and B→A)

**Verification:**

The script outputs a summary showing which peers are configured:

```
Current Peer Configuration:
  arbitrum-sepolia: ✅ Configured
  optimism-sepolia: ✅ Configured
  base-sepolia: ❌ Not configured
```

## Deployment Workflow

### Full Multi-Chain Setup

```bash
# 1. Deploy to all desired networks
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network ethereum-sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network arbitrum-sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network optimism-sepolia

# 2. Update configure-peers.ts with all deployed addresses

# 3. Configure peers on each network
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network optimism-sepolia

# 4. Test cross-chain messaging!
```

### Minimal Two-Chain Setup

```bash
# 1. Deploy to two networks
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network ethereum-sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network arbitrum-sepolia

# 2. Update configure-peers.ts with both addresses

# 3. Configure peers on both networks
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia

# 4. Send a message from Sepolia to Arbitrum Sepolia
```

## Configuration

### Supported Networks

The scripts support these testnets out of the box:

| Network | Endpoint ID | Network Name |
|---------|-------------|--------------|
| Ethereum Sepolia | 40161 | `ethereum-sepolia` |
| Arbitrum Sepolia | 40231 | `arbitrum-sepolia` |
| Optimism Sepolia | 40232 | `optimism-sepolia` |
| Base Sepolia | 40245 | `base-sepolia` |
| Polygon Amoy | 40267 | `polygon-amoy` |

### Environment Variables

Ensure your `.env` file contains:

```bash
PRIVATE_KEY=0x...  # Your deployer private key
ALCHEMY_API_KEY=your_alchemy_key  # For RPC endpoints
```

## Troubleshooting

### "No endpoint configured for network"
- Check that you're using one of the supported network names
- Verify your `hardhat.config.ts` has the network configured

### "Deployer has no balance"
- Get testnet tokens from a faucet
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucets](https://www.alchemy.com/faucets)

### "You are not the owner"
- Use the same private key that deployed the contract
- Check the owner address with `messenger.owner()`

### "No deployment address configured"
- Update the `deployments` object in `configure-peers.ts`
- Ensure addresses are checksummed (proper case)

### Peer configuration appears incorrect
- Run the script again - it will skip already-configured peers
- Check peer status with: `messenger.peers(endpointId)`
- Ensure you've run the script on BOTH chains (A→B and B→A)

## Testing Cross-Chain Messages

After deployment and configuration:

```bash
# Start Hardhat console
npx hardhat console --network ethereum-sepolia
```

```javascript
// Attach to deployed contract
const messenger = await ethers.getContractAt(
  "SimpleMessenger",
  "0xYourSepoliaAddress"
);

// Quote fee
const fee = await messenger.quote(40231, "Hello!", "0x", false);

// Send message
const tx = await messenger.sendMessage(
  40231, // Arbitrum Sepolia
  "Hello from Sepolia!",
  "0x",
  { value: fee.nativeFee }
);

await tx.wait();
console.log("Message sent! Track on https://layerzeroscan.com");
```

## Resources

- [Lesson 02 - Building Your First OApp](../lesson-02-simple-oapp.md) - Full walkthrough
- [SimpleMessenger.sol](../../../src/contracts/omnichain-messaging/SimpleMessenger.sol) - Contract code
- [LayerZero Scan](https://layerzeroscan.com) - Track messages
- [LayerZero Docs](https://docs.layerzero.network/v2) - Official documentation
