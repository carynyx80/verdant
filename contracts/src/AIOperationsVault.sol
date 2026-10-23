// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract AIOperationsVault {
 address public immutable operator;mapping(address=>bool) public reviewer;uint256 public paid;
 struct Expense{uint256 amount;bytes32 invoice;uint8 approvals;bool settled;}
 mapping(bytes32=>Expense) public expenses;mapping(bytes32=>mapping(address=>bool)) public approved;
 event ExpenseApproved(bytes32 indexed id,bytes32 indexed invoice,uint256 amount,address reviewer);
 event ExpensePaid(bytes32 indexed id,address indexed operator,uint256 amount);
 constructor(address payee,address[3] memory r){require(payee!=address(0),"operator");operator=payee;for(uint i;i<3;i++){require(r[i]!=address(0)&&!reviewer[r[i]],"reviewers");reviewer[r[i]]=true;}}
 receive() external payable{}
 function approve(bytes32 id,bytes32 invoice,uint256 amount) external {require(reviewer[msg.sender]&&!approved[id][msg.sender]&&id!=0&&invoice!=0&&amount>0,"authorization");Expense storage e=expenses[id];require(!e.settled&&(e.amount==0||(e.amount==amount&&e.invoice==invoice)),"expense");e.amount=amount;e.invoice=invoice;e.approvals++;approved[id][msg.sender]=true;emit ExpenseApproved(id,invoice,amount,msg.sender);}
 function settle(bytes32 id) external {Expense storage e=expenses[id];require(e.approvals>=2&&!e.settled,"approvals");e.settled=true;paid+=e.amount;(bool ok,)=operator.call{value:e.amount}("");require(ok,"payment");emit ExpensePaid(id,operator,e.amount);}
}
