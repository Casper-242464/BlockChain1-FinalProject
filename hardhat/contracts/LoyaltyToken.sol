// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract LoyaltyToken is ERC20, Ownable, ERC20Burnable {
    address public minter;
    constructor(address initialOwner) ERC20("SlotFair Loyalty", "SFL") Ownable(initialOwner) {
        minter = initialOwner;
    }
    modifier onlyMinter() {
        require(msg.sender == minter, "Not minter");
        _;
    }
    function setMinter(address newMinter) external onlyOwner {
        minter = newMinter;
    }
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
    function burnFrom(address account, uint256 amount) public override onlyMinter {
        _burn(account, amount);
    }
}
