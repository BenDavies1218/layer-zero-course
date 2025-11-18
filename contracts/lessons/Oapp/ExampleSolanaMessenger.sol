// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SolanaMessenger
 * @notice Example implementation for cross-VM messaging from Lesson 05
 * @dev Demonstrates sending messages from EVM chains to Solana via LayerZero
 */
contract ExampleSolanaMessenger is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 public messagesSentToSolana;
    uint256 public messagesReceivedFromSolana;

    // Track messages by ID
    mapping(uint256 => string) public sentMessages;
    mapping(uint256 => string) public receivedMessages;

    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event MessageSentToSolana(
        uint32 indexed solanaEid,
        uint256 indexed messageId,
        string message,
        uint256 fee
    );

    event MessageReceivedFromSolana(
        uint32 indexed solanaEid,
        uint256 indexed messageId,
        string message
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
     * @notice Send a message to Solana
     * @param _solanaEid Solana endpoint ID (40168 for devnet, 30168 for mainnet)
     * @param _message Message content
     * @param _options Execution options
     */
    function sendToSolana(
        uint32 _solanaEid,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        // Encode message with ID
        uint256 messageId = messagesSentToSolana;
        bytes memory payload = abi.encode(messageId, _message);

        // Store sent message
        sentMessages[messageId] = _message;

        // Combine options
        bytes memory options = combineOptions(_solanaEid, SEND, _options);

        // Send to Solana
        _lzSend(
            _solanaEid,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit MessageSentToSolana(_solanaEid, messageId, _message, msg.value);
        messagesSentToSolana++;
    }

    /**
     * @notice Quote fee for sending to Solana
     * @param _solanaEid Solana endpoint ID
     * @param _message Message content
     * @param _options Execution options
     * @return fee Messaging fee
     */
    function quoteToSolana(
        uint32 _solanaEid,
        string calldata _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(messagesSentToSolana, _message);
        bytes memory options = combineOptions(_solanaEid, SEND, _options);
        fee = _quote(_solanaEid, payload, options, false);
    }

    /**
     * @notice Set Solana OApp as a trusted peer
     * @dev Helper function to set Solana peer with proper bytes32 format
     * @param _solanaEid Solana endpoint ID (40168 for devnet)
     * @param _solanaPubkey Solana public key as bytes32
     */
    function setSolanaPeer(uint32 _solanaEid, bytes32 _solanaPubkey) external onlyOwner {
        setPeer(_solanaEid, _solanaPubkey);
    }

    /**
     * @notice Get sent message by ID
     * @param _messageId Message ID
     * @return message Message content
     */
    function getSentMessage(uint256 _messageId) external view returns (string memory message) {
        return sentMessages[_messageId];
    }

    /**
     * @notice Get received message by ID
     * @param _messageId Message ID
     * @return message Message content
     */
    function getReceivedMessage(uint256 _messageId) external view returns (string memory message) {
        return receivedMessages[_messageId];
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Receive messages from Solana
     * @dev Solana programs send bytes that we decode
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode message from Solana
        // Note: Solana sends data in a compatible format
        (uint256 messageId, string memory message) = abi.decode(
            _payload,
            (uint256, string)
        );

        // Store received message
        receivedMessages[messagesReceivedFromSolana] = message;

        emit MessageReceivedFromSolana(_origin.srcEid, messageId, message);
        messagesReceivedFromSolana++;
    }
}
