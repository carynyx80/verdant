// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './LaunchToken.sol';import './ApprovedFeeRoute.sol';
interface IUtilityOracle {function quote(address token,uint256 bnb) external view returns(uint256 tokens,uint256 updatedAt,uint256 maxBNB);}
// Standalone reviewed-oracle integration candidate, not activated by the factory.
contract BuybackBurnVault {
 LaunchToken public immutable token;IRouteDEX public immutable dex;IUtilityOracle public immutable oracle;
 uint256 public totalSpent;uint256 public totalBurned;bool private entered;
 event Burned(uint256 bnb,uint256 tokens);
 constructor(LaunchToken t,IRouteDEX d,IUtilityOracle o){require(address(t).code.length>0&&address(d).code.length>0&&address(o).code.length>0,"configuration");token=t;dex=d;oracle=o;}
 receive() external payable{}
 function execute(uint256 bnb,uint256 deadline) external {require(!entered,"reentrant");entered=true;require(bnb>=0.1 ether&&bnb<=2 ether&&bnb<=address(this).balance,"bounds");require(deadline>=block.timestamp&&deadline<=block.timestamp+120,"deadline");(uint256 quote,uint256 updated,uint256 cap)=oracle.quote(address(token),bnb);require(quote>0&&updated<=block.timestamp&&block.timestamp-updated<=300&&bnb<=cap,"oracle");uint256 min=quote*9700/10000;require(min>0,"dust");address[] memory path=new address[](2);path[0]=dex.WETH();path[1]=address(token);uint256 before=token.balanceOf(address(this));dex.swapExactETHForTokens{value:bnb}(min,path,address(this),deadline);uint256 purchased=token.balanceOf(address(this))-before;require(purchased>=min,"slippage");token.burn(purchased);totalSpent+=bnb;totalBurned+=purchased;emit Burned(bnb,purchased);entered=false;}
}
