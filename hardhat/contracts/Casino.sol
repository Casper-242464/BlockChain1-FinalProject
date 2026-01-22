// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVault {
    function getBalance() external view returns (uint256);
    function payWinner(address winner, uint256 amount) external;
}

interface ICasinoLoyaltyToken {
    function mint(address to, uint256 amount) external;
}

contract Casino {
    address public owner;
    IVault public vault;
    ICasinoLoyaltyToken public token;
    uint256 public rewardAmount = 10; // Amount of loyalty tokens to mint per game

    // Event for frontend to listen to game results
    event GameResult(address indexed player, uint256 amountBet, bool won, uint256 amountWon);

    constructor(address _vault, address _token) {
        owner = msg.sender;
        vault = IVault(_vault);
        token = ICasinoLoyaltyToken(_token);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Coin flip game: 0 for Heads, 1 for Tails
    // Payable function requiring ETH bet
    function flipCoin(uint8 _choice) external payable {
        require(_choice == 0 || _choice == 1, "Choice must be 0 (Heads) or 1 (Tails)");
        require(msg.value > 0, "Must send ETH to place a bet");

        // Safety check: Ensure the vault has enough funds to pay a potential 2x win
        require(vault.getBalance() >= msg.value * 2, "House cannot afford potential payout");

        // Generate pseudo-random result (NOT SECURE FOR MAINNET - for educational purposes only)
        uint256 randomParams = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        uint256 result = randomParams % 2; // 0 or 1

        bool won = (result == _choice);
        uint256 amountWon = won ? msg.value * 2 : 0;

        if (won) {
            // User wins: Pay 2x the bet from the vault
            vault.payWinner(msg.sender, msg.value * 2);
        } else {
            // User loses: ETH remains in the vault (already received via payable)
        }

        // Emit event for frontend
        emit GameResult(msg.sender, msg.value, won, amountWon);

        // Mint loyalty tokens regardless of outcome
        token.mint(msg.sender, rewardAmount);
    }

    // Function to update reward amount (only owner)
    function setRewardAmount(uint256 _amount) external onlyOwner {
        rewardAmount = _amount;
    }
}