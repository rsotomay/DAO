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
        string description;
        uint256 amount;
        address payable recipient;
        uint256 votesFor;
        uint256 votesAgainst;
        bool finalized;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public votes;
    mapping(address => mapping(uint256 => bool)) public _votesAgainst;


    event Propose(
        uint256 id,
        uint256 amount,
        address recipient,
        address creator
    );

    event VoteFor(uint256 _id, address _investor);
    event VoteAgainst(uint256 _id, address _investor);
    event Finalize(uint256 _id);

    constructor(Token _token, uint256 _quorum) {
        owner = msg.sender;
        token = _token;
        quorum = _quorum;
    }
//Allow contract to receive Eth
    receive() external payable {}

    modifier onlyInvestor() {
        require(token.balanceOf(msg.sender) > 0, 'Must be token holder');
        _;
    }

    function votedFor(address _address, uint256 _id) public view returns (bool) {
        return votes[_address][_id];
    }

    function votedAgainst(address _address, uint256 _id) public view returns (bool) {
        return _votesAgainst[_address][_id];
    }

    function createProposal(
        string memory _name, 
        string memory _description,
        uint256 _amount, 
        address payable _recipient
        ) external onlyInvestor {
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(address(this).balance >= _amount );
        proposalCount ++;
        //create proposal
        proposals[proposalCount] = Proposal(
            proposalCount, _name,
            _description, 
            _amount, 
            _recipient, 
            0,
            0, 
            false);

            emit Propose(proposalCount, _amount, _recipient, msg.sender);
    }

    function doubleVote(uint256 _id) internal view {
        require(votes[msg.sender][_id] == false, 'Already voted');
        require(_votesAgainst[msg.sender][_id] == false, 'Already voted');
    }

     // Vote for proposal
    function vote(uint256 _id) external onlyInvestor {
        doubleVote(_id);
        // Fetch proposal from mapping by id
        // creates a variable called proposal of data type Proposal(struct) where it stores the id of the proposal
        // the investor is voting for.
        Proposal storage proposal = proposals[_id];
        // update votes for proposal with _id by the balance amount of the caller
       proposal.votesFor += token.balanceOf(msg.sender);
        // track user has voted
        votes[msg.sender][_id] = true;
        //emit an event
        emit VoteFor(_id, msg.sender);
    }

    function voteAgainst(uint256 _id) external onlyInvestor {
        doubleVote(_id);
        Proposal storage proposal = proposals[_id];
        proposal.votesAgainst ++;
        if (proposal.votesFor >= token.balanceOf(msg.sender)) {
        proposal.votesFor -= token.balanceOf(msg.sender);
        }
        _votesAgainst[msg.sender][_id] = true;
        emit VoteAgainst(_id, msg.sender);
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
         require(proposal.votesFor >= quorum, 'must reach quorum to finalize proposal');
         require(proposal.votesFor > proposal.votesAgainst, 'Proposal has not been approvd');

         //Check the contract has enough ether
         require(address(this).balance >= proposal.amount);

         //Transfer the funds
         (bool sent, ) = proposal.recipient.call{value: proposal.amount}(" ");
         require(sent);

         //Emit event
         emit Finalize(_id);
    }
}
