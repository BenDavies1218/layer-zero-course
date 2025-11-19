# Interactive OApp Configuration & Wiring

An interactive CLI tool for configuring and wiring LayerZero OApps with ease.

## Quick Start

```bash
# Simple way
pnpm wire

# Or directly
pnpm hardhat lz:oapp:wire:interactive
```

## What It Does

The interactive wizard walks you through:

1. **Contract Selection** - Automatically scans your deployments and lets you choose which contract to configure
2. **Gas Limit Configuration** - Set the gas limit for `_lzReceive` execution
3. **Advanced Settings (Optional)** - Configure DVNs and block confirmations
4. **Config Generation** - Creates a `layerzero.config.ts` file
5. **Automatic Wiring** - Optionally wires the OApp connections immediately

## Features

### Step-by-Step Prompts

- **Contract Selection**: Choose from detected deployments
- **Gas Limit**: Set appropriate gas for your `_lzReceive` function (default: 200,000)
- **DVN Configuration**: Select verifier networks (default: LayerZero Labs)
- **Block Confirmations**: Set security level (default: 1)
- **Preview Config**: Optional preview before saving
- **Auto-Wire**: Execute wiring immediately or later

### Visual Feedback

```
🚀 LayerZero OApp Configuration Wizard
═══════════════════════════════════════

📡 Scanning deployments directory...

✅ Found contract: MyOApp

📦 Deployments for MyOApp:

   1. Arbitrum Sepolia
      Network: arbitrum-sepolia
      Address: 0x1234...
      EID: 40231

   2. Ethereum Sepolia
      Network: ethereum-sepolia
      Address: 0x5678...
      EID: 40161

🔗 This will create 1 bidirectional pathway

? Enter gas limit for _lzReceive execution: (200000)
```

## Command Options

```bash
# Basic usage
pnpm hardhat lz:oapp:wire:interactive

# Skip wiring (only generate config)
pnpm hardhat lz:oapp:wire:interactive --skip-wire
```

## Example Workflow

1. **Deploy contracts** to multiple chains:
   ```bash
   pnpm hardhat lz:deploy --tags MyOApp
   ```

2. **Run interactive wizard**:
   ```bash
   pnpm wire
   ```

3. **Follow the prompts**:
   - Select your contract
   - Enter gas limit (e.g., 200000)
   - Configure advanced settings (optional)
   - Preview config (optional)
   - Confirm wiring

4. **Done!** Your OApp is configured and ready to send messages.

## Gas Limit Guidelines

Set gas limits based on your `_lzReceive` complexity:

- **Simple message storage**: 100,000 - 200,000
- **State updates + events**: 200,000 - 300,000
- **Complex logic**: 300,000 - 500,000
- **Multiple external calls**: 500,000+

💡 **Tip**: Test on testnet first and check actual gas usage on block explorers, then add 20-30% buffer.

## DVN Options

Available verifiers:
- **LayerZero Labs** (Default, recommended)
- **Google Cloud**
- **Polyhedra**
- **Horizen Labs**
- **Nethermind**

You can select multiple DVNs for enhanced security. Each additional DVN increases message latency slightly.

## Advanced Configuration

### Block Confirmations

Higher confirmations = More security but slower delivery:
- **1**: Fast, suitable for testnets
- **5-10**: Good for low-value transactions
- **15-20**: Recommended for production
- **30+**: High-security applications

### Custom DVN Setup

The wizard supports:
- **Required DVNs**: All must verify (minimum 1)
- **Optional DVNs**: Threshold-based verification (future feature)

## Troubleshooting

### "No deployments found"
- Make sure you've deployed contracts first: `pnpm hardhat lz:deploy`
- Check that `deployments/` directory exists with network folders

### "Config already exists"
- The wizard will prompt you to overwrite
- Backup your existing config if it has custom modifications

### Wiring fails
- Check that you have sufficient native tokens on all chains
- Verify RPC endpoints are working
- Run manually: `pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts`

## Manual Config Generation (Non-Interactive)

If you prefer non-interactive commands:

```bash
# List deployments
pnpm hardhat lz:oapp:config:list

# Generate config
pnpm hardhat lz:oapp:config:generate --contract-name MyOApp

# Wire manually
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

## Next Steps

After wiring, you can:

1. **Verify configuration**:
   ```bash
   pnpm hardhat lz:oapp:config:get --oapp-config layerzero.config.ts
   ```

2. **Send a test message**:
   ```bash
   pnpm hardhat lz:oapp:send --dst-eid 40231 --string "Hello!" --network base-sepolia
   ```

3. **Check status** on [LayerZero Scan](https://layerzeroscan.com)

## Related Documentation

- [Writing Custom Tasks](./WRITING_TASKS.md)
- [LayerZero V2 Docs](https://docs.layerzero.network/v2)
- [Troubleshooting Guide](https://docs.layerzero.network/v2/developers/evm/troubleshooting/debugging-messages)
