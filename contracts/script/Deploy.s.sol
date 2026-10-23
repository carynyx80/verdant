// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import '../src/LaunchpadFactory.sol';import '../src/GraduationManager.sol';import '../src/ApprovedFeeRoute.sol';
interface DeployVm {function envBool(string calldata) external returns(bool);function envAddress(string calldata) external returns(address);function envBytes32(string calldata) external returns(bytes32);function startBroadcast() external;function stopBroadcast() external;}
contract Deploy {
 DeployVm constant vm=DeployVm(address(uint160(uint256(keccak256('hevm cheat code')))));
 function run() external returns(LaunchpadFactory factory){require(block.chainid==56,"BNB mainnet only");require(vm.envBool('MAINNET_DEPLOYMENT_AUTHORIZED'),"explicit authorization required");require(vm.envBytes32('SECURITY_REVIEW_SHA256')!=0,"independent review required");address dex=vm.envAddress('REVIEWED_DEX_ROUTER');require(dex.code.length>0&&keccak256(dex.code)==vm.envBytes32('REVIEWED_DEX_CODEHASH'),"router identity");address predicted=vm.envAddress('PREDICTED_FACTORY_ADDRESS');address treasury=vm.envAddress('PROTOCOL_MULTISIG');require(treasury.code.length>0,"multisig contract required");vm.startBroadcast();GraduationManager manager=new GraduationManager(predicted,IV2Router(dex));ApprovedFeeRoute route=new ApprovedFeeRoute(IRouteFactory(predicted),IRouteDEX(dex));factory=new LaunchpadFactory(treasury,address(manager),address(route));require(address(factory)==predicted,"nonce prediction mismatch");vm.stopBroadcast();}
}
