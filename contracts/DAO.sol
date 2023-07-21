//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import './Token.sol';

contract DAO {
    address owner;
    Token public token;
    uint256 public quorum;

    struct Proposal {
        uint256 id;
        string name;
        uint256 amount;
        address payable recipient;
        uint256 votes;
        bool finalized;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) votes;


    event Propose(
        uint256 id,
        uint256 amount,
        address recipient,
        address creator
    );

    event Vote(uint256 _id, address _investor);
    event Finalize(uint256 _id);

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }
//Allow contract to receive eth
    receive() external payable {}

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, 'Must be token holder');
        _;
    }

    function createProposal(
        string memory _name, 
        uint256 _amount, 
        address payable _recipient
        ) external onlyInvestor {
            require(address(this).balance >= _amount );
        proposalCount ++;
        //create proposal
        proposals[proposalCount] = Proposal(
            proposalCount, _name, 
            _amount, _recipient, 
            0, 
            false);

            emit Propose(proposalCount, _amount, _recipient, msg.sender);
    }

     // Vote for proposal
    function vote(uint256 _id) external onlyInvestor {
        // Fetch proposal from mapping by id
        // creates a variable called proposal of data type Proposal(struct) where it stores the id of the proposal
        // the investor is voting for.
        Proposal storage proposal = proposals[_id];
        // Don't let investor vote twice
        require(!votes[msg.sender][_id], 'Already voted');
        // update votes for proposal with _id by the balance amount of the caller
       proposal.votes += token.balanceOf(msg.sender);
        // track user has voted
        votes[msg.sender][_id] = true;
        //emit an event
        emit Vote(_id, msg.sender);
    }

    //Finalize proposal & transfer funds
    function finalizeProposal(uint256 _id) external onlyInvestor {
         // Fetch proposal
        Proposal storage proposal = proposals[_id];
        //insure the proposal is not finalized
        require(proposal.finalized == false, 'proposal already finalized');

         //Mark proposal as finalized
         proposal.finalized = true;

         //Check that proposal has enough votes
         require(proposal.votes >= quorum, 'must reach quorum to finalize proposal');

         //Check the contract has enough ether
         require(address(this).balance >= proposal.amount);

         //Transfer the funds
         (bool sent, ) = proposal.recipient.call{value: proposal.amount}(" ");
         require(sent);

         //Emit event
         emit Finalize(_id);
    }
}
