# Challenge 4: Escrow Race Condition 🏁

**Difficulty**: 🟡 Medium | **Type**: Security Exploit | **Time**: 1-2 hours

## 📖 The Story

CrossTradeCorp just launched their "revolutionary" cross-chain escrow service. Buyers on one chain can create escrows, and sellers on another chain can deliver goods and receive payment - all secured by LayerZero messaging.

Their CEO confidently stated:

> "Our escrow is bulletproof. Funds are locked until both parties agree. It's the future of cross-chain commerce!"

**Your mission:** Exploit the vulnerability.

**Contract Reference:** [EscrowRaceVulnerable.sol](../../../contracts/lessons/Oapp/EscrowRaceVulnerable.sol)

### Escrow Deployment Addresses

- **Arbitrum Sepolia (Buyer Chain)**: `[TO BE DEPLOYED]`
- **Base Sepolia (Seller Chain)**: `[TO BE DEPLOYED]`

**⚠️ You do NOT need to modify their contract! The vulnerability exists in the deployed code.**

## 🧠 The Architecture

CrossTradeCorp's escrow system works as follows:

### 1. Escrow Creation (Arbitrum - Buyer's Chain)

- Buyer deposits 1000 USDC for a trade
- Escrow status: `ACTIVE`
- Funds locked in contract

### 2. Happy Path - Release (Buyer or Seller Initiates)

- Buyer releases after receiving goods OR Seller requests release after delivery
- Message sent cross-chain
- Tokens released to seller
- Escrow status: `RELEASED`

### 3. Unhappy Path - Cancel (Buyer Refund)

- Buyer cancels if seller doesn't deliver
- Buyer gets immediate refund
- Notification sent to seller's chain
- Escrow status: `CANCELLED`

**The problem:** What if both actions happen at the same time?

## 🎯 Objectives

**Your Task:**

1. 🔍 **Analyze** - Study EscrowRaceVulnerable.sol for race conditions
2. ⚡ **Exploit** - Trigger simultaneous release and cancel
3. 💰 **Profit** - Get both refund AND payment (double the money)
4. 📝 **Document** - Explain the attack vector

## 🕵️ The Vulnerability Hints

### Hint 1: State Management

When the buyer calls `buyerRelease()`:

- Does the status change to `RELEASED` immediately?
- Or only after the cross-chain message arrives?

### Hint 2: Cancel Function

When the buyer calls `buyerCancel()`:

- Does the buyer get refunded immediately?
- Or only after cross-chain confirmation?

### Hint 3: Message Timing

If the buyer calls `buyerRelease()` and then `buyerCancel()` 5 seconds later:

- What happens when the release message arrives on the seller's chain?
- Does it check if the escrow was already cancelled?
- Can both operations succeed?

## 💡 Attack Strategies

### Attack Vector 1: Double Spend (Easier)

**The Race:**

1. Buyer calls `buyerRelease()` on Arbitrum (sends cross-chain message)
2. **Immediately** buyer calls `buyerCancel()` on Arbitrum (gets instant refund)
3. Release message arrives on Base a few minutes later
4. Seller receives payment
5. **Result:** Buyer got refund AND seller got paid (escrow lost money)

**Timing Window:**

- LayerZero messages take 2-5 minutes to deliver
- During this time, the buyer can cancel and get a refund
- But the release message is already in flight!

### Attack Vector 2: Seller Front-Run (Advanced)

**The Race:**

1. Seller calls `sellerRequestRelease()` on Base
2. Buyer sees pending transaction and calls `buyerCancel()` on Arbitrum
3. Depending on which message arrives first, both could succeed

## 📋 Success Criteria

To complete this challenge:

- [ ] Create an escrow with at least 100 tokens
- [ ] Successfully trigger both release and cancel
- [ ] Demonstrate that funds left the escrow twice (refund + payment)
- [ ] Provide transaction hashes for:
  - Escrow creation
  - Release initiation
  - Cancel execution
  - Final token transfers
- [ ] Show before/after balances proving the double-spend

## 🧠 Understanding Race Conditions

### What is a Race Condition?

A race condition occurs when:

1. Two operations can happen simultaneously
2. The final result depends on which operation completes first
3. One or both operations can succeed when they shouldn't

In cross-chain systems, race conditions are **especially dangerous** because:

- Messages take 2-5 minutes to arrive
- State exists on multiple chains
- No global lock/mutex across chains

### Why is This Critical?

Traditional blockchain contracts are atomic - both operations succeed or both fail.

Cross-chain contracts are **NOT** atomic:

- Message sent (may take minutes to arrive)
- User can do other things while message is in-flight!
- Second operation might execute before first one completes

### The TOCTOU Problem

This is a classic **Time-Of-Check-Time-Of-Use** (TOCTOU) bug:

1. Buyer calls `buyerCancel()` - status is ACTIVE ✓
2. Cancel executes, buyer gets refund
3. **2 minutes pass while cancel message travels...**
4. Release message arrives - status was ACTIVE when sent ✓
5. Release executes, seller gets paid
6. Both operations succeeded!

### Real-World Examples

This vulnerability pattern has caused:

- **Poly Network (2021)**: $600M stolen - race condition in cross-chain transaction validation
- **THORChain (2021)**: $8M stolen - race condition in bifrost protocol
- **Multichain Bridge (2023)**: $126M stuck - conflicting state updates across chains

## 📋 Submission

Submit a report containing:

1. **Exploit Code**:
   - Complete script showing the race condition exploit
   - Can be JavaScript, Python, or Solidity

2. **Transaction Evidence**:
   - Escrow creation TX
   - Release initiation TX
   - Cancel execution TX
   - Token transfer TXs (both refund and payment)
   - LayerZero Scan links

3. **Balance Proof**:
   - Buyer balance before: X tokens
   - Seller balance before: Y tokens
   - Escrow balance before: 1000 tokens
   - Buyer balance after: X + 1000 tokens (got refund)
   - Seller balance after: Y + 1000 tokens (got paid)
   - Escrow balance after: 0 tokens (double-spent!)

4. **Vulnerability Analysis** (400-500 words):
   - Explain the race condition in detail
   - Why does the current code allow this?
   - What is the timing window?
   - How should it be fixed?
   - What are the security implications?

5. **Proposed Fix**:
   - Explain how to prevent the race condition
   - Discuss trade-offs (UX vs security)

## Post Challenge

**Please refund the escrow contract so other students can complete the challenge!**

After exploiting, send tokens back to the escrow contract address.

---

**Pro Tips:**

- Use the `--async` flag with blockchain commands to avoid waiting for confirmations
- Monitor both chains simultaneously to see state divergence
- LayerZero messages typically take 2-5 minutes on testnets
- The longer the cross-chain delay, the easier the exploit

**Ready to break the escrow?** 🏁

[← Back to Challenges](../lesson-06-challenges.md)
