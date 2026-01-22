// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Vault {
    address public owner;
    address public casino;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyCasino() {
        require(msg.sender == casino, "Only casino contract can call this function");
        _;
    }

    // Set the casino contract address (only owner can set it)
    function setCasino(address _casino) external onlyOwner {
        casino = _casino;
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

    // Function for the casino to pay winners
    function payWinner(address winner, uint256 amount) external onlyCasino {
        require(address(this).balance >= amount, "Insufficient funds in vault");
        payable(winner).transfer(amount);
    }
}