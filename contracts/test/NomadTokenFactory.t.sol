// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NomadTokenFactory} from "../src/NomadTokenFactory.sol";
import {NomadToken} from "../src/NomadToken.sol";

contract NomadTokenFactoryTest is Test {
    NomadTokenFactory factory;
    address creator = address(0xBEEF);

    function setUp() public {
        factory = new NomadTokenFactory();
    }

    function test_LaunchTokenMintsFullSupplyToCreator() public {
        vm.prank(creator);
        address tokenAddr = factory.launchToken("Nomad Coin", "NOMAD", 1_000_000e18);

        NomadToken token = NomadToken(tokenAddr);
        assertEq(token.name(), "Nomad Coin");
        assertEq(token.symbol(), "NOMAD");
        assertEq(token.totalSupply(), 1_000_000e18);
        assertEq(token.balanceOf(creator), 1_000_000e18);
        assertEq(token.creator(), creator);
    }

    function test_TracksLaunchedTokens() public {
        vm.prank(creator);
        address t1 = factory.launchToken("A", "A", 1e18);
        vm.prank(creator);
        address t2 = factory.launchToken("B", "B", 1e18);

        address[] memory tokens = factory.allTokens();
        assertEq(tokens.length, 2);
        assertEq(tokens[0], t1);
        assertEq(tokens[1], t2);
        assertEq(factory.tokenCount(), 2);
    }

    function test_EmitsTokenLaunchedEvent() public {
        vm.expectEmit(false, true, false, true);
        emit NomadTokenFactory.TokenLaunched(address(0), creator, "A", "A", 1e18);
        vm.prank(creator);
        factory.launchToken("A", "A", 1e18);
    }
}
