# Lesson 03 — Creating Hardhat Tasks for Contract Interaction

In this lesson, you'll learn how to create Hardhat tasks to interact with your deployed OApp contracts. Tasks provide a convenient way for common operations like calling contract methods and querying state.

## What You'll Learn

- How Hardhat tasks work and why they're useful
- Creating your first task to work with the simpleMessenger contract from lesson 2.

## Prerequisites

Before starting, ensure you have:

- Completed Lesson 02 Simple Oapp
- Have a deployed and wired your OApp contract

## Why Use Hardhat Tasks?

Hardhat tasks offer several advantages over manual console interaction:

1. **Reusability** - Write once, use many times
2. **CLI Interface** - Run from command line with parameters
3. **Validation** - Built-in parameter parsing and validation
4. **Automation** - Easy to integrate into scripts and CI/CD
5. **Documentation** - Allows you to document what is happening more easily

## Task Basics

### Parameter Types

Hardhat provides several built-in parameter types that can be passed through the CLI:

- `types.string` - String values
- `types.int` - Integer numbers
- `types.float` - Floating point numbers
- `types.boolean` - Boolean values
- `types.json` - JSON objects

If you would rather hardcode values such as contract name or address in your task then your more than welcome but you will need to change them each time you call the task.

### Task Structure

Every Hardhat task I've written starts with this boiler plate code

```typescript
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("task:name", "Description of what this task does")
  .addParam("paramName", "Parameter description", undefined, types.string)
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    // Task implementation
  });
```

## Step 1: Create a Simple Query Task

Let's start with a simple task that queries your OApp status.

Create `tasks/getStatus.ts`:

```typescript
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("lz:oapp:status", "Get OApp status and statistics").setAction(
  async (args, hre: HardhatRuntimeEnvironment) => {
    // Get the network that hardhat is connected to
    const network = hre.network.name;
    console.log(`\n📊 Querying OApp on ${network}...\n`);

    // Get the deployment
    const deployment = await hre.deployments.get("SimpleMessenger");

    // Call the getContractAt()
    const contract = await hre.ethers.getContractAt(
      "SimpleMessenger",
      deployment.address,
    );

    // Now you can call any method on the contract you want.

    // Lets Query state
    const messagesSent = await contract.messagesSent();
    const messagesReceived = await contract.messagesReceived();
    const lastMessage = await contract.lastMessage();

    // Console Log Display results, here you could write stuff to a JSON or whatever you want.
    console.log("Contract Status:");
    console.log(`  Address: ${deployment.address}`);
    console.log(`  Messages Sent: ${messagesSent}`);
    console.log(`  Messages Received: ${messagesReceived}`);
    console.log(`  Last Message Received: "${lastMessage}"\n`);
  },
);
```

## Step 2. Registering Tasks

Each Task must be imported in your `/tasks/index.ts`:

```typescript
import "./helpers/deployInteractive";
import "./helpers/wireInteractive";
import "./getStatus";
```

## Step 3. Running the Task

```bash
pnpm hardhat lz:oapp:status --network arbitrum-sepolia
```

## Step 3: Create a Send Message Task

Now let's create a more complex task that sends cross-chain messages.

Create `tasks/sendMessage.ts`:

```typescript
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { Options } from "@layerzerolabs/lz-v2-utilities";

import { getDeployedContract } from "./helpers/taskHelpers";

task("lz:oapp:send", "Send a cross-chain message")
  .addParam("dstEid", "Destination endpoint ID", undefined, types.int)
  .addParam("message", "Message to send", undefined, types.string)
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    try {
      // Get deployed contract helper
      const { contract } = await getDeployedContract(hre, "SimpleMessenger");

      // Build options with gas limit
      const options = Options.newOptions()
        .addExecutorLzReceiveOption(200000, 0)
        .toBytes();

      // Quote the fee
      const fee = await contract.quoteSend(
        args.dstEid,
        args.message,
        options,
        false,
      );

      console.log(
        `Estimated native fee to send message: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`,
      );

      // Normally you would check the balance of the users account here

      // Send the message
      const tx = await contract.sendMessage(
        args.dstEid,
        args.message,
        options,
        { value: fee.nativeFee },
      );

      console.log("\n⏳ Sending message...\n");

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
    } catch (error: any) {
      console.log("error", error.toString());
      throw error;
    }
  });
```

**Usage:**

```bash
# Send a message from Ethereum Sepolia ----> Arbitrum Sepolia
pnpm hardhat lz:oapp:send --dst-eid 40231 --message "Hello from Ethereum!" --network ethereum-sepolia

# send a message from Abritrum Sepolia ----> Ethereum Sepolia
pnpm hardhat lz:oapp:send --dst-eid 40161 --message "Hello from Arbitrum!" --network arbitrum-sepolia
```

## Key Takeaways

- Hardhat tasks provide a reusable CLI interface for contract interaction
- Use helper functions to reduce boilerplate and improve consistency
- Always include proper error handling and user feedback
- Follow naming conventions for discoverability

## Next Steps

In the next lesson, we'll explore the ABA (Ping-Pong) messaging pattern, where a message to Chain B triggers an automatic response back to Chain A. This is useful for:

- Request-response workflows
- Cross-chain confirmations
- Automated cross-chain interactions

[Lesson 4 - ABA Message Pattern](./lesson-04-aba-messaging.md)

## Resources

- [Hardhat Tasks Documentation](https://hardhat.org/hardhat-runner/docs/advanced/create-task)
- [Task Helpers Reference](../../tasks/helpers/taskHelpers.ts)
- [LayerZero V2 Utilities](https://www.npmjs.com/package/@layerzerolabs/lz-v2-utilities)
