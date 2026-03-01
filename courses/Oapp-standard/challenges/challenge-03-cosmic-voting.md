# Challenge 3: Cosmic Council Voting 🗳️

**Difficulty**: 🟡 Medium | **Type**: Implementation | **Time**: 2-3 hours

## 📖 The Story

The Cosmic Council needs a simple voting system that works across multiple blockchains. Council members are spread across different chains, but they all need to vote on the same proposals.

Your mission: Build a synchronized cross-chain voting system where anyone can create proposals on any chain, vote from any chain, and everyone sees the same results everywhere.

## 🎯 Objectives

Build a **SimpleCosmicVoting** contract that:

1. ✍️ **Create proposals** - Anyone can create a proposal on any chain
2. 🗳️ **Vote anywhere** - Cast votes from any connected chain
3. 🔄 **Auto-sync** - Votes automatically sync across all chains
4. 📊 **See results** - All chains show the same vote counts
5. ⏰ **Time limits** - Proposals have voting deadlines

## 📊 How It Should Work

### Scenario 1: Creating a Proposal

**Action:**

- Alice creates proposal "Should we build a moon base?" on Arbitrum with 24-hour voting period

**Expected Result:**

- Proposal appears on Arbitrum immediately
- Within 5 minutes, same proposal appears on Base and Optimism
- All chains show: Proposal #0, 0 FOR, 0 AGAINST, ends in 24 hours

### Scenario 2: Voting from Different Chains

**Action:**

- Alice votes FOR on Arbitrum
- Bob votes AGAINST on Base
- Charlie votes FOR on Optimism

**Expected Result:**

- After all messages sync (5-10 minutes):
- All chains show: 2 FOR, 1 AGAINST
- Alice, Bob, and Charlie are all marked as "has voted"
- None of them can vote again on any chain

### Scenario 3: Double Vote Prevention

**Action:**

- Alice votes FOR on Arbitrum
- Alice tries to vote AGAINST on Base before first vote syncs

**Expected Result:**

- Vote on Base is rejected OR ignored during sync
- Alice's first vote (FOR) is counted
- Alice is marked as voted on all chains

### Scenario 4: Voting Deadline

**Action:**

- Proposal created with 1-hour voting period
- User tries to vote after 61 minutes

**Expected Result:**

- Transaction reverts with "Voting ended"
- Vote is not counted

## ✅ Success Criteria

**Basic Implementation:**

- [ ] Deploy on atleast 2 chains
- [ ] Can create proposals on any chain
- [ ] Proposals sync to all other chains within 5 minutes
- [ ] Can vote on any chain
- [ ] Votes sync to all chains
- [ ] All chains show same vote totals
- [ ] Prevents double voting (same address can't vote twice)
- [ ] Enforces voting deadlines

**Demonstration:**

- [ ] Create proposal on Arbitrum
- [ ] Verify it appears on Base and Optimism
- [ ] Alice votes FOR on Arbitrum
- [ ] Bob votes AGAINST on Base
- [ ] Charlie votes FOR on Optimism
- [ ] All chains show: 2 FOR, 1 AGAINST

## 🎯 Key Challenges to Solve

### Challenge 1: Broadcasting to Multiple Chains

When a proposal is created or a vote is cast, how do you send it to ALL peer chains?

**Considerations:**

- You'll need to track which chains are peers
- Each cross-chain message costs gas fees
- Who pays for the broadcasting?

### Challenge 2: Proposal ID Conflicts

What if two people create proposals on different chains at the same time? Both could become "Proposal #0"!

**Considerations:**

- How do you make proposal IDs globally unique?
- Should you include the chain ID in the proposal ID?
- Or use a different numbering scheme?

### Challenge 3: Race Conditions

Alice votes on Arbitrum, then quickly votes on Base before the first vote syncs. What happens?

**Considerations:**

- Which vote should count?
- How do you detect duplicates during sync?
- Should you prevent the second vote, or ignore it?

### Challenge 4: Cross-Chain Fee Management

Broadcasting to 5 chains costs 5x the gas fees!

**Considerations:**

- Should users pay for cross-chain fees upfront?
- How do you calculate the total cost?
- What if they don't send enough ETH?

## 💡 Architecture Hints

**Message Types You'll Need:**

- Proposal created (sync proposal to other chains)
- Vote cast (sync vote to other chains)

**Data to Sync:**

- Proposal: ID, description, creator, end time
- Vote: proposal ID, voter address, choice (FOR/AGAINST)

**State to Track:**

- Proposals on each chain
- Vote counts (FOR and AGAINST)
- Who has voted on each proposal
- List of peer chains to broadcast to

## 📋 Submission

Submit a document with:

1. **Contract Code**: Your complete SimpleCosmicVoting.sol
2. **Deployment Addresses**: On at least 3 chains
3. **Demo Proof**:
   - Transaction hash of proposal creation
   - Screenshots showing proposal on all chains
   - Vote transactions from different chains
   - Final vote counts matching across all chains
4. **Explanation** (200-300 words):
   - How does your sync mechanism work?
   - How do you prevent double voting?
   - How did you solve proposal ID conflicts?
   - What happens if messages arrive out of order?

## 🏆 Bonus Challenges

**+20 points each:**

- [ ] Add proposal cancellation (creator can cancel before voting ends)
- [ ] Implement vote delegation (vote on behalf of someone)
- [ ] Add minimum quorum requirement (e.g., need 10 votes minimum)
- [ ] Create a quote function to tell users how much ETH they need to send

## 💡 Pro Tips

- LayerZero messages can take 2-5 minutes on testnets - be patient!
- Use events to track when messages are sent and received
- Test locally first if possible
- Fund your contracts with native tokens for gas fees
- The `_getPeerOrRevert()` function is useful for iterating peers

---

**Ready to sync the cosmos?** 🚀

[← Back to Challenges](../lesson-06-challenges.md)
