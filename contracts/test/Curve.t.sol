// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import '../src/LaunchpadFactory.sol';
interface Vm {function deal(address,uint256) external;}
contract CurveProperties {
 Vm constant vm=Vm(address(uint160(uint256(keccak256('hevm cheat code')))));
 receive() external payable{}
 function testFuzz_RoundTripAndFeeConservation(uint96 raw) public {uint256 amount=uint256(raw)%10 ether+1e10;vm.deal(address(this),amount);LaunchpadFactory factory=new LaunchpadFactory(address(this),address(0),address(0));uint16[5] memory weights=[uint16(3000),2500,2000,1500,1000];(address t,address m)=factory.launch('Test','TST','',100,weights);BondingCurve curve=BondingCurve(m);(uint256 out,uint256 c,uint256 p,uint256 net)=curve.quoteBuy(amount);curve.buy{value:amount}(out,block.timestamp);require(m.balance==net,'reserve');CreatorFeeRouter router=factory.feeRouter();uint256 total;for(uint8 i;i<5;i++)total+=router.credit(t,i);require(total==c,'creator conservation');require(address(router).balance==c+p,'fee conservation');LaunchToken(t).approve(m,out);(uint256 returned,,,)=curve.quoteSell(out);curve.sell(out,returned,block.timestamp);require(m.balance==curve.reserveBNB(),'solvency');require(LaunchToken(t).balanceOf(m)==LaunchToken(t).totalSupply(),'supply');}
}
