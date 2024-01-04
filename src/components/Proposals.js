import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { ethers } from "ethers";

const Proposals = ({
  provider,
  dao,
  proposals,
  quorum,
  votedFor,
  votedAgainst,
  setIsLoading,
}) => {
  const voteHandler = async (id) => {
    // const votedFor = await dao.votedFor(account, id);
    // setVotedFor(votedFor);
    try {
      const signer = await provider.getSigner();
      const transaction = await dao.connect(signer).vote(id);
      await transaction.wait();
    } catch {
      window.alert("User rejected or transaction reverted");
    }

    setIsLoading(true);
  };

  const voteAgainstHandler = async (id) => {
    try {
      const signer = await provider.getSigner();
      const transaction = await dao.connect(signer).voteAgainst(id);
      await transaction.wait();
    } catch {
      window.alert("User rejected or transaction reverted");
    }

    setIsLoading(true);
  };

  const finalizeHandler = async (id) => {
    try {
      const signer = await provider.getSigner();
      const transaction = await dao.connect(signer).finalizeProposal(id);
      await transaction.wait();
    } catch {
      window.alert("User rejected or transaction reverted");
    }

    setIsLoading(true);
  };

  return (
    <Table striped bordered hover responsive>
      <thead className="text-center">
        <tr>
          <th>#</th>
          <th>Proposal Name</th>
          <th>Proposal Description</th>
          <th>Recipient Address</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Votes For</th>
          <th>Votes Againts</th>
          <th>Cast Vote For</th>
          <th>Cast Vote Against</th>
          <th>Finalize</th>
        </tr>
      </thead>
      <tbody>
        {proposals.map((proposal, index) => (
          <tr key={index}>
            <td>{proposal.id.toString()}</td>
            <td>{proposal.name}</td>
            <td>{proposal.description}</td>
            <td>{proposal.recipient}</td>
            <td>{ethers.formatUnits(proposal.amount, "ether")} ETH</td>
            <td>{proposal.finalized ? "Approved" : "In Progress"}</td>
            <td>{ethers.formatUnits(proposal.votesFor.toString())}</td>
            <td className="text-center">{proposal.votesAgainst.toString()}</td>
            <td>
              {!proposal.finalized && !votedFor && !votedAgainst && (
                <Button
                  variant="primary"
                  style={{ width: "100%" }}
                  onClick={() => voteHandler(proposal.id)}
                >
                  Vote
                </Button>
              )}
            </td>
            <td>
              {!proposal.finalized && !votedFor && !votedAgainst && (
                <Button
                  variant="primary"
                  style={{ width: "100%" }}
                  onClick={() => voteAgainstHandler(proposal.id)}
                >
                  Vote
                </Button>
              )}
            </td>
            <td>
              {!proposal.finalized && proposal.votesFor > quorum && (
                <Button
                  variant="primary"
                  style={{ width: "100%" }}
                  onClick={() => finalizeHandler(proposal.id)}
                >
                  Finalize
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

export default Proposals;
