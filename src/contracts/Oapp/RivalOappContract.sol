// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OApp, Origin, MessagingFee} from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title RivalsOappContract
contract RivalsOappContract is OApp {
    IERC20 public token;

    /// @notice Number of confirmations required for a withdrawal
    uint256 public constant APPROVAL_THRESHOLD = 2;

    /// @notice Track user balances
    mapping(address => uint256) public balances;

    /// @notice Events
    event Deposit(address indexed user, uint256 amount);
    event WithdrawalRequested(address indexed user, uint256 amount, uint32 dstChain);
    event WithdrawalExecuted(address indexed user, uint256 amount);

    constructor(address _endpoint, address _owner, IERC20 _token) OApp(_endpoint, _owner) Ownable(_owner) {
        token = _token;
    }

    /// @notice Deposit tokens into the vault
    function deposit(uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /// @notice Request a cross-chain withdrawal
    /// @dev Sends a message to destination chain to approve withdrawal
    function requestWithdrawal(uint256 amount, uint32 dstChain, bytes calldata options) external payable {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be positive");

        // Send withdrawal request to destination chain for approval
        bytes memory payload = abi.encode(msg.sender, amount);

        _lzSend(
            dstChain,
            payload,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit WithdrawalRequested(msg.sender, amount, dstChain);
    }

    /// @notice LayerZero callback - receives withdrawal approvals and executes withdrawals
    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata payload,
        address,
        bytes calldata
    ) internal override {
        (address user, uint256 amount) = abi.decode(payload, (address, uint256));

        require(balances[user] >= amount, "Insufficient balance");
        token.transfer(user, amount);
        balances[user] -= amount;

        emit WithdrawalExecuted(user, amount);
    }

    /// @notice Get total vault balance
    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
