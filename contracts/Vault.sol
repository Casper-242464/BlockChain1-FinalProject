// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Vault {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Payable function allowing the owner to send Test ETH to the contract
    function depositHouseFunds() external payable onlyOwner {
        // Funds are automatically added to the contract balance
    }

    // Allow the owner to withdraw profits
    function withdrawHouseFunds(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient contract balance");
        payable(owner).transfer(amount);
    }

    // Function to check the contract balance (for safety checks in game logic)
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}