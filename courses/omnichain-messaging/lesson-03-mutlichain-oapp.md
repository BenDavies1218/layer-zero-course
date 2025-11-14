# Lesson 03 — Hands-on: Build a Minimal OApp

This lesson has exercises to implement and test a minimal push-based OApp.

Goal

Build a simple contract that can send a message to another chain and handle incoming messages by recording the last message sender and payload.

Files

- `../contracts/OAppExample.sol` — example contract provided.

Exercises

1. Read and compile `OAppExample.sol` in a Hardhat project.
2. Write a test that simulates sending a message by calling `lzReceive` directly (local unit test without actual cross-chain delivery). Validate that source chain and address checks work.
3. Extend the contract to include a retry/rescue mechanism for failed deliveries.

Solution hints

- Use the `ILayerZeroReceiver` function signature for tests.
- Mock the endpoint address via constructor injection or a setter so tests can simulate calls from the endpoint.
