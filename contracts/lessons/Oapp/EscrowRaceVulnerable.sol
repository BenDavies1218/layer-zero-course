// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title EscrowRaceVulnerable
/// @notice A cross-chain escrow with critical race condition vulnerabilities
/// @dev EDUCATIONAL PURPOSE ONLY - This contract contains intentional vulnerabilities
contract EscrowRaceVulnerable is OApp, OAppOptionsType3 {
    IERC20 public immutable token;

    enum MessageType {
        RELEASE_REQUEST,
        CANCEL_REQUEST,
        RELEASE_EXECUTED,
        CANCEL_EXECUTED
    }

    enum EscrowStatus {
        ACTIVE,
        RELEASED,
        CANCELLED
    }

    uint16 public constant SEND = 1;

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint32 sellerChain; // Chain where seller operates
        EscrowStatus status;
        uint256 createdAt;
    }

    // Escrow ID => Escrow details
    mapping(bytes32 => Escrow) public escrows;

    // Track all escrow IDs for visibility
    bytes32[] public escrowIds;

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint32 sellerChain
    );
    event ReleaseRequested(bytes32 indexed escrowId, address requester);
    event CancelRequested(bytes32 indexed escrowId, address requester);
    event EscrowReleased(bytes32 indexed escrowId, address seller, uint256 amount);
    event EscrowCancelled(bytes32 indexed escrowId, address buyer, uint256 amount);

    constructor(address _endpoint, address _owner, address _token) OApp(_endpoint, _owner) Ownable(_owner) {
        token = IERC20(_token);
    }

    /// @notice Create a new escrow (buyer deposits funds)
    /// @param seller The seller's address
    /// @param amount The escrow amount
    /// @param sellerChain The chain where the seller operates
    function createEscrow(address seller, uint256 amount, uint32 sellerChain) external returns (bytes32 escrowId) {
        require(amount > 0, "Amount must be positive");
        require(seller != address(0), "Invalid seller");
        require(seller != msg.sender, "Cannot escrow to yourself");

        // Create unique escrow ID
        escrowId = keccak256(abi.encodePacked(msg.sender, seller, amount, block.timestamp, escrowIds.length));

        // Transfer tokens from buyer
        token.transferFrom(msg.sender, address(this), amount);

        // Create escrow record
        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            sellerChain: sellerChain,
            status: EscrowStatus.ACTIVE,
            createdAt: block.timestamp
        });

        escrowIds.push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, seller, amount, sellerChain);
    }

    /// @notice Buyer initiates release of funds to seller
    /// @param escrowId The escrow ID
    /// @param options LayerZero send options
    function buyerRelease(bytes32 escrowId, bytes calldata options) external payable {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.buyer == msg.sender, "Only buyer can release");
        require(escrow.status == EscrowStatus.ACTIVE, "Escrow not active");

        // 🚨 VULNERABILITY: No immediate state update!
        // Status should be changed to RELEASED here to prevent race conditions
        // Missing: escrow.status = EscrowStatus.RELEASED;

        // Send release request to seller's chain
        bytes memory payload = abi.encode(MessageType.RELEASE_REQUEST, escrowId);
        bytes memory combinedOptions = combineOptions(escrow.sellerChain, SEND, options);

        _lzSend(escrow.sellerChain, payload, combinedOptions, MessagingFee(msg.value, 0), payable(msg.sender));

        emit ReleaseRequested(escrowId, msg.sender);
    }

    /// @notice Buyer cancels the escrow and gets refund
    /// @param escrowId The escrow ID
    /// @param options LayerZero send options (if cross-chain notification needed)
    function buyerCancel(bytes32 escrowId, bytes calldata options) external payable {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.buyer == msg.sender, "Only buyer can cancel");
        require(escrow.status == EscrowStatus.ACTIVE, "Escrow not active");

        // 🚨 VULNERABILITY: No immediate state update!
        // Status should be changed to CANCELLED here to prevent race conditions
        // This allows buyer to cancel while release is in flight

        // If seller is on different chain, notify them
        if (escrow.sellerChain != uint32(block.chainid)) {
            bytes memory payload = abi.encode(MessageType.CANCEL_REQUEST, escrowId);
            bytes memory combinedOptions = combineOptions(escrow.sellerChain, SEND, options);

            _lzSend(escrow.sellerChain, payload, combinedOptions, MessagingFee(msg.value, 0), payable(msg.sender));
        }

        // 🚨 VULNERABILITY: Immediate refund without waiting for cross-chain confirmation!
        // If buyerRelease() was called first, both transactions could succeed
        escrow.status = EscrowStatus.CANCELLED;
        token.transfer(escrow.buyer, escrow.amount);

        emit EscrowCancelled(escrowId, escrow.buyer, escrow.amount);
    }

    /// @notice Seller can request release after delivering goods
    /// @param escrowId The escrow ID
    /// @param buyerChain The chain where the buyer created the escrow
    /// @param options LayerZero send options
    function sellerRequestRelease(bytes32 escrowId, uint32 buyerChain, bytes calldata options) external payable {
        // On seller's chain, we don't have full escrow details
        // Just send the request to buyer's chain

        bytes memory payload = abi.encode(MessageType.RELEASE_REQUEST, escrowId, msg.sender);
        bytes memory combinedOptions = combineOptions(buyerChain, SEND, options);

        _lzSend(buyerChain, payload, combinedOptions, MessagingFee(msg.value, 0), payable(msg.sender));

        emit ReleaseRequested(escrowId, msg.sender);
    }

    /// @notice Quote fee for release
    function quoteRelease(bytes32 escrowId, bytes calldata options) external view returns (uint256) {
        Escrow memory escrow = escrows[escrowId];
        bytes memory payload = abi.encode(MessageType.RELEASE_REQUEST, escrowId);
        bytes memory combinedOptions = combineOptions(escrow.sellerChain, SEND, options);

        MessagingFee memory fee = _quote(escrow.sellerChain, payload, combinedOptions, false);
        return fee.nativeFee;
    }

    /// @notice Quote fee for cancel
    function quoteCancel(bytes32 escrowId, bytes calldata options) external view returns (uint256) {
        Escrow memory escrow = escrows[escrowId];

        if (escrow.sellerChain == uint32(block.chainid)) {
            return 0; // Same chain, no cross-chain fee
        }

        bytes memory payload = abi.encode(MessageType.CANCEL_REQUEST, escrowId);
        bytes memory combinedOptions = combineOptions(escrow.sellerChain, SEND, options);

        MessagingFee memory fee = _quote(escrow.sellerChain, payload, combinedOptions, false);
        return fee.nativeFee;
    }

    /// @notice Get all active escrows for a buyer
    function getBuyerEscrows(address buyer) external view returns (bytes32[] memory) {
        uint256 count = 0;

        // Count active escrows
        for (uint256 i = 0; i < escrowIds.length; i++) {
            if (escrows[escrowIds[i]].buyer == buyer) {
                count++;
            }
        }

        // Populate array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < escrowIds.length; i++) {
            if (escrows[escrowIds[i]].buyer == buyer) {
                result[index] = escrowIds[i];
                index++;
            }
        }

        return result;
    }

    /// @notice Get all active escrows for a seller
    function getSellerEscrows(address seller) external view returns (bytes32[] memory) {
        uint256 count = 0;

        // Count active escrows
        for (uint256 i = 0; i < escrowIds.length; i++) {
            if (escrows[escrowIds[i]].seller == seller) {
                count++;
            }
        }

        // Populate array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < escrowIds.length; i++) {
            if (escrows[escrowIds[i]].seller == seller) {
                result[index] = escrowIds[i];
                index++;
            }
        }

        return result;
    }

    /// @notice Handle incoming LayerZero messages
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        MessageType messageType = abi.decode(_payload, (MessageType));

        if (messageType == MessageType.RELEASE_REQUEST) {
            _handleReleaseRequest(_origin, _payload);
        } else if (messageType == MessageType.CANCEL_REQUEST) {
            _handleCancelRequest(_payload);
        } else if (messageType == MessageType.RELEASE_EXECUTED) {
            // Notification that release was executed on another chain
            _handleReleaseExecuted(_payload);
        } else if (messageType == MessageType.CANCEL_EXECUTED) {
            // Notification that cancel was executed on another chain
            _handleCancelExecuted(_payload);
        }
    }

    /// @dev Handle release request
    function _handleReleaseRequest(Origin calldata _origin, bytes calldata _payload) private {
        (, bytes32 escrowId, address requester) = abi.decode(_payload, (MessageType, bytes32, address));

        Escrow storage escrow = escrows[escrowId];

        // 🚨 VULNERABILITY: Race condition check!
        // If buyer called buyerCancel() at the same time, both could succeed
        // The status check here happens AFTER the cancel might have been processed
        require(escrow.status == EscrowStatus.ACTIVE, "Escrow not active");

        // Update status and release funds
        escrow.status = EscrowStatus.RELEASED;
        token.transfer(escrow.seller, escrow.amount);

        emit EscrowReleased(escrowId, escrow.seller, escrow.amount);

        // Notify requester's chain
        bytes memory responsePayload = abi.encode(MessageType.RELEASE_EXECUTED, escrowId);

        // Use minimal gas for notification
        bytes memory options = combineOptions(
            _origin.srcEid,
            SEND,
            abi.encodePacked(uint16(0), uint128(50000)) // 50k gas
        );

        _lzSend(
            _origin.srcEid,
            responsePayload,
            options,
            MessagingFee(address(this).balance, 0),
            payable(address(this))
        );
    }

    /// @dev Handle cancel request
    function _handleCancelRequest(bytes calldata _payload) private {
        (, bytes32 escrowId) = abi.decode(_payload, (MessageType, bytes32));

        Escrow storage escrow = escrows[escrowId];

        // 🚨 VULNERABILITY: Race condition!
        // Release might have been triggered at the same time
        require(escrow.status == EscrowStatus.ACTIVE, "Escrow not active");

        escrow.status = EscrowStatus.CANCELLED;
        // Buyer already got refund when they called buyerCancel()
        // This is just a notification

        emit EscrowCancelled(escrowId, escrow.buyer, escrow.amount);
    }

    /// @dev Handle release executed notification
    function _handleReleaseExecuted(bytes calldata _payload) private {
        (, bytes32 escrowId) = abi.decode(_payload, (MessageType, bytes32));
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status == EscrowStatus.ACTIVE) {
            escrow.status = EscrowStatus.RELEASED;
        }

        emit EscrowReleased(escrowId, escrow.seller, escrow.amount);
    }

    /// @dev Handle cancel executed notification
    function _handleCancelExecuted(bytes calldata _payload) private {
        (, bytes32 escrowId) = abi.decode(_payload, (MessageType, bytes32));
        Escrow storage escrow = escrows[escrowId];

        if (escrow.status == EscrowStatus.ACTIVE) {
            escrow.status = EscrowStatus.CANCELLED;
        }

        emit EscrowCancelled(escrowId, escrow.buyer, escrow.amount);
    }

    /// @notice Owner can fund the contract with native tokens for gas
    receive() external payable {}

    /// @notice Owner can withdraw native tokens
    function withdrawNative() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /// @notice Emergency token recovery (owner only)
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
