// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract ProductTreasury {
 enum State{PROPOSED,FUNDED,SUBMITTED,APPROVED,PAID,REJECTED,CANCELLED}
 struct Milestone{address recipient;uint256 budget;State state;bytes32 deliverable;uint8 approvals;}
 address public immutable proposer;mapping(address=>bool) public reviewer;Milestone[] public milestones;mapping(uint256=>mapping(address=>bool)) public signed;uint256 public reserved;
 event Status(uint256 indexed id,State state,bytes32 evidence);
 constructor(address p,address[3] memory reviewers){require(p!=address(0),"proposer");proposer=p;for(uint i;i<3;i++){require(reviewers[i]!=address(0)&&!reviewer[reviewers[i]],"reviewer");reviewer[reviewers[i]]=true;}}
 receive() external payable{}
 function propose(address to,uint256 budget) external returns(uint256 id){require(msg.sender==proposer&&to!=address(0)&&budget>0,"proposal");id=milestones.length;milestones.push(Milestone(to,budget,State.PROPOSED,0,0));emit Status(id,State.PROPOSED,0);}
 function fund(uint256 id) external {Milestone storage m=milestones[id];require(m.state==State.PROPOSED&&address(this).balance-reserved>=m.budget,"funds");reserved+=m.budget;m.state=State.FUNDED;emit Status(id,m.state,0);}
 function submit(uint256 id,bytes32 evidence) external {Milestone storage m=milestones[id];require(msg.sender==proposer&&m.state==State.FUNDED&&evidence!=0,"submission");m.deliverable=evidence;m.state=State.SUBMITTED;emit Status(id,m.state,evidence);}
 function approve(uint256 id) external {Milestone storage m=milestones[id];require(reviewer[msg.sender]&&m.state==State.SUBMITTED&&!signed[id][msg.sender],"approval");signed[id][msg.sender]=true;if(++m.approvals>=2)m.state=State.APPROVED;emit Status(id,m.state,m.deliverable);}
 function reject(uint256 id) external {Milestone storage m=milestones[id];require(reviewer[msg.sender]&&m.state==State.SUBMITTED,"review");m.state=State.REJECTED;reserved-=m.budget;emit Status(id,m.state,m.deliverable);}
 function cancel(uint256 id) external {Milestone storage m=milestones[id];require(msg.sender==proposer&&(m.state==State.PROPOSED||m.state==State.FUNDED),"cancel");if(m.state==State.FUNDED)reserved-=m.budget;m.state=State.CANCELLED;emit Status(id,m.state,0);}
 function pay(uint256 id) external {Milestone storage m=milestones[id];require(m.state==State.APPROVED,"approval");m.state=State.PAID;reserved-=m.budget;(bool ok,)=m.recipient.call{value:m.budget}("");require(ok,"payment");emit Status(id,m.state,m.deliverable);}
}
