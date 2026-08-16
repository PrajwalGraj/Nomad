// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply ERC-20 minted entirely to its creator at deploy time.
contract NomadToken is ERC20 {
    address public immutable creator;

    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, address creator_)
        ERC20(name_, symbol_)
    {
        creator = creator_;
        _mint(creator_, totalSupply_);
    }
}
