// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract CreatorFeeRouter {
 address public immutable approvedRoute; address public immutable factory; address public immutable protocolTreasury;
 struct Config{address source;address payout;uint16[5] weights;bool exists;}
 mapping(address=>Config) private configs;
 mapping(address=>mapping(uint8=>uint256)) public credit;
 mapping(address=>uint256) public collected; uint256 public protocolCredit;
 bool private entered;
 event Distributed(address indexed token,address indexed source,uint256 creatorFee,uint256 protocolFee,uint256[5] amounts);
 event Claimed(address indexed token,uint8 indexed bucket,address indexed recipient,uint256 amount);
 modifier lock(){require(!entered,"reentrant");entered=true;_;entered=false;}
 constructor(address treasury,address route){approvedRoute=route;require(treasury!=address(0),"treasury");factory=msg.sender;protocolTreasury=treasury;}
 function register(address token,address source,address payout,uint16[5] calldata weights) external {require(msg.sender==factory&&!configs[token].exists&&payout!=address(0),"registration");uint256 sum;for(uint8 i;i<5;i++)sum+=weights[i];require(sum==10000,"allocation");configs[token]=Config(source,payout,weights,true);}
 function configuration(address token) external view returns(Config memory){return configs[token];}
 function accrue(address token,uint256 creatorFee) external payable {Config storage c=configs[token];require(c.exists&&(msg.sender==c.source||msg.sender==approvedRoute)&&msg.value>=creatorFee,"source");uint256[5] memory amounts;uint256 allocated;for(uint8 i;i<4;i++){amounts[i]=creatorFee*c.weights[i]/10000;allocated+=amounts[i];credit[token][i]+=amounts[i];}amounts[4]=creatorFee-allocated;credit[token][4]+=amounts[4];collected[token]+=msg.value;protocolCredit+=msg.value-creatorFee;emit Distributed(token,msg.sender,creatorFee,msg.value-creatorFee,amounts);}
 function claimCreator(address token) external lock {Config storage c=configs[token];require(msg.sender==c.payout,"payout");uint256 a=credit[token][4];require(a>0,"empty");credit[token][4]=0;_pay(c.payout,a);emit Claimed(token,4,c.payout,a);}
 function claimProtocol() external lock {require(msg.sender==protocolTreasury,"treasury");uint256 a=protocolCredit;protocolCredit=0;_pay(protocolTreasury,a);}
 // Utility buckets remain escrowed until a reviewed release enables bounded modules.
 // No admin sweep or arbitrary withdrawal path exists.
 function _pay(address to,uint256 a) private {(bool ok,)=to.call{value:a}("");require(ok,"payment");}
}
