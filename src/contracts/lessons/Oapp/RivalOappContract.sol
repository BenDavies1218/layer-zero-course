// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {OAppOptionsType3} from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RivalsOappContract
contract RivalsOappContract is OApp, OAppOptionsType3 {

    IERC20 public token;

    enum MessageType {
        WITHDRAWAL_REQUEST,
        WITHDRAWAL_APPROVAL
    }

    // Track user balances
    mapping(address => uint256) public balances;

    // Track all depositors
    address[] public depositors;
    mapping(address => bool) public hasDeposited;

    // Track pending withdrawals
    mapping(bytes32 => WithdrawalRequest) public pendingWithdrawals;

    uint16 public constant SEND = 1;

    struct WithdrawalRequest {
        address user;
        uint256 amount;
        uint32 sourceChain;
        bool approved;
    }

    event Deposit(address indexed user, uint256 amount);
    event WithdrawalRequested(address indexed user, uint256 amount, uint32 dstChain, bytes32 requestId);
    event WithdrawalApproved(address indexed user, uint256 amount, bytes32 requestId);
    event WithdrawalExecuted(address indexed user, uint256 amount);

    constructor(
        address _endpoint,
        address _owner,
        IERC20 _token
    ) OApp(_endpoint, _owner) Ownable(_owner) {
        token = _token;
    }

    /// @notice Deposit tokens into the vault
    function deposit(uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;

        // Track new depositors
        if (!hasDeposited[msg.sender]) {
            depositors.push(msg.sender);
            hasDeposited[msg.sender] = true;
        }

        emit Deposit(msg.sender, amount);
    }
    /// @notice Request withdrawal of tokens to another chain
    function requestWithdrawal(
        uint256 amount,
        uint32 guardianChain,
        bytes calldata sendOptions,
        bytes calldata returnOptions
    ) external payable {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be positive");

        // Create unique request ID for this withdrawal
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp));

        // Store pending withdrawal
        pendingWithdrawals[requestId] = WithdrawalRequest({
            user: msg.sender,
            amount: amount,
            sourceChain: uint32(block.chainid),
            approved: false
        });

        // Encode withdrawal request with return options for approval
        bytes memory payload = abi.encode(
            MessageType.WITHDRAWAL_REQUEST,
            requestId,
            msg.sender,
            amount,
            returnOptions
        );

        // Combine options
        bytes memory options = combineOptions(guardianChain, SEND, sendOptions);

        // Send withdrawal request to guardian chain
        _lzSend(
            guardianChain,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit WithdrawalRequested(msg.sender, amount, guardianChain, requestId);
    }

    /// @notice Quote fee for withdrawal request round trip
    function quoteWithdrawal(
        uint256 amount,
        uint32 guardianChain,
        bytes calldata sendOptions,
        bytes calldata returnOptions
    ) external view returns (uint256 totalFee) {
        bytes32 quoteRequestId = bytes32(0); // mock ID for quoting

        bytes memory approvalPayload = abi.encode(
            MessageType.WITHDRAWAL_APPROVAL,
            quoteRequestId,
            msg.sender,
            amount
        );

        bytes memory approvalOpts = combineOptions(guardianChain, SEND, returnOptions);
        
        MessagingFee memory approvalFee = _quote(guardianChain, approvalPayload, approvalOpts, false);

        // Quote request cost
        bytes memory requestPayload = abi.encode(
            MessageType.WITHDRAWAL_REQUEST,
            quoteRequestId,
            msg.sender,
            amount,
            returnOptions
        );

        bytes memory requestOpts = combineOptions(guardianChain, SEND, sendOptions);
        
        MessagingFee memory requestFee = _quote(guardianChain, requestPayload, requestOpts, false);

        totalFee = requestFee.nativeFee + approvalFee.nativeFee;
    }

    /// @notice Get all depositors and their current balances
    function getAllDepositors() external view returns (address[] memory users, uint256[] memory amounts) {
        uint256 count = depositors.length;
        users = new address[](count);
        amounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            users[i] = depositors[i];
            amounts[i] = balances[depositors[i]];
        }
    }

    /// @notice Handle incoming messages
    function _lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _payload,
        address,
        bytes calldata
    ) internal override {
        MessageType messageType = abi.decode(_payload, (MessageType));

        if (messageType == MessageType.WITHDRAWAL_REQUEST) {
            (
                ,
                bytes32 requestId,
                address user,
                uint256 amount,
                bytes memory returnOptions
            ) = abi.decode(_payload, (MessageType, bytes32, address, uint256, bytes));

            bytes memory approvalPayload = abi.encode(
                MessageType.WITHDRAWAL_APPROVAL,
                requestId,
                user,
                amount
            );

            bytes memory options = returnOptions;

            _lzSend(
                _origin.srcEid,
                approvalPayload,
                options,
                MessagingFee(msg.value, 0),
                payable(address(this))
            );

            emit WithdrawalApproved(user, amount, requestId);

        } else if (messageType == MessageType.WITHDRAWAL_APPROVAL) {
            (, bytes32 requestId, address user, uint256 amount) = abi.decode(
                _payload,
                (MessageType, bytes32, address, uint256)
            );

            WithdrawalRequest storage request = pendingWithdrawals[requestId];
            require(!request.approved, "Already approved");
            require(request.user != address(0), "Invalid request");
            require(balances[user] >= amount, "Insufficient balance");

            request.approved = true;
            balances[user] -= amount;
            token.transfer(user, amount);

            emit WithdrawalExecuted(user, amount);

            delete pendingWithdrawals[requestId];
        }
    }

    receive() external payable {}

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}
