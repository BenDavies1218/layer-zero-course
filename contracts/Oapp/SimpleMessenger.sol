// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleMessenger is OApp, OAppOptionsType3 {
    string public lastMessage; // Store the last received message
    uint256 public messagesSent; // Track total messages sent
    uint256 public messagesReceived; // Track total messages received
    mapping(uint256 => string) public messageHistory; // Message history
    uint16 public constant SEND = 1; // Define message type for enforced options

    // Events for tracking
    event MessageSent(uint32 dstEid, string message, uint256 fee);
    event MessageReceived(string message, uint32 srcEid, bytes32 sender);

    constructor(
        address _endpoint, // Layerzero V2 endpoint address
        address _owner // Owner of the contract
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    function quote(
        uint32 _dstEid, // Destination Endpoint ID
        string calldata _message, // Message to send
        bytes calldata _options, // Execution options (gas limit, etc.)
        bool _payInLzToken // Is it being payed in LZO Token
    ) external view returns (MessagingFee memory fee) {
        // encode the message
        bytes memory _payload = abi.encode(_message);
        // Create the options object
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        // call the quote method of the Oapp _quote method
        fee = _quote(_dstEid, _payload, options, _payInLzToken);
    }

    function send(
        uint32 _dstEid, // Destination endpoint ID
        string calldata _message, // Message to send
        bytes calldata _options // Execution options (gas limit, etc.)
    ) external payable {
        // Encode the message
        bytes memory _payload = abi.encode(_message);

        // Combine enforced options with caller-provided options
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        // Send the message with the Oapp _lzSend method
        _lzSend(
            _dstEid, // Destination endpoint ID
            _payload, // Encoded message
            options, // Execution options
            MessagingFee(msg.value, 0), // Fee in native gas token
            payable(msg.sender) // Refund address
        );

        // Update the message sent state
        messagesSent++;

        // emit the messageSent to the destination chain
        emit MessageSent(_dstEid, _message, msg.value);
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid, // Message GUID (not used here in this example)
        bytes calldata _payload,
        address _executor, // Executor address (not used here in this example)
        bytes calldata _extraData // Extra data (not used here in this example)
    ) internal override {
        // Decode the message
        string memory message = abi.decode(_payload, (string));

        // Update the last message
        lastMessage = message;

        // increment the messageRecieved by 1
        messagesReceived++;

        // Save the message to the message history
        messageHistory[messagesReceived] = message;

        // emit the messageReceive to the origin chain
        emit MessageReceived(message, _origin.srcEid, _origin.sender);
    }
}
