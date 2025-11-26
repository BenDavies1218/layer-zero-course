# Lesson 03 — Creating Hardhat Tasks for Contract Interaction

In this lesson, you'll learn how to create Hardhat tasks to interact with your deployed OApp contracts. Tasks provide a convenient way for common operations like calling contract methods and querying state.

## What You'll Learn

- How Hardhat tasks work and why they're useful
- Create a task to interacte with the simpleMessenger contract from lesson 2.

## Prerequisites

Before starting, ensure you have:

- Completed Lesson 02 Simple Oapp
- Have a deployed and wired your OApp contracts

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

```typescript
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

//        Name       Description
task("task:name", "Description of what this task does")
  // Required Parameter.                        Default Value  Param Type
  .addParam("paramName", "Parameter description", undefined, types.string)

  // Optional Parameter.
  .addOptionalParam(
    "paramName",
    "Parameter description",
    undefined,
    types.string,
  )

  // Function to set executed
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    // Task implementation
  });
```

Built-in CLI flags (available to all tasks):

- --network - Specifies which network to use
- --show-stack-traces - Shows full stack traces on errors
- --version - Shows Hardhat version
- --help - Shows help for the task
- --config - Custom config file path
- --verbose - Enables verbose logging

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

Each Task must be imported in your `/tasks/index.ts` or the hardhat.config.ts:

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

Create `tasks/send.ts`:

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
      const fee = await contract.quote(
        args.dstEid,
        args.message,
        options,
        false,
      );

      console.log(
        `Estimated native fee to send message: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`,
      );

      // Check user's balance
      const [signer] = await hre.ethers.getSigners();
      const balance = await signer.getBalance();

      if (balance.lt(fee.nativeFee)) {
        throw new Error(
          `Insufficient balance. Required: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH, Available: ${hre.ethers.utils.formatEther(balance)} ETH`,
        );
      }

      console.log(
        `Account balance: ${hre.ethers.utils.formatEther(balance)} ETH`,
      );

      // Send the message
      const tx = await contract.send(args.dstEid, args.message, options, {
        value: fee.nativeFee,
      });

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

Send a message from Ethereum Sepolia ----> Arbitrum Sepolia

```bash
pnpm hardhat lz:oapp:send --dst-eid 40231 --message "Hello from Ethereum" --network ethereum-sepolia
```

Send a message from Abritrum Sepolia ----> Ethereum Sepolia

```bash
pnpm hardhat lz:oapp:send --dst-eid 40161 --message "Hello from Arbitrum" --network arbitrum-sepolia
```

## Step 4 Validate the messages where sent

Note you will need to wait for the executor to call your contract on the destination chain to see state updates.

```bash
pnpm hardhat lz:oapp:status --network arbitrum-sepolia
```

```bash
pnpm hardhat lz:oapp:status --network ethereum-sepolia
```

## Key Takeaways

- Hardhat tasks provide a reusable CLI interface for contract interaction
- Use helper functions to reduce boilerplate and improve consistency
- Always include proper error handling and logs

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
