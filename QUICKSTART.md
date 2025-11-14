# LayerZero V2 OApp Course - Quick Start

Get started with cross-chain messaging in 5 minutes.

## Prerequisites

- Node.js v22 (LTS)
- Testnet ETH on at least 2 chains
- Alchemy API key (free tier works)

## Setup

```bash
# Clone and install
git clone <your-repo>
cd layer-zero-course
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and add:
#   PRIVATE_KEY=0x...
#   ALCHEMY_API_KEY=your_key_here
```

## Deploy SimpleMessenger

```bash
# Deploy to Ethereum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network ethereum-sepolia
# Save the address!

# Deploy to Arbitrum Sepolia
npx hardhat run courses/omnichain-messaging/utils/deploy-simple-messenger.ts --network arbitrum-sepolia
# Save this address too!
```

## Configure Peers

Edit `courses/omnichain-messaging/utils/configure-peers.ts` and add your deployed addresses:

```typescript
const deployments = {
  "ethereum-sepolia": "0xYourSepoliaAddress",
  "arbitrum-sepolia": "0xYourArbSepoliaAddress",
};
```

Then run:

```bash
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network ethereum-sepolia
npx hardhat run courses/omnichain-messaging/utils/configure-peers.ts --network arbitrum-sepolia
```

## Send Your First Message

```bash
# Open Hardhat console on Sepolia
npx hardhat console --network ethereum-sepolia
```

In the console:

```javascript
// Get contract
const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");
const messenger = SimpleMessenger.attach("0xYourSepoliaAddress");

// Prepare message
const dstEid = 40231; // Arbitrum Sepolia
const message = "Hello from Sepolia!";
const options = "0x";

// Quote fee
const fee = await messenger.quote(dstEid, message, options, false);
console.log(`Fee: ${ethers.utils.formatEther(fee.nativeFee)} ETH`);

// Send message
const tx = await messenger.sendMessage(dstEid, message, options, {
  value: fee.nativeFee,
});
await tx.wait();
console.log("✅ Message sent! Tx:", tx.hash);
```

## Track Your Message

1. Go to [LayerZero Scan](https://layerzeroscan.com)
2. Paste your transaction hash
3. Watch it propagate cross-chain!

## Verify Receipt

```bash
# Connect to destination chain
npx hardhat console --network arbitrum-sepolia
```

```javascript
const messenger = SimpleMessenger.attach("0xYourArbSepoliaAddress");
const lastMessage = await messenger.lastMessage();
console.log("Received:", lastMessage);
// Output: "Hello from Sepolia!"
```

## Next Steps

- 📚 Read [Lesson 01](courses/omnichain-messaging/lesson-01-basics.md) for protocol deep dive
- 🔨 Follow [Lesson 02](courses/omnichain-messaging/lesson-02-simple-oapp.md) for detailed walkthrough
- 🎯 Try the challenges in `courses/omnichain-messaging/challenges/`

## Troubleshooting

### "Insufficient fee"
Call `quote()` first and use the returned fee.

### "Peer not set"
Run `configure-peers.ts` on both networks.

### "Out of gas"
Increase gas in options or set enforced options.

### Message stuck
Check on LayerZero Scan. May take 5-10 minutes for first message.

## Get Help

- [LayerZero Docs](https://docs.layerzero.network/v2)
- [Discord](https://discord.gg/layerzero)
- [GitHub Issues](https://github.com/LayerZero-Labs/devtools/issues)

## Supported Testnets

- Ethereum Sepolia (EID: 40161)
- Arbitrum Sepolia (EID: 40231)
- Optimism Sepolia (EID: 40232)
- Base Sepolia (EID: 40245)
- Polygon Amoy (EID: 40267)

Get testnet tokens:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Faucets](https://www.alchemy.com/faucets)
- [Chainlink Faucets](https://faucets.chain.link/)
