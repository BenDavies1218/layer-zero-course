# Challenge 1: Chain Whisperer 🌌

**Difficulty**: 🟢 Easy | **Type**: Security Exploit | **Time**: 0.5-1 hours

## 📖 The Story

You've discovered an ancient artifact called the "Omnichain Echo Stone" that can whisper messages across different blockchain dimensions. Legend says that messages sent through the stone return transformed into the ancient leet speak language, carrying wisdom from other realms.

Your quest: Master the Echo Stone by building a messenger that transforms messages into leet speak as they travel between chains.

## 🎯 Objectives

Build an **Echo Transformer** OApp that:

1. ✨ **Transforms messages** - Outputs the chainName and string converted to leekspeak
2. 📏 **Length limits** - Enforces maximum message length (100 chars)
3. 📝 **Transforms History** - All messages should be recorded

LeetSpeak Mappings

- a → 4
- e → 3
- i → 1
- o → 0
- t → 7

## 📊 Input/Output Examples

### Task 1 Message Transformation

**Input**:

```text
elite hacker
```

**Expected Output**:

```text
Original: "elite hacker"
Transformed: "[Arbitrum] 3l173 h4ck3r"
```

### Task 2 Message too long

**Input**:

```text
This message has way more than one hundred characters and should fail validation because it exceeds the maximum allowed length
```

**Expected Output**:

```text
Error: Message too long to transform Message length: 137 chars, Maximum allowed: 100 chars
```

### Task 3: Echo History

**Input**:

```text
echoTransformer.getMessageHistory();
```

**Output**:

```text
[
  {
    originalMessage: "hello",
    transformedMessage: "[Arbitrum] h3ll0",
    timestamp: 1699123800,
    sourceChain: 40231,
    echoChain: 40161
  },
  {
    originalMessage: "code",
    transformedMessage: "[Arbitrum] c0d3",
    timestamp: 1699123300,
    sourceChain: 40231,
    echoChain: 40161
  }
]
```

## ✅ Success Criteria

- [ ] Deploy on 2 chains
- [ ] Implement leet speak char transformations (a→4, e→3, i→1, o→0, t→7)
- [ ] message should be prefixed with the chain they are being sent from "[ChainName]"
- [ ] Store successful message history with originalMessage, transformedMessage, timestamp, sourceChain, echoChain
- [ ] Implement a 60-second cooldown between messages
- [ ] Enforce 100-character maximum message length

## 📋 Submission

A single Markdown file containing:

1. **Complete Contract Code**:
2. **Deployed Contract Addresses**:
3. **Evidence**:
   - Message transformation
   - Message history
   - Length limit rejection
4. **Summary**: 200 words on your implementation

---

[← Back to Challenges](../lesson-06-challenges.md)
