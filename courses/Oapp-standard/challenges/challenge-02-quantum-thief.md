# Challenge 2: Quantum Thief 💎

**Difficulty**: 🟢 Easy | **Type**: Security Exploit | **Time**: 0.5-1 hours

## 📖 The Story

VaultCorp just launched their "quantum-secure" cross-chain vault. They use a sophisticated approval system where withdrawals must be approved by a guardian chain using LayerZero's ABA (A→B→A) messaging pattern.

Their marketing team announced:

> "Our vault is mathematically secure. Each withdrawal requires cross-chain approval. The funds are safer than Fort Knox!"

**Your mission:** Prove them wrong. Find the vulnerability and drain the vault using the message replay attack.

**Contract Reference:** [VaultReplayVulnerable.sol](../../../contracts/lessons/Oapp/VaultReplayVulnerable.sol)

### Vault Deployment Addresses

- **Arbitrum Sepolia (Main Vault)**: `[TO BE DEPLOYED]`
- **Base Sepolia (Approval Guardian)**: `[TO BE DEPLOYED]`

**⚠️ You do NOT need to modify their contract! The vulnerability exists in the deployed code.**

## 🧠 The Architecture

VaultCorp's "secure" withdrawal system works as follows:

1. **Deposit Phase** (Arbitrum Sepolia):
   - Users deposit ERC20 tokens into the vault
   - Balances are tracked internally

2. **Withdrawal Request** (Arbitrum → Base):
   - User calls `requestWithdrawal(amount, approvalChain, options...)`
   - Balance is immediately deducted to prevent double requests
   - Contract sends `WITHDRAWAL_REQUEST` to Base guardian chain

3. **Guardian Approval** (Base → Arbitrum):
   - Base guardian receives the request
   - Validates the request is legitimate
   - Sends `CREDIT_APPROVAL` message back to Arbitrum

4. **Withdrawal Execution** (Arbitrum):
   - Arbitrum receives the approval
   - Transfers tokens to the user
   - ✅ Withdrawal complete!

Seems secure, right? **There's a critical flaw in step 4...**

## 🎯 Objectives

**Your Task:**

1. 🔍 **Analyze** - Study VaultReplayVulnerable.sol to find the vulnerability
2. 💰 **Exploit** - Drain more tokens than you deposited
3. 📝 **Document** - Explain the attack in your submission

## 🕵️ The Vulnerability Hint

Think about what happens when a `CREDIT_APPROVAL` message arrives at the vault:

- Does the contract track which approval messages have been processed?
- What if you could intercept the approval message data?
- Could you send the same approval message multiple times?

## 📋 Submission

A single Markdown file containing:

1. **Complete Contract Code**:
2. **Deployed Contract Addresses**:
3. **Evidence**:
   - Successfully drain more tokens than you initially deposited
4. **Summary**: 200 words on your implementation

## Post Challenge

**Please refund the vault so other students can complete the challenge!**

After draining, deposit the tokens back using the `deposit()` function.

---

**Ready to become a Quantum Thief?** 💎

[← Back to Challenges](../lesson-06-challenges.md)
