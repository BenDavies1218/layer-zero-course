// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultichainBroadcaster
 * @notice Example implementation of multichain broadcasting from Lesson 04
 * @dev Demonstrates batch sending to multiple chains in a single transaction
 */
contract MultichainBroadcaster is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    // Message categories
    enum Category {
        GENERAL,
        GOVERNANCE,
        EMERGENCY,
        PRICE_UPDATE
    }

    // Global counters
    uint256 public totalBroadcasts;
    uint256 public totalMessagesReceived;

    // Per-chain statistics
    mapping(uint32 => uint256) public messagesSentTo; // eid => count
    mapping(uint32 => uint256) public messagesReceivedFrom; // eid => count

    // Message history
    struct Message {
        Category category;
        string content;
        uint256 timestamp;
        uint32 srcEid;
    }

    Message[] public messageHistory;

    // Latest message by category
    mapping(Category => string) public latestByCategory;

    // Message type for enforced options
    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BroadcastSent(
        uint32[] dstEids,
        Category category,
        string message,
        uint256 totalFee
    );

    event MessageReceived(
        uint32 indexed srcEid,
        Category category,
        string message,
        uint256 timestamp
    );

    event SingleMessageSent(
        uint32 indexed dstEid,
        Category category,
        string message,
        uint256 fee
    );

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
     * @notice Broadcast a message to multiple chains
     * @dev Sends the same message to all specified destinations
     * @param _dstEids Array of destination endpoint IDs
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options (same for all destinations)
     */
    function broadcast(
        uint32[] calldata _dstEids,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        require(_dstEids.length > 0, "No destinations specified");

        // Encode the message once (gas optimization)
        bytes memory payload = abi.encode(_category, _message, block.timestamp);

        uint256 totalFeeRequired = 0;

        // Send to each destination
        for (uint256 i = 0; i < _dstEids.length; i++) {
            uint32 dstEid = _dstEids[i];

            // Combine options for this destination
            bytes memory options = combineOptions(dstEid, SEND, _options);

            // Calculate fee for this destination
            MessagingFee memory fee = _quote(dstEid, payload, options, false);

            // Accumulate total fee
            totalFeeRequired += fee.nativeFee;

            // Send the message
            _lzSend(
                dstEid,
                payload,
                options,
                MessagingFee(fee.nativeFee, 0),
                payable(msg.sender) // Refund excess to sender
            );

            // Update statistics
            messagesSentTo[dstEid]++;

            emit SingleMessageSent(dstEid, _category, _message, fee.nativeFee);
        }

        // Verify sufficient payment
        require(msg.value >= totalFeeRequired, "Insufficient fee provided");

        // Refund excess
        if (msg.value > totalFeeRequired) {
            payable(msg.sender).transfer(msg.value - totalFeeRequired);
        }

        totalBroadcasts++;

        emit BroadcastSent(_dstEids, _category, _message, totalFeeRequired);
    }

    /**
     * @notice Send a message to a single destination
     * @param _dstEid Destination endpoint ID
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options
     */
    function sendToChain(
        uint32 _dstEid,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        bytes memory payload = abi.encode(_category, _message, block.timestamp);
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        _lzSend(
            _dstEid,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        messagesSentTo[_dstEid]++;

        emit SingleMessageSent(_dstEid, _category, _message, msg.value);
    }

    /**
     * @notice Quote total fee for broadcasting to multiple chains
     * @param _dstEids Array of destination endpoint IDs
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options
     * @return totalFee Total fee in native token
     */
    function quoteBroadcast(
        uint32[] calldata _dstEids,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external view returns (uint256 totalFee) {
        bytes memory payload = abi.encode(_category, _message, block.timestamp);

        for (uint256 i = 0; i < _dstEids.length; i++) {
            bytes memory options = combineOptions(_dstEids[i], SEND, _options);
            MessagingFee memory fee = _quote(_dstEids[i], payload, options, false);
            totalFee += fee.nativeFee;
        }
    }

    /**
     * @notice Quote fee for a single destination
     * @param _dstEid Destination endpoint ID
     * @param _category Message category
     * @param _message Message content
     * @param _options Execution options
     * @return fee Messaging fee
     */
    function quoteSingle(
        uint32 _dstEid,
        Category _category,
        string calldata _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_category, _message, block.timestamp);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, payload, options, false);
    }

    /**
     * @notice Get message history
     * @param _startIndex Start index
     * @param _count Number of messages to retrieve
     * @return messages Array of messages
     */
    function getMessageHistory(
        uint256 _startIndex,
        uint256 _count
    ) external view returns (Message[] memory messages) {
        require(_startIndex < messageHistory.length, "Invalid start index");

        uint256 end = _startIndex + _count;
        if (end > messageHistory.length) {
            end = messageHistory.length;
        }

        messages = new Message[](end - _startIndex);
        for (uint256 i = _startIndex; i < end; i++) {
            messages[i - _startIndex] = messageHistory[i];
        }
    }

    /**
     * @notice Get total number of messages in history
     * @return count Total message count
     */
    function getMessageCount() external view returns (uint256 count) {
        return messageHistory.length;
    }

    /**
     * @notice Get statistics for a specific chain
     * @param _eid Endpoint ID
     * @return sent Messages sent to this chain
     * @return received Messages received from this chain
     */
    function getChainStats(
        uint32 _eid
    ) external view returns (uint256 sent, uint256 received) {
        sent = messagesSentTo[_eid];
        received = messagesReceivedFrom[_eid];
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Handle incoming messages
     * @dev Stores message in history and updates statistics
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the message
        (Category category, string memory content, uint256 timestamp) = abi.decode(
            _payload,
            (Category, string, uint256)
        );

        // Store in history
        messageHistory.push(
            Message({
                category: category,
                content: content,
                timestamp: timestamp,
                srcEid: _origin.srcEid
            })
        );

        // Update latest by category
        latestByCategory[category] = content;

        // Update statistics
        messagesReceivedFrom[_origin.srcEid]++;
        totalMessagesReceived++;

        emit MessageReceived(_origin.srcEid, category, content, timestamp);
    }
}
