// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import '../src/LaunchToken.sol';
contract MockDex {
 address public constant WETH=address(0xBEEF);mapping(address=>address) public pairs;
 receive() external payable{}
 function factory() external view returns(address){return address(this);}
 function getPair(address t,address) external view returns(address){return pairs[t];}
 function addLiquidityETH(address t,uint a,uint minT,uint minBNB,address to,uint deadline) external payable returns(uint,uint,uint){require(a>=minT&&msg.value>=minBNB&&deadline>=block.timestamp,"bounds");LaunchToken(t).transferFrom(msg.sender,address(this),a);address lp=pairs[t];if(lp==address(0)){lp=address(new LaunchToken('Mock LP','MLP',address(this)));pairs[t]=lp;}LaunchToken(lp).transfer(to,msg.value);return(a,msg.value,msg.value);}
 function swapExactETHForTokens(uint min,address[] calldata path,address to,uint deadline) external payable returns(uint[] memory a){require(deadline>=block.timestamp,"deadline");uint out=msg.value*1000;require(out>=min,"slippage");LaunchToken(path[1]).transfer(to,out);a=new uint[](2);a[0]=msg.value;a[1]=out;}
 function swapExactTokensForETH(uint amount,uint min,address[] calldata path,address to,uint deadline) external returns(uint[] memory a){require(deadline>=block.timestamp,"deadline");uint out=amount/1000;require(out>=min,"slippage");LaunchToken(path[0]).transferFrom(msg.sender,address(this),amount);(bool ok,)=to.call{value:out}("");require(ok);a=new uint[](2);a[0]=amount;a[1]=out;}
}
contract MockOracle {
 bool public stale;
 function setStale(bool v) external{stale=v;}
 function quote(address,uint bnb) external view returns(uint,uint,uint){return(bnb*1000,stale?block.timestamp-1000:block.timestamp,2 ether);}
}
