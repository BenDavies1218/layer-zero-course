# Lesson 03 — Creating Hardhat Tasks for Contract Interaction

In this lesson, you'll learn how to create custom Hardhat tasks to interact with your deployed OApp contracts. Tasks provide a convenient way for common operations like calling contract methods and querying state.

## What You'll Learn

- How Hardhat tasks work and why they're useful
- Creating your first custom task to work with the simpleMessenger contract from lesson 2.

## Prerequisites

Before starting, ensure you have:

- Completed Lesson 02 (Building Your First OApp)
- A deployed and wired OApp contract
- Basic understanding of TypeScript

## Why Use Hardhat Tasks?

Hardhat tasks offer several advantages over manual console interaction:

1. **Reusability** - Write once, use many times
2. **CLI Interface** - Run from command line with parameters
3. **Validation** - Built-in parameter parsing and validation
4. **Automation** - Easy to integrate into scripts and CI/CD
5. **Documentation** - Self-documenting with descriptions and help text

## Task Basics

### Task Structure

Every Hardhat task has three main components:

```typescript
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("task:name", "Description of what this task does")
  .addParam("paramName", "Parameter description", undefined, types.string)
  .addOptionalParam("optional", "Optional parameter", "default", types.string)
  .addFlag("verbose", "Enable verbose output")
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    // Task implementation
  });
```

### Parameter Types

Hardhat provides several built-in parameter types:

- `types.string` - String values
- `types.int` - Integer numbers
- `types.float` - Floating point numbers
- `types.boolean` - Boolean values
- `types.json` - JSON objects

## Step 1: Create a Simple Query Task

Let's start with a simple task that queries your OApp status.

Create `tasks/getStatus.ts`:

```typescript
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("lz:oapp:status", "Get OApp status and statistics").setAction(
  async (args, hre: HardhatRuntimeEnvironment) => {
    const network = hre.network.name;
    console.log(`\n📊 Querying OApp on ${network}...\n`);

    // Get deployment
    const deployment = await hre.deployments.get("SimpleMessenger");
    const contract = await hre.ethers.getContractAt(
      "SimpleMessenger",
      deployment.address,
    );

    // Query state
    const messagesSent = await contract.messagesSent();
    const messagesReceived = await contract.messagesReceived();
    const lastMessage = await contract.lastMessage();

    // Display results
    console.log("Contract Status:");
    console.log(`  Address: ${deployment.address}`);
    console.log(`  Messages Sent: ${messagesSent}`);
    console.log(`  Messages Received: ${messagesReceived}`);
    console.log(`  Last Message Received: "${lastMessage}"\n`);
  },
);
```

### Registering Tasks

Each Task must be imported in your `/tasks/index.ts`:

```typescript
import "./helpers/deployInteractive";
import "./helpers/wireInteractive";
import "./getStatus";
```

**Usage:**

```bash
pnpm hardhat lz:oapp:status --network arbitrum-sepolia
```

## Step 2: Using Helper Functions

The repository includes helper functions to simplify task development. These are located in `tasks/helpers/taskHelpers.ts`.

### Available Helpers

```typescript
import { getDeployedContract } from "./helpers/taskHelpers";
```

### Helper Descriptions

**`getDeployedContract(hre, contractName)`**

- Returns `{ address, contract }` for a deployed contract
- Throws if contract not found

## Step 3: Create a Send Message Task

Now let's create a more complex task that sends cross-chain messages.

Create `tasks/sendMessage.ts`:

```typescript
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { Options } from "@layerzerolabs/lz-v2-utilities";

import { getDeployedContract } from "./helpers/taskHelpers";

task("lz:messenger:send", "Send a cross-chain message")
  .addParam("dstEid", "Destination endpoint ID", undefined, types.int)
  .addParam("message", "Message to send", undefined, types.string)
  .addOptionalParam("gas", "Gas limit for lzReceive", 200000, types.int)
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    try {
      // Get deployed contract
      const { contract } = await getDeployedContract(hre, "SimpleMessenger");

      // Build options with gas limit
      const options = Options.newOptions()
        .addExecutorLzReceiveOption(args.gas, 0)
        .toBytes();

      // Quote the fee
      const fee = await contract.quote(
        args.dstEid,
        args.message,
        options,
        false,
      );

      console.log(
        `Estimated native fee to send message: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`,
      );

      console.log("\n⏳ Sending message...\n");

      // Send the message
      const tx = await contract.sendMessage(
        args.dstEid,
        args.message,
        options,
        { value: fee.nativeFee },
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      // Display results
      console.log("\n✅ Message sent successfully!\n");
      console.log("Transaction Details:");
      console.log(`  Hash: ${tx.hash}`);
      console.log(`  To: ${contract.address}`);
      console.log(`  Message: "${args.message}"`);
      console.log(`  fee: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`);
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error: any) {
      console.log("error", error.toString());
      throw error;
    }
  });
```

**Usage:**

```bash
# Send message from Ethereum Sepolia to Arbitrum Sepolia
pnpm hardhat lz:messenger:send --dst-eid 40231 --message "Hello from Base!" --network ethereum-sepolia

pnpm hardhat lz:messenger:send --dst-eid 40231 --message "Hello from Base!" --network ethereum-sepolia
```

## Key Takeaways

- Hardhat tasks provide a reusable CLI interface for contract interaction
- Use helper functions to reduce boilerplate and improve consistency
- Always include proper error handling and user feedback
- Follow naming conventions for discoverability
- Return structured data for programmatic use
- Provide tracking links for cross-chain operations

## Next Steps

In **Lesson 04**, we'll explore the ABA (Ping-Pong) messaging pattern, where a message to Chain B triggers an automatic response back to Chain A. This is useful for:

- Request-response workflows
- Cross-chain confirmations
- Automated cross-chain interactions

## Resources

- [Hardhat Tasks Documentation](https://hardhat.org/hardhat-runner/docs/advanced/create-task)
- [Task Helpers Reference](../../tasks/helpers/taskHelpers.ts)
- [LayerZero V2 Utilities](https://www.npmjs.com/package/@layerzerolabs/lz-v2-utilities)
