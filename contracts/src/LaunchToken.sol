// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract LaunchToken {
 string public name; string public symbol; uint8 public constant decimals=18;
 uint256 public totalSupply; mapping(address=>uint256) public balanceOf;
 mapping(address=>mapping(address=>uint256)) public allowance;
 event Transfer(address indexed from,address indexed to,uint256 amount);
 event Approval(address indexed owner,address indexed spender,uint256 amount);
 constructor(string memory n,string memory s,address market){name=n;symbol=s;totalSupply=1_000_000_000 ether;balanceOf[market]=totalSupply;emit Transfer(address(0),market,totalSupply);}
 function approve(address s,uint256 a) external returns(bool){allowance[msg.sender][s]=a;emit Approval(msg.sender,s,a);return true;}
 function transfer(address t,uint256 a) external returns(bool){_transfer(msg.sender,t,a);return true;}
 function transferFrom(address f,address t,uint256 a) external returns(bool){uint256 allowed=allowance[f][msg.sender];if(allowed!=type(uint256).max){require(allowed>=a,"allowance");allowance[f][msg.sender]=allowed-a;}_transfer(f,t,a);return true;}
 function burn(uint256 a) external {require(balanceOf[msg.sender]>=a,"balance");balanceOf[msg.sender]-=a;totalSupply-=a;emit Transfer(msg.sender,address(0),a);}
 function _transfer(address f,address t,uint256 a) internal {require(t!=address(0)&&balanceOf[f]>=a,"transfer");balanceOf[f]-=a;balanceOf[t]+=a;emit Transfer(f,t,a);}
}
