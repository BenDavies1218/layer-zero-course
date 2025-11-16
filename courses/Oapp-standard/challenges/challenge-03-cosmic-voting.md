# Challenge 3: Cosmic Council Voting 🗳️

**Difficulty**: 🟡 Medium

## 📖 The Story

The Cosmic Council governs the 3 blockchain realms (Sepolia, Arbitrum, Base). Council members are scattered across realms, but important decisions must be made together.

You've been chosen to build the **Omnichain Governance Portal** - a cross-chain voting system where council members on any chain can vote, and results are aggregated by the ancient Oracle Chain (the coordinator).

## 🎯 Mission Objectives

Build a **CosmicCouncil** voting system that:

1. 🏛️ **Multi-realm proposals** - Create proposals visible on all chains
2. 🗳️ **Vote anywhere** - Council members vote from their home realm
3. 📊 **Central aggregation** - One "Oracle Chain" collects all votes
4. 📢 **Broadcast results** - Final tally sent to all realms
5. 🚫 **No double voting** - Same address can't vote on multiple chains

## Tips

A couple of tips to get started:

## 📜 Specifications

```solidity
contract CosmicCouncil is OApp, OAppOptionsType3 {
    enum VoteChoice { ABSTAIN, FOR, AGAINST }
    enum ProposalStatus { PENDING, ACTIVE, ENDED, EXECUTED }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 totalVoters;
        bool executedOnChain;
    }

    struct Vote {
        address voter;
        VoteChoice choice;
        uint32 chainEid;
        uint256 timestamp;
        uint256 weight;
    }

    // Coordinator configuration
    uint32 public oracleChainEid;
    bool public isOracleChain;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => Vote[]) public proposalVotes;
    mapping(uint256 => mapping(uint32 => uint256)) public votesPerChain;

    uint256 public proposalCount;
    uint256 public minVotingPeriod = 1 hours;
    uint256 public maxVotingPeriod = 7 days;

    event ProposalCreated(uint256 indexed proposalId, string title, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address voter, VoteChoice choice, uint32 chainEid);
    event ProposalFinalized(uint256 indexed proposalId, uint256 votesFor, uint256 votesAgainst);
    event ResultsBroadcast(uint256 indexed proposalId, uint32[] destinations);

    /*//////////////////////////////////////////////////////////////
                        PROPOSAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function createProposal(
        string calldata _title,
        string calldata _description,
        uint256 _votingPeriod
    ) external returns (uint256);

    function broadcastProposal(
        uint256 _proposalId,
        uint32[] calldata _dstEids,
        bytes calldata _options
    ) external payable;

    /*//////////////////////////////////////////////////////////////
                        VOTING FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function vote(
        uint256 _proposalId,
        VoteChoice _choice,
        bytes calldata _options
    ) external payable;

    function getProposalStatus(uint256 _proposalId) external view returns (ProposalStatus);

    /*//////////////////////////////////////////////////////////////
                        ORACLE CHAIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function finalizeProposal(
        uint256 _proposalId,
        uint32[] calldata _dstEids,
        bytes calldata _options
    ) external payable;

    function aggregateVotes(uint256 _proposalId) external view returns (uint256 _for, uint256 _against);

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override;

    function _handleProposalBroadcast(bytes memory _data) internal;
    function _handleVoteSubmission(bytes memory _data, uint32 _srcEid) internal;
    function _handleResultsBroadcast(bytes memory _data) internal;
}
```

## ✅ Success Criteria

**Basic Requirements (140 XP):**

- [ ] Deploy on atleast 3 chains with one being the Oracle Chain
- [ ] Proposals created on Oracle Chain broadcast to all realms
- [ ] Votes can be cast on any chain
- [ ] Votes sync to Oracle Chain
- [ ] Oracle Chain aggregates and broadcasts final results
- [ ] Enforce voting deadlines
- [ ] Prevent same address voting on multiple chains

## 💡 Architecture Guide

### Message Types

```solidity
enum MessageType {
    PROPOSAL_BROADCAST,  // Oracle → All chains
    VOTE_SUBMISSION,     // Any chain → Oracle
    RESULTS_BROADCAST    // Oracle → All chains
}
```

### Flow Diagrams

**Proposal Creation Flow:**

```
1. Admin creates proposal on Oracle Chain
2. Oracle broadcasts proposal to all chains
3. All chains store proposal locally
4. Voting period begins
```

**Voting Flow:**

```
1. User votes on their local chain
2. Vote recorded locally
3. Vote sent to Oracle Chain
4. Oracle aggregates vote
5. Oracle tracks voter to prevent double-voting
```

**Finalization Flow:**

```
1. Voting period ends
2. Anyone calls finalize on Oracle
3. Oracle calculates final tally
4. Oracle broadcasts results to all chains
5. All chains update proposal status
```

## 🧪 Testing Scenarios

### Scenario 1: Simple Proposal

1. Create proposal on Oracle Chain (Sepolia)
2. Verify proposal appears on all chains
3. Vote FOR on Arbitrum
4. Vote AGAINST on Optimism
5. Vote FOR on Base
6. Finalize on Oracle Chain
7. Verify results on all chains

### Scenario 2: Double Vote Prevention

1. Alice votes FOR on Sepolia
2. Alice attempts to vote on Arbitrum
3. Transaction should fail (already voted)
4. Verify only one vote counted

### Scenario 3: Deadline Enforcement

1. Create proposal with 1 hour voting period
2. Cast votes during active period
3. Wait for deadline to pass
4. Attempt to vote (should fail)
5. Finalize and broadcast results

### Scenario 4: Multi-Chain Coordination

1. Create 3 proposals
2. Users vote on different chains
3. Track per-chain voting statistics
4. Verify Oracle aggregates correctly
5. All chains receive final results

## 🔐 Security Considerations

### Prevent Double Voting

```solidity
function _handleVoteSubmission(bytes memory _data, uint32 _srcEid) internal {
    (uint256 proposalId, address voter, VoteChoice choice) = abi.decode(
        _data,
        (uint256, address, VoteChoice)
    );

    // Check if voter already voted on ANY chain
    require(!hasVoted[proposalId][voter], "Already voted");

    hasVoted[proposalId][voter] = true;
    // Record vote...
}
```

### Deadline Validation

```solidity
function vote(uint256 _proposalId, VoteChoice _choice, bytes calldata _options) external payable {
    Proposal storage proposal = proposals[_proposalId];

    require(block.timestamp >= proposal.startTime, "Voting not started");
    require(block.timestamp <= proposal.endTime, "Voting ended");
    require(proposal.status == ProposalStatus.ACTIVE, "Proposal not active");

    // Cast vote...
}
```

### Oracle Chain Security

```solidity
modifier onlyOracleChain() {
    require(isOracleChain, "Only Oracle Chain");
    _;
}

function createProposal(...) external onlyOracleChain returns (uint256) {
    // Only Oracle can create proposals
}
```

## 📊 Advanced Features Guide

### Weighted Voting

```solidity
mapping(address => uint256) public votingPower;

function setVotingPower(address _voter, uint256 _power) external onlyOwner {
    votingPower[_voter] = _power;
}

function vote(...) external payable {
    uint256 weight = votingPower[msg.sender] > 0 ? votingPower[msg.sender] : 1;

    Vote memory userVote = Vote({
        voter: msg.sender,
        choice: _choice,
        chainEid: uint32(block.chainid),
        timestamp: block.timestamp,
        weight: weight
    });

    // Process weighted vote...
}
```

### Delegation

```solidity
mapping(address => address) public delegates;

function delegate(address _delegatee) external {
    delegates[msg.sender] = _delegatee;
}

function vote(...) external payable {
    address voter = delegates[msg.sender] != address(0)
        ? delegates[msg.sender]
        : msg.sender;

    // Vote on behalf of delegator...
}
```

### Quorum Requirement

```solidity
uint256 public quorumPercentage = 25; // 25% of total voters

function finalizeProposal(...) external payable {
    Proposal storage proposal = proposals[_proposalId];

    uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
    uint256 requiredQuorum = (totalPossibleVoters * quorumPercentage) / 100;

    require(totalVotes >= requiredQuorum, "Quorum not reached");

    // Finalize...
}
```

## 📋 Submission Requirements

1. **Code**: Complete CosmicCouncil contract
2. **Deployment**: Contract addresses on 4+ chains
3. **Demo**: Video showing complete voting flow
4. **Documentation**: Architecture diagram and message flow charts
5. **Tests**: Proof of all scenarios working correctly

## 🏆 Bonus Challenges

- **+25 XP**: Implement proposal execution (call external contracts)
- **+25 XP**: Add emergency pause for security
- **+25 XP**: Create voting history analytics
- **+25 XP**: Implement vote delegation chains (A→B→C)

---

**Ready to unite the realms?** Start building the Cosmic Council!

[← Back to Challenges](../challenges.md)
