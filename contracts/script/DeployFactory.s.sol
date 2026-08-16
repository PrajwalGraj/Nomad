// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {NomadTokenFactory} from "../src/NomadTokenFactory.sol";

/// @dev Run with:
/// forge script script/DeployFactory.s.sol:DeployFactory --rpc-url monad_testnet --private-key $DEPLOYER_PRIVATE_KEY --broadcast
contract DeployFactory is Script {
    function run() external returns (NomadTokenFactory factory) {
        vm.startBroadcast();
        factory = new NomadTokenFactory();
        vm.stopBroadcast();

        console.log("NomadTokenFactory deployed at:", address(factory));
    }
}
