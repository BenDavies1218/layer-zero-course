// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleMessenger
 * @notice A basic cross-chain messaging contract using LayerZero V2
 * @dev Extends OApp for LayerZero messaging capabilities
 *
 * This contract demonstrates the fundamental pattern for building OApps:
 * 1. Inherit from OApp and OAppOptionsType3
 * 2. Implement sendMessage() to encode and send cross-chain messages
 * 3. Override _lzReceive() to handle incoming messages
 *
 * Features:
 * - Send string messages to peer contracts on other chains
 * - Receive and store messages with history tracking
 * - Quote fees before sending
 * - Track message counts for monitoring
 *
 * Security:
 * - Only registered peers can send messages (enforced by OApp)
 * - Only owner can configure peers and enforced options
 * - Refund address specified to return excess fees
 */
contract ExampleSimpleMessenger is OApp, OAppOptionsType3 {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The last message received from any chain
    string public lastMessage;

    /// @notice Total number of messages sent from this contract
    uint256 public messagesSent;

    /// @notice Total number of messages received by this contract
    uint256 public messagesReceived;

    /// @notice Message history indexed by receive count
    /// @dev Maps message number to message content
    mapping(uint256 => string) public messageHistory;

    /// @notice Message type identifier for enforced options
    /// @dev Used with setEnforcedOptions to configure gas limits
    uint16 public constant SEND = 1;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a message is sent to another chain
    /// @param dstEid Destination endpoint ID
    /// @param message The message content
    /// @param fee The fee paid in native token
    event MessageSent(uint32 indexed dstEid, string message, uint256 fee);

    /// @notice Emitted when a message is received from another chain
    /// @param message The message content
    /// @param srcEid Source endpoint ID
    /// @param sender The address of the sending OApp
    event MessageReceived(
        string message,
        uint32 indexed srcEid,
        bytes32 indexed sender
    );

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the SimpleMessenger contract
     * @param _endpoint The LayerZero endpoint address for this chain
     * @param _owner The contract owner address
     */
    constructor(
        address _endpoint,
        address _owner
    ) OApp(_endpoint, _owner) Ownable(_owner) {}

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Send a message to another chain
     * @dev Encodes the message, combines options, and calls _lzSend
     *
     * Flow:
     * 1. Encode message as bytes
     * 2. Combine enforced options with caller options
     * 3. Send via LayerZero with fee
     * 4. Increment message counter
     *
     * @param _dstEid Destination endpoint ID
     * @param _message Message content to send
     * @param _options Execution options (gas limit, etc.)
     */
    function sendMessage(
        uint32 _dstEid,
        string calldata _message,
        bytes calldata _options
    ) external payable {
        // Encode the string message into bytes
        bytes memory _payload = abi.encode(_message);

        // Combine enforced options set by owner with caller-provided options
        bytes memory options = combineOptions(_dstEid, SEND, _options);

        // Send the message via LayerZero
        // - msg.value is the fee paid by sender
        // - Excess fees are refunded to msg.sender
        _lzSend(
            _dstEid,
            _payload,
            options,
            MessagingFee(msg.value, 0), // Pay in native token only
            payable(msg.sender) // Refund address
        );

        // Track message count
        messagesSent++;

        emit MessageSent(_dstEid, _message, msg.value);
    }

    /**
     * @notice Quote the fee for sending a message
     * @dev Call this before sendMessage to know how much to send as msg.value
     *
     * The fee covers:
     * - DVN verification costs
     * - Executor gas costs on destination
     * - LayerZero protocol fee
     *
     * @param _dstEid Destination endpoint ID
     * @param _message Message content
     * @param _options Execution options
     * @param _payInLzToken Whether to pay fee in LZ token (usually false)
     * @return fee The messaging fee struct with nativeFee and lzTokenFee
     */
    function quote(
        uint32 _dstEid,
        string calldata _message,
        bytes calldata _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes memory _payload = abi.encode(_message);
        bytes memory options = combineOptions(_dstEid, SEND, _options);
        fee = _quote(_dstEid, _payload, options, _payInLzToken);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Internal function to handle received messages
     * @dev Called by LayerZero Endpoint when a message arrives
     *
     * Security:
     * - Only callable by Endpoint (enforced by OApp)
     * - Sender must be registered peer (enforced by OApp)
     * - Origin data is validated before this function is called
     *
     * @param _origin Origin information (srcEid, sender, nonce)
     * @param _payload The encoded message payload
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Decode the message from bytes to string
        string memory message = abi.decode(_payload, (string));

        // Update state
        lastMessage = message;
        messagesReceived++;
        messageHistory[messagesReceived] = message;

        emit MessageReceived(message, _origin.srcEid, _origin.sender);
    }
}
