# Challenge 2: Quantum Thief 💎

**Difficulty**: 🟢 Easy

## 📖 The Story

A Rival OApp developer has created a "secure" vault that uses the **A-B-A pattern** for cross-chain withdrawal verification... or so they think. Their vault on Base is guarded by a guardian chain that must approve all withdrawals using LayerZero's ABA messaging pattern.

They're so confident in their security they released this statement earlier:

_"It's mathematically impossible to drain! If you can drain it, the tokens are yours."_

**Your mission:** Show them who is the omnichain king. Find the vulnerability and drain of their users funds.

**Contract Reference:** [RivalOappContract.sol](../../../src/contracts/lessons/Oapp/RivalOappContract.sol)

### Rival Oapp Deployment Addresses

- **Base Sepolia (Main Vault)**: `[TO BE DEPLOYED]`
- **Sepolia (Guardian)**: `[TO BE DEPLOYED]`

**⚠️ You do NOT need to modify their contract! The vulnerability exists in the deployed code.**

## 🧠 The Architecture

The Rival's "secure" vault works as follows:

1. **Deposit Phase** (Base Sepolia):

   - Users deposit tokens into the vault on Base Sepolia
   - Balances are tracked internally

2. **Withdrawal Request** (Base → Sepolia):

   - User calls `requestWithdrawal()` on Base Sepolia
   - Contract sends a `WITHDRAWAL_REQUEST` ping to Sepolia guardian

3. **Guardian Approval** (Sepolia → Base):

   - Sepolia guardian receives the request
   - Checks the withdraw request is valid then sends `WITHDRAWAL_APPROVAL` pong back to Base

4. **Withdrawal Execution** (Base Sepolia):
   - Base receives the approval
   - Executes the token transfer
   - Updates user balance

Seems secure, right? There's a critical flaw somewhere in this flow...

## 🎯 Objectives

**Your Task:**

1. 🔍 **Analyze** - Study the RivalsOappContract implementation for vulnerabilities
2. 💰 **Drain** - Successfully drain their users funds

## 📋 Submission

A single Markdown file containing:

1. **Complete Contract Code**:
2. **Deployed Contract Addresses**:
3. **Evidence**:
   - The user balance has been drained to your wallet
4. **Summary**: 200 words on your implementation

## Post Challenge

**Please deposit tokens back to the Rival's contract so other students can complete the challenge.**

The Rival's contract can be refunded by calling the deposit method on base Oapp contract:

```solidity
rivalContract.deposit(DRAINED_AMOUNT);
```

---

[← Back to Challenges](../lesson-06-challenges.md)
