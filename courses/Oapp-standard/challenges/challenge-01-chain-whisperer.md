# Challenge 1: The Chain Whisperer 🌌

**Difficulty**: 🟢 Easy

## 📖 The Story

You've discovered an ancient artifact called the "Omnichain Echo Stone" that can whisper messages across different blockchain dimensions. Legend says that messages sent through the stone return transformed into the ancient leet speak language, carrying wisdom from other realms.

Your quest: Master the Echo Stone by building a messenger that transforms messages into leet speak as they travel between chains.

## 🎯 Objectives

Build an **Echo Transformer** OApp that:

1. ✨ **Transforms messages** - Outputs the chainName and string converted to leekspeak
2. 📝 **Transforms History** - All messages should be recorded
3. ⏰ **Cooldown** - Add cooldown protection so only one message can be transformed every 60 seconds
4. 📏 **Length limits** - Enforces maximum message length (100 chars)

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

### Task 3 Cooldown

**Scenario**:

```text
T=0 Seconds
echoTransformer.whisper(40231, "first message", options); ✅ Success

T=30 seconds
echoTransformer.whisper(40231, "second message", options); ❌ Error
// Cooldown is active Must wait: 30 more seconds


T=65 seconds
echoTransformer.whisper(40231, "third message", options); ✅ Success
```

### Task 4: Echo History

**Input**:

```text
echoTransformer.getTransformationHistory();
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
- [ ] echo responses with chain name prefix "[ChainName]"
- [ ] Store complete echo history with originalMessage, transformedMessage, timestamp, sourceChain, echoChain
- [ ] Implement 60-second cooldown between messages
- [ ] Enforce 100-character maximum message length

## 📋 Submission

A single Markdown file containing:

1. **Complete Contract Code**:
2. **Deployed Contract Addresses**:
3. **Evidence**:
   - Message transformation
   - Message history
   - Cooldown rejection
   - Length limit rejection
4. **Summary**: 200 words on your implementation

---

[← Back to Challenges](../lesson-06-challenges.md)
