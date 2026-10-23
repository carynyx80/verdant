// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './LaunchToken.sol';import './CreatorFeeRouter.sol';
interface IRouteDEX {
 function WETH() external view returns(address);
 function swapExactETHForTokens(uint,address[] calldata,address,uint) external payable returns(uint[] memory);
 function swapExactTokensForETH(uint,uint,address[] calldata,address,uint) external returns(uint[] memory);
}
interface IRouteFactory {function marketOf(address) external view returns(address);function feeRouter() external view returns(CreatorFeeRouter);}
interface IRouteMarket {function graduated() external view returns(bool);function creatorBps() external view returns(uint16);}
// Explicit opt-in route. Direct DEX trades bypass this fee.
contract ApprovedFeeRoute {
 IRouteFactory public immutable factory;IRouteDEX public immutable dex;bool private entered;
 event Routed(address indexed token,address indexed trader,bool buy,uint256 gross,uint256 net,uint256 creatorFee,uint256 protocolFee);
 modifier lock(){require(!entered,"reentrant");entered=true;_;entered=false;}
 constructor(IRouteFactory f,IRouteDEX d){require(address(f)!=address(0)&&address(d).code.length>0,"configuration");factory=f;dex=d;}
 receive() external payable{require(msg.sender==address(dex),"DEX only");}
 function _fee(address token,uint256 gross) private view returns(uint256 c,uint256 p){address m=factory.marketOf(token);require(m!=address(0)&&IRouteMarket(m).graduated(),"not graduated");c=gross*IRouteMarket(m).creatorBps()/10000;p=gross*50/10000;}
 function buy(address t,uint256 minTokens,uint256 deadline) external payable lock{require(msg.value>0&&deadline>=block.timestamp&&deadline<=block.timestamp+300,"deadline");(uint256 c,uint256 p)=_fee(t,msg.value);address[] memory path=new address[](2);path[0]=dex.WETH();path[1]=t;uint256 before=LaunchToken(t).balanceOf(msg.sender);dex.swapExactETHForTokens{value:msg.value-c-p}(minTokens,path,msg.sender,deadline);require(LaunchToken(t).balanceOf(msg.sender)-before>=minTokens,"slippage");factory.feeRouter().accrue{value:c+p}(t,c);emit Routed(t,msg.sender,true,msg.value,msg.value-c-p,c,p);}
 function sell(address t,uint256 amount,uint256 minBNB,uint256 deadline) external lock{require(amount>0&&deadline>=block.timestamp&&deadline<=block.timestamp+300,"deadline");_fee(t,0);LaunchToken token=LaunchToken(t);token.transferFrom(msg.sender,address(this),amount);token.approve(address(dex),amount);address[] memory path=new address[](2);path[0]=t;path[1]=dex.WETH();uint256 before=address(this).balance;dex.swapExactTokensForETH(amount,0,path,address(this),deadline);token.approve(address(dex),0);uint256 gross=address(this).balance-before;(uint256 c,uint256 p)=_fee(t,gross);uint256 net=gross-c-p;require(net>=minBNB&&net>0,"slippage");factory.feeRouter().accrue{value:c+p}(t,c);(bool ok,)=msg.sender.call{value:net}("");require(ok,"payment");emit Routed(t,msg.sender,false,gross,net,c,p);}
}
