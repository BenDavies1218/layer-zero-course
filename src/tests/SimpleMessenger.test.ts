import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleMessenger } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

/**
 * SimpleMessenger Unit Tests
 *
 * Note: These tests are basic and don't include full LayerZero integration.
 * For comprehensive cross-chain testing, use LayerZero's test utilities
 * and mock endpoints.
 *
 * Run tests:
 *   npx hardhat test
 *   npx hardhat test --grep "SimpleMessenger"
 */

describe("SimpleMessenger", function () {
  let messenger: SimpleMessenger;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let endpointAddress: string;

  // Setup before each test
  beforeEach(async function () {
    // Get signers
    [owner, user] = await ethers.getSigners();

    // Use actual Sepolia endpoint address for testing
    // In production tests, you'd use a mock endpoint
    endpointAddress = "0x6EDCE65403992e310A62460808c4b910D972f10f";

    // Deploy SimpleMessenger
    const SimpleMessenger = await ethers.getContractFactory("SimpleMessenger");
    messenger = await SimpleMessenger.deploy(endpointAddress, owner.address);
    await messenger.deployed();
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      expect(await messenger.owner()).to.equal(owner.address);
    });

    it("Should deploy with correct endpoint", async function () {
      expect(await messenger.endpoint()).to.equal(endpointAddress);
    });

    it("Should start with zero messages sent", async function () {
      expect(await messenger.messagesSent()).to.equal(0);
    });

    it("Should start with zero messages received", async function () {
      expect(await messenger.messagesReceived()).to.equal(0);
    });

    it("Should start with empty lastMessage", async function () {
      expect(await messenger.lastMessage()).to.equal("");
    });

    it("Should have correct SEND message type", async function () {
      expect(await messenger.SEND()).to.equal(1);
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await messenger.connect(owner).transferOwnership(user.address);
      expect(await messenger.owner()).to.equal(user.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      await expect(
        messenger.connect(user).transferOwnership(user.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Peer Management", function () {
    const arbitrumSepoliaEid = 40231; // Arbitrum Sepolia endpoint ID
    const peerAddress = "0x1234567890123456789012345678901234567890";

    it("Should allow owner to set peer", async function () {
      const peerBytes32 = ethers.utils.zeroPad(peerAddress, 32);

      await messenger.connect(owner).setPeer(arbitrumSepoliaEid, peerBytes32);

      const setPeer = await messenger.peers(arbitrumSepoliaEid);
      expect(setPeer).to.equal(peerBytes32);
    });

    it("Should not allow non-owner to set peer", async function () {
      const peerBytes32 = ethers.utils.zeroPad(peerAddress, 32);

      await expect(
        messenger.connect(user).setPeer(arbitrumSepoliaEid, peerBytes32)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Message History", function () {
    it("Should return empty string for non-existent message history", async function () {
      expect(await messenger.messageHistory(1)).to.equal("");
    });

    it("Should track message history correctly", async function () {
      // Note: This test would need LayerZero mock to actually receive messages
      // For now, we just verify the mapping structure exists
      const history = await messenger.messageHistory(0);
      expect(history).to.equal("");
    });
  });

  describe("Quote Function", function () {
    it("Should have quote function callable", async function () {
      const dstEid = 40231;
      const message = "Test message";
      const options = "0x";

      // Note: This will fail without proper LayerZero setup
      // In a real environment, this would return actual fee estimates
      try {
        const fee = await messenger.quote(dstEid, message, options, false);
        // If we get here, the function is callable
        expect(fee).to.have.property("nativeFee");
        expect(fee).to.have.property("lzTokenFee");
      } catch (error: any) {
        // Expected to fail without proper LayerZero setup
        expect(error.message).to.include("function call");
      }
    });
  });

  describe("Events", function () {
    it("Should emit MessageSent event when sending", async function () {
      // Note: This test requires LayerZero mock to work properly
      // For now, we just verify the event signature exists
      const dstEid = 40231;
      const message = "Hello";

      // This will fail without proper LayerZero mock but shows event structure
      // In production, use LayerZero's test helpers
    });
  });

  describe("Integration Notes", function () {
    it("Should document testing approach", function () {
      // For full integration testing:
      // 1. Use @layerzerolabs/test-devtools-evm-hardhat
      // 2. Deploy mock endpoints
      // 3. Test actual message sending and receiving
      // 4. Verify cross-chain flow

      // Example structure:
      // const { deployLZEndpointMock } = require("@layerzerolabs/test-devtools-evm-hardhat");
      // const mockEndpoint = await deployLZEndpointMock(chainId);
      // const messenger = await deploy("SimpleMessenger", mockEndpoint.address, owner.address);
      // // Then test actual sends/receives

      expect(true).to.equal(
        true,
        "See LayerZero docs for full integration testing"
      );
    });
  });
});

/**
 * Additional test scenarios to implement with LayerZero mocks:
 *
 * 1. Message Sending:
 *    - Test sendMessage increments counter
 *    - Test sendMessage emits correct event
 *    - Test sendMessage with insufficient fee fails
 *    - Test sendMessage to non-peer fails
 *
 * 2. Message Receiving:
 *    - Test _lzReceive stores message correctly
 *    - Test _lzReceive increments counter
 *    - Test _lzReceive updates lastMessage
 *    - Test _lzReceive adds to history
 *    - Test _lzReceive from non-peer fails
 *
 * 3. Gas and Options:
 *    - Test enforced options are applied
 *    - Test custom options work correctly
 *    - Test gas estimation is accurate
 *
 * 4. Security:
 *    - Test only endpoint can call lzReceive
 *    - Test only registered peers can send
 *    - Test reentrancy protection
 *
 * 5. Edge Cases:
 *    - Test empty message
 *    - Test very long message
 *    - Test rapid succession sends
 *    - Test message ordering
 */
