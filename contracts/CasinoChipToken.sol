// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import the ERC20 contract from OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CasinoChipToken is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        // Mint the initial supply of tokens to the contract deployer
        _mint(msg.sender, initialSupply);
    }
}