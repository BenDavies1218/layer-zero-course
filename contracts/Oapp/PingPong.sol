// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract PingPong is OApp, OAppOptionsType3 {
    // Message types to distinguish ping from pong
    enum MessageType {
        PING, // Request message
        PONG // Response message
    }

    // Counters
    uint256 public pingsSent; // Total pings sent from this contract
    uint256 public pingsReceived; // Total pings received by this contract
    uint256 public pongsSent; // Total pongs sent from this contract
    uint256 public pongsReceived; // Total pongs received by this contract

    // Message type for enforced options
    uint16 public constant SEND = 1; // Message type identifier

    // Custom errors
    error InvalidMessageType();
    error OnlyPeersAllowed(uint32 srcEid, bytes32 sender);

    event PingSent(uint32 indexed dstEid, uint256 indexed pingId); // Emitted when ping is sent
    event PingReceived(uint32 indexed srcEid, uint256 indexed pingId); // Emitted when ping is received
    event PongSent(uint32 indexed dstEid, uint256 indexed pongId); // Emitted when pong is sent
    event PongReceived(uint32 indexed srcEid, uint256 indexed pongId); // Emitted when pong is received

    constructor(
        address _endpoint, // LayerZero V2 endpoint address
        address _owner // Owner of the contract
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    function quote(
        uint32 _dstEid, // Destination endpoint ID
        bytes calldata _sendOptions, // Execution options for send _lzSend call
        bytes calldata _returnOptions // Execution options for return _lzSend call
    ) external view returns (uint256 totalFee) {
        // Quote the return cost (B → A)
        bytes memory returnPayload = abi.encode(MessageType.PONG, 0);
        bytes memory returnOpts = combineOptions(_dstEid, SEND, _returnOptions);
        MessagingFee memory returnFee = _quote(_dstEid, returnPayload, returnOpts, false);

        // Quote the send cost (A → B)
        bytes memory sendPayload = abi.encode(MessageType.PING, pingsSent, _returnOptions);
        bytes memory sendOpts = combineOptions(_dstEid, SEND, _sendOptions);
        MessagingFee memory sendFee = _quote(_dstEid, sendPayload, sendOpts, false);

        // Calculate total fee for complete round trip
        // Total = send fee + return fee
        // Note: return execution gas is included in sendOptions via lzReceiveOption
        totalFee = sendFee.nativeFee + returnFee.nativeFee;
    }

    function send(
        uint32 _dstEid, // Destination chain endpoint ID
        bytes calldata _sendOptions, // Execution options for ping message
        bytes calldata _returnOptions // Execution options for automatic pong response
    ) external payable {
        // Encode the payload with:       ( Message Type ) (PingsSent)  (Return Options)
        bytes memory payload = abi.encode(MessageType.PING, pingsSent, _returnOptions);

        // Combine enforced options with caller-provided options
        bytes memory options = combineOptions(_dstEid, SEND, _sendOptions);

        // Send using the OApp _lzSend method
        _lzSend(
            _dstEid, // Destination endpoint ID
            payload, // Encoded payload
            options, // Execution sendOptions
            MessagingFee(msg.value, 0), // Fee in native gas token
            payable(msg.sender) // Refund address
        );

        // Emit event and update counter
        emit PingSent(_dstEid, pingsSent);
        pingsSent++;
    }

    function _lzReceive(
        Origin calldata _origin, // Origin chain info (srcEid, sender, nonce)
        bytes32 /*_guid*/, // Unique message identifier
        bytes calldata _payload, // Encoded message data
        address /*_executor*/, // Executor address
        bytes calldata /*_extraData*/ // Additional data
    ) internal override {
        // Validate that the message comes from a registered peer
        // Note: OApp base contract already does this check, but we make it explicit for clarity
        bytes32 expectedPeer = peers[_origin.srcEid];
        if (expectedPeer != _origin.sender) {
            revert OnlyPeersAllowed(_origin.srcEid, _origin.sender);
        }

        // Decode the message to get type, ID, and return options
        (MessageType messageType, uint256 messageId, bytes memory returnOptions) = abi.decode(
            _payload,
            (MessageType, uint256, bytes)
        );

        if (messageType == MessageType.PING) {
            // Increment the pingsReceived
            pingsReceived++;

            // Emit the pingReceived to the source
            emit PingReceived(_origin.srcEid, messageId);

            // Prepare pongPayload (pong doesn't need return options)
            bytes memory pongPayload = abi.encode(MessageType.PONG, pongsSent, "");

            // Send pong back to origin chain
            // Contract must have sufficient balance from pre-allocated funds sent via lzReceiveOption
            _lzSend(
                _origin.srcEid, // Send back to origin chain
                pongPayload, // Encoded pong message
                returnOptions, // Use pre-provided pong options
                MessagingFee(address(this).balance, 0), // Use contract balance (pre-funded via lzReceiveOption)
                payable(address(this)) // Refund to contract
            );

            // Emit the pong sent
            emit PongSent(_origin.srcEid, pongsSent);
            // Increment the pongs sent
            pongsSent++;
        } else if (messageType == MessageType.PONG) {
            // Increment the pongsReceived
            pongsReceived++;

            // emit the pongReceived to the origin
            emit PongReceived(_origin.srcEid, messageId);
        }
    }

    /**
     * @notice Withdraw any accidental funds (owner only)
     */
    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance); // Transfer balance to owner
    }

    /**
     * @notice Allow contract to receive refunds
     */
    receive() external payable {} // Accept native token refunds from LayerZero
}
