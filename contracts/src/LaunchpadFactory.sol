// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './BondingCurve.sol';
contract LaunchpadFactory {
 CreatorFeeRouter public immutable feeRouter;address public immutable adapter;mapping(address=>address) public marketOf;address[] public tokens;
 event Launched(address indexed token,address indexed market,address indexed creator,string name,string symbol,string metadataURI,uint16 creatorBps);
 constructor(address treasury,address reviewedAdapter,address reviewedRoute){feeRouter=new CreatorFeeRouter(treasury,reviewedRoute);adapter=reviewedAdapter;}
 function launch(string calldata name,string calldata symbol,string calldata metadataURI,uint16 fee,uint16[5] calldata weights) external returns(address token,address market){require(bytes(name).length>0&&bytes(name).length<=64&&bytes(symbol).length>0&&bytes(symbol).length<=12&&bytes(metadataURI).length<=512,"metadata");BondingCurve curve=new BondingCurve(name,symbol,fee,feeRouter,adapter);token=address(curve.token());market=address(curve);feeRouter.register(token,market,msg.sender,weights);marketOf[token]=market;tokens.push(token);emit Launched(token,market,msg.sender,name,symbol,metadataURI,fee);}
 function tokenCount() external view returns(uint256){return tokens.length;}
}
