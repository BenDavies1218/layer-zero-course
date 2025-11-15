# Challenge 5: Nexus Prime - The Omnichain DeFi Bank 👑

**Difficulty**: 🔴 Hard | **XP**: 500 | **Time**: 10-15 hours

## 📖 The Story

The Great Convergence is near. Blockchain realms must unite their treasuries into a single, all-powerful **Nexus Bank** - an omnichain DeFi protocol where value transcends dimensional boundaries.

You are the chosen **Bank Architect**. Your mission is legendary:

- Build a bank that accepts deposits on ANY chain (minimum 2 EVM chains + Solana!)
- Allow withdrawals on ANY chain (cross-dimensional transfers!)
- Maintain perfect TVL accounting across all realms
- Protect against the Dark Pattern attacks (reentrancy, double-spending, etc.)

**The stakes**: If you succeed, you become the **Prime Banker** and earn the rarest achievement in the course. If you fail, the realms remain divided forever.

## 🎯 Mission Objectives - The 4 Trials

### Trial 1: Omni-Deposit System 💰

**Goal**: Users can deposit tokens on any supported chain and receive vault shares

**How it works**:
1. User calls `deposit(amount)` on **any chain** (Sepolia, Arbitrum, Solana, etc.)
2. Contract transfers tokens from user to vault
3. Mints shares to user based on current share price: `shares = amount * totalShares / globalTVL`
4. Broadcasts deposit notification to all other chains via LayerZero

**Requirements**:
- [ ] Deposits work on minimum 2 EVM chains
- [ ] Deposits work on Solana (pre-deployed OApp provided)
- [ ] Shares calculated correctly based on global TVL
- [ ] Deposit notifications broadcast to all chains for TVL sync
- [ ] Share price updates dynamically

**Example Flow**:
```
User deposits 100 USDC on Sepolia
→ Contract takes 100 USDC
→ Mints 95 shares (based on current TVL/share ratio)
→ Sends message to Arbitrum: "User X deposited 100 USDC, got 95 shares"
→ Arbitrum updates global TVL
```

### Trial 2: Cross-Realm Withdrawal 🌉

**Goal**: Users can withdraw their tokens on ANY chain, even if they deposited on a different chain

**How it works**:
1. User calls `requestCrossChainWithdrawal(shares, targetChain)` on **any chain**
2. Contract sends withdrawal request to Master Bank via LayerZero
3. Master Bank validates shares and approves withdrawal
4. Target chain burns shares and transfers tokens to user

**Requirements**:
- [ ] Users can withdraw on different chain from deposit (e.g., deposit on Solana, withdraw on Sepolia)
- [ ] Withdrawal requests properly queued and routed through Master Bank
- [ ] Master bank validates user has sufficient shares globally
- [ ] Tokens correctly transferred on target chain
- [ ] Shares burned properly to prevent double-spending

**Example Flow**:
```
User deposited on Sepolia, wants to withdraw on Arbitrum
→ User calls requestCrossChainWithdrawal(95 shares, Arbitrum EID) on Sepolia
→ Sepolia sends message to Master Bank (e.g., Sepolia)
→ Master Bank verifies user has 95 shares globally
→ Master Bank sends approval to Arbitrum
→ Arbitrum burns 95 shares, transfers 100 USDC to user
```

### Trial 3: Global TVL Oracle 📊

**Goal**: Maintain accurate Total Value Locked across all chains for proper share pricing

**How it works**:
1. Each chain tracks its local TVL (deposits - withdrawals)
2. Master Bank aggregates TVL from all chains
3. TVL updates broadcast to all chains after deposits/withdrawals
4. Share price = `globalTVL / totalShares`

**Requirements**:
- [ ] TVL aggregation from all chains works correctly
- [ ] TVL sync happens within 5 minutes of any deposit/withdrawal
- [ ] All chains can query current global TVL
- [ ] TVL includes Solana balances
- [ ] Share price accurate across all chains (no arbitrage opportunities)

**Example Flow**:
```
Initial state: Sepolia has 1000 USDC, Arbitrum has 500 USDC, Solana has 300 USDC
→ Global TVL = 1800 USDC
→ User deposits 200 USDC on Sepolia
→ Sepolia local TVL = 1200 USDC
→ Sepolia broadcasts: "Deposit happened, my local TVL is now 1200"
→ Master Bank updates global TVL = 2000 USDC
→ Master Bank broadcasts new global TVL to all chains
```

### Trial 4: Solana Integration 🔗

**Goal**: Integrate with pre-deployed Solana OApp for cross-VM deposits and withdrawals

**How it works**:
1. Solana OApp is pre-deployed (you'll be given the program ID)
2. Your EVM contracts must set Solana as a trusted peer
3. Users deposit on Solana → Solana OApp sends message to EVM Master Bank
4. Users withdraw from Solana to EVM → Request routed through Master Bank

**Requirements**:
- [ ] Solana program configured as trusted peer on EVM chains
- [ ] EVM → Solana: Users can deposit on EVM and withdraw on Solana
- [ ] Solana → EVM: Users can deposit on Solana and withdraw on EVM
- [ ] Cross-VM TVL sync works (Solana TVL included in global calculation)
- [ ] Address conversion between EVM (20 bytes) and Solana (32 bytes) handled correctly

**Example Flow**:
```
User deposits on Solana
→ Solana OApp: deposit(amount)
→ Solana OApp mints shares
→ Solana OApp sends message to Sepolia (Master Bank):
   "User <solana_pubkey> deposited X tokens, minted Y shares"
→ Sepolia updates global TVL and totalShares
→ Sepolia broadcasts to all EVM chains

Later, user wants to withdraw on Arbitrum
→ User calls withdraw(shares, Arbitrum EID) on Solana
→ Solana sends withdrawal request to Sepolia (Master Bank)
→ Sepolia validates and approves
→ Sepolia sends approval to Arbitrum
→ Arbitrum transfers tokens to user's EVM address
```

## 📜 Technical Specification

```solidity
contract NexusPrimeBank is OApp, OAppOptionsType3, ReentrancyGuard {
    enum MessageType {
        DEPOSIT_NOTIFICATION,    // Chain → Master: "I received a deposit"
        WITHDRAWAL_REQUEST,      // Any Chain → Master: "User wants to withdraw"
        WITHDRAWAL_APPROVAL,     // Master → Target Chain: "Approved, send tokens"
        TVL_SYNC                // Master → All Chains: "Here's the new global TVL"
    }

    struct BankState {
        uint256 localTVL;        // TVL on this specific chain
        uint256 globalTVL;       // Aggregated TVL across all chains
        uint256 totalShares;     // Total shares across all chains
        uint256 lastTVLUpdate;   // Timestamp of last TVL update
    }

    struct UserPosition {
        uint256 shares;          // User's share balance
        uint256 depositAmount;   // Total deposited (for tracking)
        uint32 depositChain;     // Chain where user first deposited
        uint256 depositTime;     // When user deposited
    }

    struct WithdrawalRequest {
        address user;
        uint256 shares;
        uint256 amount;          // Tokens to receive
        uint32 targetChain;      // Where to receive tokens
        uint256 requestId;
        bool executed;
    }

    // Configuration
    uint32 public masterBankEid;   // The "coordinator" chain (e.g., Sepolia)
    bool public isMasterBank;      // Is this contract the master?

    // State
    BankState public bankState;
    IERC20 public depositToken;    // The token users deposit (e.g., USDC)

    // User tracking
    mapping(address => UserPosition) public positions;

    // Withdrawal queue (on master bank)
    mapping(uint256 => WithdrawalRequest) public withdrawalQueue;
    uint256 public nextWithdrawalId;

    // TVL tracking (on master bank)
    mapping(uint32 => uint256) public tvlByChain;  // Track each chain's TVL

    // Security
    mapping(bytes32 => bool) public processedMessages;  // Prevent replay attacks

    /*//////////////////////////////////////////////////////////////
                            DEPOSIT & WITHDRAWAL
    //////////////////////////////////////////////////////////////*/

    /// @notice Deposit tokens and receive shares (on current chain)
    function deposit(uint256 _amount) external nonReentrant {
        // 1. Transfer tokens from user
        depositToken.transferFrom(msg.sender, address(this), _amount);

        // 2. Calculate shares
        uint256 shares = _calculateShares(_amount);

        // 3. Update user position
        positions[msg.sender].shares += shares;
        positions[msg.sender].depositAmount += _amount;

        // 4. Update local TVL
        bankState.localTVL += _amount;
        bankState.totalShares += shares;

        // 5. Notify master bank (if we're not master)
        if (!isMasterBank) {
            bytes memory payload = abi.encode(
                MessageType.DEPOSIT_NOTIFICATION,
                msg.sender,
                _amount,
                shares
            );
            _lzSend(masterBankEid, payload, options, fee, refundAddress);
        } else {
            // We are master, update global TVL directly
            _updateGlobalTVL();
        }

        emit Deposited(msg.sender, _amount, shares);
    }

    /// @notice Withdraw on same chain where you currently are
    function withdrawLocal(uint256 _shares) external nonReentrant {
        require(positions[msg.sender].shares >= _shares, "Insufficient shares");

        // 1. Calculate withdrawal amount
        uint256 amount = _calculateWithdrawalAmount(_shares);

        // 2. Update user position
        positions[msg.sender].shares -= _shares;

        // 3. Update local state
        bankState.totalShares -= _shares;
        bankState.localTVL -= amount;

        // 4. Transfer tokens
        depositToken.transfer(msg.sender, amount);

        // 5. Notify master to update global TVL
        if (!isMasterBank) {
            bytes memory payload = abi.encode(
                MessageType.TVL_SYNC,
                bankState.localTVL
            );
            _lzSend(masterBankEid, payload, options, fee, refundAddress);
        }

        emit Withdrawn(msg.sender, _shares, amount);
    }

    /// @notice Request withdrawal on a different chain
    function requestCrossChainWithdrawal(
        uint256 _shares,
        uint32 _targetChain,
        bytes calldata _options
    ) external payable nonReentrant {
        require(positions[msg.sender].shares >= _shares, "Insufficient shares");

        // Send withdrawal request to master bank
        bytes memory payload = abi.encode(
            MessageType.WITHDRAWAL_REQUEST,
            msg.sender,
            _shares,
            _targetChain
        );

        _lzSend(
            masterBankEid,
            payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit WithdrawalRequested(msg.sender, _shares, _targetChain);
    }

    /*//////////////////////////////////////////////////////////////
                            TVL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _calculateShares(uint256 _amount) internal view returns (uint256) {
        if (bankState.totalShares == 0) {
            return _amount; // First deposit: 1:1 ratio
        }
        // shares = amount * totalShares / globalTVL
        return (_amount * bankState.totalShares) / bankState.globalTVL;
    }

    function _calculateWithdrawalAmount(uint256 _shares) internal view returns (uint256) {
        // amount = shares * globalTVL / totalShares
        return (_shares * bankState.globalTVL) / bankState.totalShares;
    }

    function getSharePrice() external view returns (uint256) {
        if (bankState.totalShares == 0) return 1e18;
        return (bankState.globalTVL * 1e18) / bankState.totalShares;
    }

    /*//////////////////////////////////////////////////////////////
                            LAYERZERO RECEIVE
    //////////////////////////////////////////////////////////////*/

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        // Replay protection
        require(!processedMessages[_guid], "Already processed");
        processedMessages[_guid] = true;

        // Verify peer
        require(peers[_origin.srcEid] == _origin.sender, "Unauthorized peer");

        // Decode message type
        MessageType msgType = abi.decode(_payload, (MessageType));

        if (msgType == MessageType.DEPOSIT_NOTIFICATION) {
            _handleDepositNotification(_payload, _origin.srcEid);
        } else if (msgType == MessageType.WITHDRAWAL_REQUEST) {
            _handleWithdrawalRequest(_payload, _origin.srcEid);
        } else if (msgType == MessageType.WITHDRAWAL_APPROVAL) {
            _handleWithdrawalApproval(_payload);
        } else if (msgType == MessageType.TVL_SYNC) {
            _handleTVLSync(_payload);
        }
    }

    // Master bank receives deposit notifications
    function _handleDepositNotification(bytes memory _payload, uint32 _srcEid) internal {
        require(isMasterBank, "Only master");

        (, address user, uint256 amount, uint256 shares) = abi.decode(
            _payload,
            (MessageType, address, uint256, uint256)
        );

        // Update global tracking
        tvlByChain[_srcEid] += amount;
        bankState.globalTVL += amount;
        bankState.totalShares += shares;

        // Broadcast new global TVL to all chains
        _broadcastTVL();
    }

    // Master bank handles withdrawal requests
    function _handleWithdrawalRequest(bytes memory _payload, uint32 _srcEid) internal {
        require(isMasterBank, "Only master");

        (, address user, uint256 shares, uint32 targetChain) = abi.decode(
            _payload,
            (MessageType, address, uint256, uint32)
        );

        // Validate user has shares globally
        require(positions[user].shares >= shares, "Insufficient shares");

        // Deduct shares globally
        positions[user].shares -= shares;
        bankState.totalShares -= shares;

        uint256 amount = _calculateWithdrawalAmount(shares);

        // Send approval to target chain
        bytes memory approvalPayload = abi.encode(
            MessageType.WITHDRAWAL_APPROVAL,
            user,
            shares,
            amount
        );

        _lzSend(targetChain, approvalPayload, defaultOptions, defaultFee, payable(address(this)));
    }

    // Target chain executes withdrawal
    function _handleWithdrawalApproval(bytes memory _payload) internal {
        (, address user, uint256 shares, uint256 amount) = abi.decode(
            _payload,
            (MessageType, address, uint256, uint256)
        );

        // Update local state
        bankState.localTVL -= amount;

        // Transfer tokens
        depositToken.transfer(user, amount);

        emit Withdrawn(user, shares, amount);
    }
}
```

## 🌌 Solana Integration Guide

You'll interact with a **pre-deployed Solana OApp**. Here's how:

### Step 1: Configure Solana as Peer

```solidity
// On your EVM contract (e.g., Sepolia)
// Solana endpoint ID = 40168 (Solana Devnet)
bytes32 solanaPeerAddress = 0x...;  // Provided Solana program address (32 bytes)

nexusBank.setPeer(40168, solanaPeerAddress);
```

### Step 2: Handle Solana Messages

The Solana OApp will send messages in the same format:

```rust
// Solana OApp (already deployed - for reference)
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Transfer tokens to vault
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;

    // Calculate shares
    let shares = calculate_shares(amount, ctx.accounts.bank_state)?;

    // Update user position
    ctx.accounts.user_position.shares += shares;

    // Send cross-chain message to EVM Master Bank
    let message = Message::DepositNotification {
        user: ctx.accounts.user.key().to_bytes(),
        amount,
        shares,
    };

    lz_send(master_bank_eid, message)?;

    Ok(())
}
```

### Address Conversion (EVM ↔ Solana)

```solidity
// EVM address (20 bytes) → Solana (32 bytes): Left-pad with zeros
function evmToSolana(address _evmAddress) internal pure returns (bytes32) {
    return bytes32(uint256(uint160(_evmAddress)));
}

// Solana (32 bytes) → EVM address (20 bytes): Take last 20 bytes
function solanaToEvm(bytes32 _solanaPubkey) internal pure returns (address) {
    return address(uint160(uint256(_solanaPubkey)));
}
```

## ✅ Success Criteria

### Trial 1: Omni-Deposit System (125 XP)

- [ ] Deposits work on minimum 2 EVM chains
- [ ] Deposits work on Solana (using pre-deployed OApp)
- [ ] Shares calculated correctly based on TVL
- [ ] Deposit notifications broadcast to Master Bank
- [ ] Share price updates dynamically

### Trial 2: Cross-Realm Withdrawal (125 XP)

- [ ] Users can withdraw on different chain from deposit
- [ ] Withdrawal requests properly routed through Master Bank
- [ ] Master bank validates shares before approval
- [ ] Tokens correctly transferred on target chain
- [ ] Shares burned properly (no double-spending possible)

### Trial 3: Global TVL Oracle (125 XP)

- [ ] TVL aggregation from all chains works
- [ ] TVL sync within 5 minutes
- [ ] All chains can query current global TVL
- [ ] TVL includes Solana balances
- [ ] Share price accurate across all chains

### Trial 4: Solana Integration (125 XP)

- [ ] Solana OApp configured as trusted peer
- [ ] EVM → Solana: Deposit on EVM, withdraw on Solana
- [ ] Solana → EVM: Deposit on Solana, withdraw on EVM
- [ ] Cross-VM TVL sync works
- [ ] Address conversion (20-byte ↔ 32-byte) handled correctly

## 🎁 Rewards

### Completion Rewards

- **500 XP** - Complete all 4 trials
- **👑 Grandmaster** rank achieved
- **Prime Banker** title unlocked

### Performance Bonuses

- **+100 XP** - All 4 trials perfect score
- **+50 XP** - Gas-efficient implementation
- **+50 XP** - Excellent code documentation

### Special Achievements

- 🏆 **Nexus Prime** - Complete with perfect score (700 XP)
- 🌟 **Omnichain Master** - First to complete
- 💎 **Solana Specialist** - Perfect Solana integration

## 📋 Submission Requirements

1. **Code Repository**
   - All contract code (EVM + Solana integration)
   - Deployment scripts
   - Tests for all 4 trials
   - README with architecture

2. **Deployment Proof**
   - Contract addresses on all chains
   - Verified contracts on block explorers
   - Solana peer configuration proof

3. **Demo Video (5-10 minutes)**
   - Deposit on Sepolia
   - Withdraw on Arbitrum
   - Deposit on Solana, withdraw on EVM
   - TVL sync demonstration

4. **Technical Documentation**
   - Architecture diagram showing Master Bank pattern
   - Message flow charts for deposits and withdrawals
   - TVL aggregation explanation

## 💡 Development Guide

### Phase 1: Foundation (Days 1-3)

1. Deploy bank contract on 2 EVM chains (e.g., Sepolia, Arbitrum)
2. Implement deposit/withdrawal on single chain
3. Test share calculations
4. Configure one chain as Master Bank

### Phase 2: Cross-Chain (Days 4-7)

1. Implement deposit notifications to Master Bank
2. Build cross-chain withdrawal flow
3. Add TVL sync mechanism
4. Test deposit on Chain A, withdraw on Chain B

### Phase 3: Solana Integration (Days 8-10)

1. Configure Solana OApp as peer (address provided)
2. Handle Solana deposit notifications
3. Implement Solana → EVM withdrawals
4. Test address conversion
5. Verify TVL includes Solana balances

### Phase 4: Testing & Polish (Days 11-12)

1. Comprehensive integration tests
2. Gas optimization
3. Documentation
4. Demo video recording

## 🔐 Key Security Considerations

1. **Replay Protection**: Track processed message GUIDs
2. **Peer Validation**: Only accept messages from trusted peers
3. **Share Accounting**: Ensure shares can't be double-spent across chains
4. **TVL Accuracy**: Prevent arbitrage through TVL manipulation
5. **Reentrancy**: Use `nonReentrant` on deposit/withdraw functions

---

**Ready to build the Omnichain Bank and become Prime Banker?** 👑🏦

**Note**: The Solana OApp address will be provided when you start the challenge.

[← Back to Challenges](../challenges.md)
