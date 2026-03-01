// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OApp, Origin, MessagingFee } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { OAppOptionsType3 } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title VaultCorp
/// @notice A cross-chain vault with a critical vulnerability
/// @dev EDUCATIONAL PURPOSE ONLY - This contract contains intentional vulnerabilities
contract VaultCorp is OApp, OAppOptionsType3 {
    IERC20 public immutable token;

    enum MessageType {
        WITHDRAWAL_REQUEST,
        CREDIT_APPROVAL
    }

    uint16 public constant SEND = 1;

    mapping(address => uint256) public balances;

    address[] public depositors;
    mapping(address => bool) public hasDeposited;

    event Deposit(address indexed user, uint256 amount);
    event WithdrawalRequested(address indexed user, uint256 amount, uint32 approvalChain, bytes32 requestId);
    event CreditApproved(address indexed user, uint256 amount, bytes32 requestId);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(address _endpoint, address _owner, address _token) OApp(_endpoint, _owner) Ownable(_owner) {
        token = IERC20(_token);
    }

    /// @notice Deposit tokens into the vault
    /// @param amount The amount of tokens to deposit
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be positive");

        token.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;

        if (!hasDeposited[msg.sender]) {
            depositors.push(msg.sender);
            hasDeposited[msg.sender] = true;
        }

        emit Deposit(msg.sender, amount);
    }

    /// @notice Request withdrawal with cross-chain approval
    /// @param amount The amount to withdraw
    /// @param approvalChain The chain that will approve the withdrawal
    /// @param sendOptions Options for the request message
    /// @param returnOptions Options for the approval message
    function requestWithdrawal(
        uint256 amount,
        uint32 approvalChain,
        bytes calldata sendOptions,
        bytes calldata returnOptions
    ) external payable {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be positive");

        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp, block.number));

        balances[msg.sender] -= amount;

        bytes memory payload = abi.encode(MessageType.WITHDRAWAL_REQUEST, requestId, msg.sender, amount, returnOptions);

        bytes memory options = combineOptions(approvalChain, SEND, sendOptions);

        _lzSend(approvalChain, payload, options, MessagingFee(msg.value, 0), payable(msg.sender));

        emit WithdrawalRequested(msg.sender, amount, approvalChain, requestId);
    }

    /// @notice Quote the total fee for a withdrawal request (round trip)
    /// @param amount The amount to withdraw
    /// @param approvalChain The chain that will approve the withdrawal
    /// @param sendOptions Options for the request message
    /// @param returnOptions Options for the approval message
    /// @return totalFee The total native fee required
    function quoteWithdrawal(
        uint256 amount,
        uint32 approvalChain,
        bytes calldata sendOptions,
        bytes calldata returnOptions
    ) external view returns (uint256 totalFee) {
        bytes32 mockRequestId = bytes32(0);

        bytes memory approvalPayload = abi.encode(MessageType.CREDIT_APPROVAL, mockRequestId, msg.sender, amount);

        bytes memory approvalOpts = combineOptions(approvalChain, SEND, returnOptions);
        MessagingFee memory approvalFee = _quote(approvalChain, approvalPayload, approvalOpts, false);

        bytes memory requestPayload = abi.encode(
            MessageType.WITHDRAWAL_REQUEST,
            mockRequestId,
            msg.sender,
            amount,
            returnOptions
        );

        bytes memory requestOpts = combineOptions(approvalChain, SEND, sendOptions);
        MessagingFee memory requestFee = _quote(approvalChain, requestPayload, requestOpts, false);

        totalFee = requestFee.nativeFee + approvalFee.nativeFee;
    }

    /// @notice Get all depositors and their current balances
    /// @return users Array of depositor addresses
    /// @return amounts Array of corresponding balances
    function getAllDepositors() external view returns (address[] memory users, uint256[] memory amounts) {
        uint256 count = depositors.length;
        users = new address[](count);
        amounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            users[i] = depositors[i];
            amounts[i] = balances[depositors[i]];
        }
    }

    /// @notice Handle incoming LayerZero messages
    /// @dev This function processes both withdrawal requests and credit approvals
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        MessageType messageType = abi.decode(_payload, (MessageType));

        if (messageType == MessageType.WITHDRAWAL_REQUEST) {
            _handleWithdrawalRequest(_origin, _payload);
        } else if (messageType == MessageType.CREDIT_APPROVAL) {
            _handleCreditApproval(_origin, _payload);
        }
    }

    /// @dev Handle withdrawal request on the approval chain
    function _handleWithdrawalRequest(Origin calldata _origin, bytes calldata _payload) private {
        (, bytes32 requestId, address user, uint256 amount, bytes memory returnOptions) = abi.decode(
            _payload,
            (MessageType, bytes32, address, uint256, bytes)
        );

        bytes memory approvalPayload = abi.encode(MessageType.CREDIT_APPROVAL, requestId, user, amount);

        _lzSend(
            _origin.srcEid,
            approvalPayload,
            returnOptions,
            MessagingFee(address(this).balance, 0),
            payable(address(this))
        );

        emit CreditApproved(user, amount, requestId);
    }

    /// @dev Handle credit approval and execute withdrawal
    function _handleCreditApproval(Origin calldata, bytes calldata _payload) private {
        (, bytes32 requestId, address user, uint256 amount) = abi.decode(
            _payload,
            (MessageType, bytes32, address, uint256)
        );

        require(token.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        token.transfer(user, amount);

        emit Withdrawn(user, amount);
    }

    /// @notice Owner can fund the contract with native tokens for gas
    receive() external payable {}

    /// @notice Owner can withdraw native tokens
    function withdrawNative() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    /// @notice Emergency token recovery (owner only)
    /// @dev Only for recovering stuck tokens, not for normal operations
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }
}
