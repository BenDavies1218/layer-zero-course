# Challenge 2: The Quantum Thief 💎

**Difficulty**: 🟢 Easy

## 📖 The Story

A Rival OApp developer has created a "secure" vault that uses cross chain Oapp messaging to secure their tokens... or so they think. They're so confident that they've left 1000 Labrys tokens in thier main vault deployed on Base.

“If you can drain our vault, the tokens are yours.”

**Your mission:** Prove them wrong. Find the vulnerability and drain their main vault on Base.

RivalOappContract [@View Here](../../../src/contracts/Oapp/RivalOappContract.sol)

**⚠️ You do NOT need to modify their contract! The vulnerability exists in the deployed code.**

## 🎯 Objectives

**Your Task:**

1. 🔍 **Analyze** - Study the RivalsOappContract for vulnerabilities
2. 💻 **Build** - Create a malicious Contract to drain the rivals Contact on Base
3. 🚀 **Deploy** - Deploy your exploit on the required chains
4. 💰 **Drain** - Successfully extract all tokens from the Base Contract

## 📋 Submission

Submit a single Markdown file containing:

A single Markdown file containing:

1. **Complete Malicious Contract Code**
2. **Deployed Contract Addresses**:
3. **Evidence**:
   - Transaction hash of deposit
   - Transaction hash of attack
   - Transaction hash showing vault drained
4. **Summary**: 200 words on your implementation
5. **Proposed Solution** Brief description of how the vulnerbility could be avoided

## Post Challenge

**Please deposit tokens back to the Rival's contract so other students can complete the challenge.**

The Rival's contract can be refunded by calling the deposit method on base Oapp contract:

```solidity
rivalContract.deposit(DRAINED_AMOUNT);
```

---

[← Back to Challenges](../lesson-06-challenges.md)
