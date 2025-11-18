// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PingPong
 * @notice Example implementation of the ABA (ping-pong) pattern from Lesson 03
 * @dev Demonstrates automatic response messaging with proper gas pre-allocation
 *
 * Key Design: Sender pays for entire round trip upfront - no contract funding needed.
 * Pong options are encoded in ping payload, and gas is pre-allocated via lzReceiveOption.
 */
contract ExamplePingPong is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    // Message types
    enum MessageType {
        PING,
        PONG
    }

    // Counters
    uint256 public pingsSent;
    uint256 public pingsReceived;
    uint256 public pongsSent;
    uint256 public pongsReceived;

    // Message type for enforced options
    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event PingSent(uint32 indexed dstEid, uint256 indexed pingId);
    event PingReceived(uint32 indexed srcEid, uint256 indexed pingId);
    event PongSent(uint32 indexed dstEid, uint256 indexed pongId);
    event PongReceived(uint32 indexed srcEid, uint256 indexed pongId);

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Send a ping with pre-allocated gas for automatic pong response
     * @dev Encodes return options in payload and allocates gas for round trip
     * @param _dstEid Destination chain endpoint ID
     * @param _sendOptions Execution options for ping message
     * @param _returnOptions Execution options for automatic pong response
     */
    function ping(
        uint32 _dstEid,
        bytes calldata _sendOptions,
        bytes calldata _returnOptions
    ) external payable {
        // Encode ping with return options included
        bytes memory payload = abi.encode(MessageType.PING, pingsSent, _returnOptions);

        // Combine options for ping
        bytes memory options = combineOptions(_dstEid, SEND, _sendOptions);

        // Send ping with all gas for round trip
        _lzSend(
            _dstEid,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit PingSent(_dstEid, pingsSent);
        pingsSent++;
    }

    /**
     * @notice Quote total fee for ping-pong round trip
     * @dev Returns combined cost of ping delivery + pong execution + pong delivery
     * @param _dstEid Destination endpoint ID
     * @param _sendOptions Execution options for ping
     * @param _returnOptions Execution options for pong
     * @return totalFee Total native fee for complete round trip
     */
    function quotePingPong(
        uint32 _dstEid,
        bytes calldata _sendOptions,
        bytes calldata _returnOptions
    ) external view returns (uint256 totalFee) {
        // Quote pong cost first (B → A)
        bytes memory pongPayload = abi.encode(MessageType.PONG, 0);
        bytes memory pongOpts = combineOptions(_dstEid, SEND, _returnOptions);
        MessagingFee memory pongFee = _quote(_dstEid, pongPayload, pongOpts, false);

        // Quote ping cost with pong options encoded (A → B)
        bytes memory pingPayload = abi.encode(MessageType.PING, pingsSent, _returnOptions);
        bytes memory pingOpts = combineOptions(_dstEid, SEND, _sendOptions);
        MessagingFee memory pingFee = _quote(_dstEid, pingPayload, pingOpts, false);

        // Total = ping delivery + pong delivery
        // Note: pong execution gas is included in sendOptions via lzReceiveOption
        totalFee = pingFee.nativeFee + pongFee.nativeFee;
    }

    /**
     * @notice Quote fee for pong response separately (for debugging)
     * @param _dstEid Destination endpoint ID (where pong will be sent)
     * @param _options Execution options for pong
     * @param _payInLzToken Pay in LZ token
     * @return fee The messaging fee for pong
     */
    function quotePong(
        uint32 _dstEid,
        bytes calldata _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(MessageType.PONG, pongsSent);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, payload, options, _payInLzToken);
    }

    /**
     * @notice Withdraw any accidental funds (owner only)
     */
    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Handle incoming messages and auto-respond to pings
     * @dev Uses pre-allocated gas from ping transaction to send pong
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode message with pong options
        (MessageType messageType, uint256 messageId, bytes memory returnOptions) = abi.decode(
            _payload,
            (MessageType, uint256, bytes)
        );

        if (messageType == MessageType.PING) {
            // Received PING - auto-respond with PONG
            pingsReceived++;
            emit PingReceived(_origin.srcEid, messageId);

            // Send automatic pong response
            _sendPong(_origin.srcEid, returnOptions);

        } else if (messageType == MessageType.PONG) {
            // Received PONG - just record, don't respond
            pongsReceived++;
            emit PongReceived(_origin.srcEid, messageId);
        }
    }

    /**
     * @notice Send pong response using pre-allocated gas
     * @param _dstEid Destination to send pong
     * @param _returnOptions Pong options decoded from ping payload
     */
    function _sendPong(uint32 _dstEid, bytes memory _returnOptions) internal {
        // Prepare pong payload (without options)
        bytes memory pongPayload = abi.encode(MessageType.PONG, pongsSent);

        // Use the pong options directly - they were already built with combineOptions
        // by the sender before encoding into the ping payload
        bytes memory options = _returnOptions;

        // Send pong using pre-allocated gas from ping
        // msg.value contains the native fee allocated by sender
        _lzSend(
            _dstEid,
            pongPayload,
            options,
            MessagingFee(msg.value, 0),
            payable(address(this))
        );

        emit PongSent(_dstEid, pongsSent);
        pongsSent++;
    }

    /**
     * @notice Allow contract to receive refunds
     */
    receive() external payable {}
}
