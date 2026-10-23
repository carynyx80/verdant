// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './LaunchToken.sol';
import './CreatorFeeRouter.sol';
interface IGraduationAdapter {function migrate(address token) external payable returns(address pool);}
contract BondingCurve {
 LaunchToken public immutable token; CreatorFeeRouter public immutable feeRouter;
 uint256 public constant VIRTUAL_BNB=30 ether; uint256 public constant INITIAL_TOKEN=1_073_000_000 ether;
 uint256 public constant GRADUATION_RESERVE=85 ether;uint16 public constant PROTOCOL_BPS=50;
 uint16 public immutable creatorBps;address public immutable graduationAdapter;
 uint256 public reserveBNB;uint256 public virtualToken=INITIAL_TOKEN;bool public graduated;bool private entered;
 event Trade(address indexed trader,bool buy,uint256 bnb,uint256 tokens,uint256 creatorFee,uint256 protocolFee,uint256 reserve,uint256 tokenReserve);
 event Graduated(address indexed token,address indexed pool,uint256 bnb,uint256 tokens);
 modifier lock(){require(!entered,"reentrant");entered=true;_;entered=false;}
 modifier active(){require(!graduated,"graduated");_;}
 constructor(string memory n,string memory s,uint16 fee,CreatorFeeRouter router,address adapter){require(fee>=100&&fee<=1000,"fee");creatorBps=fee;feeRouter=router;graduationAdapter=adapter;token=new LaunchToken(n,s,address(this));}
 function quoteBuy(uint256 gross) public view returns(uint256 out,uint256 creator,uint256 protocol,uint256 net){creator=gross*creatorBps/10000;protocol=gross*PROTOCOL_BPS/10000;net=gross-creator-protocol;out=virtualToken*net/(VIRTUAL_BNB+reserveBNB+net);}
 function quoteSell(uint256 amount) public view returns(uint256 net,uint256 creator,uint256 protocol,uint256 gross){gross=(VIRTUAL_BNB+reserveBNB)*amount/(virtualToken+amount);creator=gross*creatorBps/10000;protocol=gross*PROTOCOL_BPS/10000;net=gross-creator-protocol;}
 function buy(uint256 minOut,uint256 deadline) external payable lock active {require(block.timestamp<=deadline&&msg.value>0,"deadline/value");(uint256 out,uint256 c,uint256 p,uint256 net)=quoteBuy(msg.value);require(out>=minOut&&out>0&&out<=token.balanceOf(address(this)),"slippage/supply");require(reserveBNB+net<=GRADUATION_RESERVE,"threshold");reserveBNB+=net;virtualToken-=out;token.transfer(msg.sender,out);feeRouter.accrue{value:c+p}(address(token),c);emit Trade(msg.sender,true,msg.value,out,c,p,reserveBNB,virtualToken);}
 function sell(uint256 amount,uint256 minOut,uint256 deadline) external lock active {require(block.timestamp<=deadline&&amount>0,"deadline/value");(uint256 net,uint256 c,uint256 p,uint256 gross)=quoteSell(amount);require(gross<=reserveBNB&&net>=minOut&&net>0,"liquidity/slippage");reserveBNB-=gross;virtualToken+=amount;require(token.transferFrom(msg.sender,address(this),amount),"transfer");feeRouter.accrue{value:c+p}(address(token),c);(bool ok,)=msg.sender.call{value:net}("");require(ok,"payment");emit Trade(msg.sender,false,net,amount,c,p,reserveBNB,virtualToken);}
 function graduate() external lock active {require(reserveBNB>=GRADUATION_RESERVE&&graduationAdapter.code.length>0,"not ready");graduated=true;uint256 bnb=reserveBNB;reserveBNB=0;uint256 amount=token.balanceOf(address(this));token.transfer(graduationAdapter,amount);address pool=IGraduationAdapter(graduationAdapter).migrate{value:bnb}(address(token));require(pool!=address(0),"pool");emit Graduated(address(token),pool,bnb,amount);}
}
