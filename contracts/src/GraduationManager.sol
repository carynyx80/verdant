// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './LaunchToken.sol';
interface IV2Router {function WETH() external view returns(address);function factory() external view returns(address);function addLiquidityETH(address,uint,uint,uint,address,uint) external payable returns(uint,uint,uint);}
interface IV2Factory {function getPair(address,address) external view returns(address);}
interface IFactory {function marketOf(address) external view returns(address);}
// Construct with the predicted factory address. Deploy only after fork validation.
contract GraduationManager {
 address public immutable launchpad;IV2Router public immutable dex;mapping(address=>address) public poolOf;
 event LiquidityLocked(address indexed token,address indexed pool,uint256 lp,uint256 tokens,uint256 bnb);
 constructor(address f,IV2Router r){require(f!=address(0)&&address(r).code.length>0,"configuration");launchpad=f;dex=r;}
 function migrate(address t) external payable returns(address pool){require(msg.sender==IFactory(launchpad).marketOf(t)&&poolOf[t]==address(0)&&msg.value>0,"market");pool=IV2Factory(dex.factory()).getPair(t,dex.WETH());require(pool==address(0),"existing pool");LaunchToken token=LaunchToken(t);uint256 amount=token.balanceOf(address(this));token.approve(address(dex),amount);(uint256 used,uint256 bnb,uint256 lp)=dex.addLiquidityETH{value:msg.value}(t,amount,amount,msg.value,address(this),block.timestamp);require(used==amount&&bnb==msg.value&&lp>0,"migration");token.approve(address(dex),0);pool=IV2Factory(dex.factory()).getPair(t,dex.WETH());require(pool!=address(0),"pool");poolOf[t]=pool;emit LiquidityLocked(t,pool,lp,used,bnb);}
 // LP tokens are permanently held. No withdraw, approval, call or upgrade function.
}
