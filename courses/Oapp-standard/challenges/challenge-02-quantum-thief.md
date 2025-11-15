# Challenge 2: The Quantum Thief 💎 (EXPLOIT CHALLENGE)

**Difficulty**: 🟢 Easy | **XP**: 150 | **Type**: Security Exploit | **Time**: 1-2 hours

## 📖 The Story

A rival OApp developer has created a "secure" cross-chain vault... or so they think. They're so confident that they've left 1000 test tokens spread across chains and challenged the community: "No one can drain my vault!"

**Your mission:** Prove them wrong. Find the vulnerability and drain the vault across all chains.

**Already Deployed Vulnerable Contract**: `VulnerableVault.sol`

## 🎯 Mission Objectives

**The Vulnerable Contract is already deployed on:**

- ✅ Ethereum Sepolia: `0x[ADDRESS_I_PROVIDE]`
- ✅ Arbitrum Sepolia: `0x[ADDRESS_I_PROVIDE]`
- ✅ Optimism Sepolia: `0x[ADDRESS_I_PROVIDE]`

**The Vulnerability**: The contract has a reentrancy bug in its cross-chain withdrawal logic. When a withdrawal request arrives from another chain, it updates balances AFTER sending tokens.

**Your Task:**

1. 🔍 **Analyze** the deployed contract
2. 💻 **Build an exploit contract** that drains funds
3. 💰 **Successfully drain** tokens from all 3 chains to your wallet
4. 📝 **Write a report** explaining the vulnerability and fix

## 🕵️ The Vulnerable Contract (Read-Only)

```solidity
// ALREADY DEPLOYED - DO NOT MODIFY
contract VulnerableVault is OApp, OAppOptionsType3 {
    IERC20 public token;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public totalDeposited;

    event Deposited(address user, uint256 amount);
    event WithdrawalRequested(address user, uint256 amount, uint32 targetChain);

    function deposit(uint256 _amount) external {
        token.transferFrom(msg.sender, address(this), _amount);
        balances[msg.sender] += _amount;
        totalDeposited[msg.sender] += _amount;
        emit Deposited(msg.sender, _amount);
    }

    function requestCrossChainWithdrawal(
        uint256 _amount,
        uint32 _targetChain,
        bytes calldata _options
    ) external payable {
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        bytes memory payload = abi.encode(msg.sender, _amount);

        _lzSend(
            _targetChain,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit WithdrawalRequested(msg.sender, _amount, _targetChain);
    }

    // 🚨 VULNERABLE FUNCTION - Can you spot the bug?
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        (address user, uint256 amount) = abi.decode(_payload, (address, uint256));

        // BUG: Token transfer happens before balance update!
        token.transfer(user, amount);

        // Balance updated AFTER transfer (reentrancy possible!)
        balances[user] -= amount;
    }
}
```

## 🎯 Your Exploit Contract

Build an attacker contract that:

```solidity
contract QuantumThief {
    VulnerableVault public vault;
    bool public attacking;

    // Initiate the attack
    function steal() external payable;

    // Receive tokens and trigger reentrancy
    receive() external payable;

    // Withdraw stolen funds
    function withdraw() external;
}
```

## ✅ Success Criteria

**Exploit Requirements (120 XP):**

- [ ] Build exploit contract that successfully drains funds
- [ ] Drain vault on at least 2 chains
- [ ] Demonstrate reentrancy attack works cross-chain
- [ ] Screenshot proof of drained balance

**Report Requirements (30 XP):**

- [ ] Explain the vulnerability in detail
- [ ] Provide code showing the fix
- [ ] Explain why this is dangerous in production
- [ ] Suggest additional security measures

## 🎁 Rewards

- **150 XP** for successful exploit + report
- **💎 Bounty Hunter** achievement badge
- **Bonus 50 XP** if you can also exploit via flash loan pattern
- Recognition in the **White Hat Hall of Fame**

## 🛡️ How to Fix (After Exploiting)

<details>
<summary>Click to reveal the fix</summary>

```solidity
function _lzReceive(...) internal override {
    (address user, uint256 amount) = abi.decode(_payload, (address, uint256));

    // FIX: Update state BEFORE external call
    balances[user] -= amount;  // Move this BEFORE transfer

    token.transfer(user, amount);
}
```

**Key Lesson**: Always follow **Checks-Effects-Interactions** pattern!

</details>

## 🧠 Understanding the Vulnerability

### The Reentrancy Attack Flow

1. Attacker deposits 100 tokens on Chain A
2. Attacker requests cross-chain withdrawal to Chain B
3. Chain B's `_lzReceive` is called
4. **BUG**: Tokens are transferred BEFORE balance update
5. If the token has a callback (like ERC777), attacker can re-enter
6. Re-enter and withdraw again before balance is updated
7. Repeat until vault is drained

### Why This is Dangerous

- **Cross-chain reentrancy** is harder to detect than same-chain
- Most developers focus on same-chain reentrancy guards
- LayerZero messages can trigger vulnerable receive logic
- Can drain entire protocol across multiple chains

## 💡 Exploit Development Hints

<details>
<summary>Click for hints</summary>

1. **Use ERC777 tokens** or implement a malicious token with `tokensReceived` hook
2. **Track reentry attempts** with a counter to prevent infinite loops
3. **Calculate optimal drain amount** to maximize extraction
4. **Fund your exploit contract** with gas for LayerZero fees
5. **Test on one chain first** before attempting multi-chain drain

</details>

## 🧪 Testing Your Exploit

1. Deploy your `QuantumThief` contract
2. Fund it with initial deposit amount
3. Deposit into `VulnerableVault`
4. Call `steal()` function
5. Verify vault balance decreased
6. Check your contract received more than deposited
7. Repeat on other chains

## 📋 Report Template

Your security report should include:

### Executive Summary

- Brief overview of the vulnerability
- Impact assessment (Critical/High/Medium/Low)
- Affected components

### Vulnerability Details

- **Type**: Reentrancy
- **Location**: `_lzReceive` function
- **Root Cause**: State update after external call

### Proof of Concept

- Step-by-step exploit walkthrough
- Code snippets of exploit contract
- Transaction hashes from testnet

### Recommended Fix

```solidity
// Before (vulnerable)
token.transfer(user, amount);
balances[user] -= amount;

// After (secure)
balances[user] -= amount;
token.transfer(user, amount);
```

### Additional Recommendations

- Implement `ReentrancyGuard` from OpenZeppelin
- Add balance checks after transfers
- Consider using `SafeERC20` library
- Audit all cross-chain message handlers

## 🏆 Bounty Hall of Fame

First 5 successful exploits will be listed here:

1. _Waiting for first thief..._
2. _Waiting for second thief..._
3. _Waiting for third thief..._
4. _Waiting for fourth thief..._
5. _Waiting for fifth thief..._

## 📋 Submission

Submit the following:

1. Your exploit contract code
2. Transaction hashes showing successful drains
3. 500-word security report
4. Screenshots of before/after balances
5. (Optional) Video walkthrough of the exploit

---

**Ready to become a white hat hacker?** Start analyzing the vulnerable contract!

[← Back to Challenges](../challenges.md)
