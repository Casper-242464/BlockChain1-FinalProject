// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LoyaltyToken} from "./LoyaltyToken.sol";

contract SlotMachine is Ownable, ReentrancyGuard {
    mapping(address => PendingSpin) public pendingSpins;
    constructor(address initialOwner, LoyaltyToken token) Ownable(initialOwner) {
        loyaltyToken = token;
    }
    LoyaltyToken public immutable loyaltyToken;
    bytes32 public currentCommit;
    uint256 public commitBlock;
    uint256 public minBet = 1 ether;
    uint256 public maxBet = 100 ether;
    uint256 public maxHighBet = 500 ether;
    uint256 public highBetThreshold = 10 ether;
    uint256 public constant LOYALTY_PER_SPIN = 10 ether;

    event CommitSet(bytes32 indexed commitHash, uint256 indexed blockNumber);
    event SpinRequested(address indexed player, uint256 wager, bytes32 userSeed, uint256 placedBlock);
    event SpinResolved(address indexed player, uint256 wager, uint256 roll, uint256 payout, bytes32 houseSecret);
    event Refunded(address indexed player, uint256 wager);

    struct PendingSpin {
        uint256 wager;
        uint256 placedBlock;
        bytes32 userSeed;
        bool highStakes;
    }

    function commitRandom(bytes32 commitHash) external onlyOwner {
        currentCommit = commitHash;
        commitBlock = block.number;
        emit CommitSet(commitHash, block.number);
    }

    function spin(bytes32 userSeed) external payable nonReentrant {
        require(currentCommit != bytes32(0), "Commit not set");
        PendingSpin storage pending = pendingSpins[msg.sender];
        require(pending.wager == 0, "Pending spin exists");
        uint256 wager = msg.value;
        require(wager >= minBet, "Bet too low");

        uint256 allowedMax = loyaltyToken.balanceOf(msg.sender) >= highBetThreshold ? maxHighBet : maxBet;
        require(wager <= allowedMax, "Bet too high");

        pendingSpins[msg.sender] = PendingSpin({
            wager: wager,
            placedBlock: block.number,
            userSeed: userSeed,
            highStakes: loyaltyToken.balanceOf(msg.sender) >= highBetThreshold
        });

        emit SpinRequested(msg.sender, wager, userSeed, block.number);
    }

    function resolveSpin(address player, bytes32 houseSecret) external onlyOwner nonReentrant {
        PendingSpin storage pending = pendingSpins[player];
        require(pending.wager > 0, "No pending spin");
        require(keccak256(abi.encodePacked(houseSecret)) == currentCommit, "Bad secret");
        require(block.number > pending.placedBlock, "Wait 1 block");
        require(block.number - pending.placedBlock <= 256, "Blockhash expired");

        bytes32 randomHash = keccak256(
            abi.encodePacked(houseSecret, pending.userSeed, blockhash(pending.placedBlock))
        );
        uint256 roll = uint256(randomHash) % 1000;
        uint256 reel1 = roll % 10;
        uint256 reel2 = (roll / 10) % 10;
        uint256 reel3 = (roll / 100) % 10;
        uint256 payoutMultiplier = 0;
        if (reel1 == reel2 && reel2 == reel3) {
            payoutMultiplier = 10;
        } else if (reel1 == reel2 || reel1 == reel3 || reel2 == reel3) {
            payoutMultiplier = 2;
        }
        uint256 wager = pending.wager;
        bool highStakes = pending.highStakes;
        if (highStakes && payoutMultiplier > 0) {
            payoutMultiplier *= 2;
        }
        uint256 payout = wager * payoutMultiplier;
        delete pendingSpins[player];

        if (payout > 0) {
            require(address(this).balance >= payout, "Insufficient bank");
            (bool sent, ) = player.call{value: payout}("");
            require(sent, "Payout failed");
        }
        if (highStakes) {
            loyaltyToken.burnFrom(player, highBetThreshold);
        } else {
            loyaltyToken.mint(player, LOYALTY_PER_SPIN);
        }
        emit SpinResolved(player, wager, roll, payout, houseSecret);
    }
    function ownerWithdraw(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Withdraw failed");
    }

    receive() external payable {}
}
