// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './BuybackBurnVault.sol';import './GraduationManager.sol';
contract LiquidityVault {
 LaunchToken public immutable token;IRouteDEX public immutable swapper;IV2Router public immutable dex;IUtilityOracle public immutable oracle;address public immutable pool;
 uint256 public totalBNB;uint256 public totalLP;bool private entered;
 event Added(uint256 bnb,uint256 tokens,uint256 lp);
 constructor(LaunchToken t,IRouteDEX d,IUtilityOracle o,address approvedPool){require(address(t).code.length>0&&address(d).code.length>0&&address(o).code.length>0&&approvedPool!=address(0),"configuration");token=t;swapper=d;dex=IV2Router(address(d));oracle=o;pool=approvedPool;}
 receive() external payable{}
 function execute(uint256 bnb,uint256 deadline) external {require(!entered,"reentrant");entered=true;require(bnb>=0.2 ether&&bnb<=2 ether&&bnb<=address(this).balance,"bounds");require(deadline>=block.timestamp&&deadline<=block.timestamp+120,"deadline");require(IV2Factory(dex.factory()).getPair(address(token),dex.WETH())==pool,"pool");uint256 half=bnb/2;(uint256 quote,uint256 updated,uint256 cap)=oracle.quote(address(token),half);require(quote>0&&updated<=block.timestamp&&block.timestamp-updated<=300&&bnb<=cap,"oracle");address[] memory path=new address[](2);path[0]=dex.WETH();path[1]=address(token);uint256 before=token.balanceOf(address(this));swapper.swapExactETHForTokens{value:half}(quote*9700/10000,path,address(this),deadline);uint256 bought=token.balanceOf(address(this))-before;require(bought>0,"output");token.approve(address(dex),bought);(uint256 used,uint256 usedBNB,uint256 lp)=dex.addLiquidityETH{value:bnb-half}(address(token),bought,bought*9700/10000,(bnb-half)*9700/10000,address(this),deadline);require(lp>0,"LP");token.approve(address(dex),0);totalBNB+=half+usedBNB;totalLP+=lp;emit Added(half+usedBNB,used,lp);entered=false;}
 // LP held permanently. Unused change remains in this token-specific vault.
}
