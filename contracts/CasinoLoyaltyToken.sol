// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import the ERC20 contract from OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CasinoLoyaltyToken is ERC20 {
    address public owner;
    address public casino;

    constructor() ERC20("CasinoLoyaltyToken", "CLT") {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyCasino() {
        require(msg.sender == casino, "Only casino contract can mint tokens");
        _;
    }

    // Set the casino contract address after deploying the token
    function setCasino(address _casino) external onlyOwner {
        casino = _casino;
    }

    // Mint function accessible only by the casino contract
    function mint(address to, uint256 amount) external onlyCasino {
        _mint(to, amount);
    }
}