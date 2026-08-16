// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {NomadToken} from "./NomadToken.sol";

/// @notice Deploys fixed-supply ERC-20 tokens on demand. This is Nomad's
/// stand-in launchpad — no bonding curve, just mint-and-deploy.
contract NomadTokenFactory {
    event TokenLaunched(
        address indexed token, address indexed creator, string name, string symbol, uint256 totalSupply
    );

    address[] public launchedTokens;

    function launchToken(string calldata name, string calldata symbol, uint256 totalSupply)
        external
        returns (address token)
    {
        token = address(new NomadToken(name, symbol, totalSupply, msg.sender));
        launchedTokens.push(token);
        emit TokenLaunched(token, msg.sender, name, symbol, totalSupply);
    }

    function allTokens() external view returns (address[] memory) {
        return launchedTokens;
    }

    function tokenCount() external view returns (uint256) {
        return launchedTokens.length;
    }
}
