import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { ethers } from "ethers";

// Components
import Navigation from "./Navigation";
import Create from "./Create";
import Proposals from "./Proposals";
import Loading from "./Loading";

// ABIs: Import your contract ABIs here
import DAO_ABI from "../abis/DAO.json";

// Config: Import your network config here
import config from "../config.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [dao, setDao] = useState(null);
  const [treasuryBalance, setTreasuryBalance] = useState(0);
  const [recipientBalance, setRecipientBalance] = useState(0);

  const [account, setAccount] = useState(null);

  const [proposals, setProposals] = useState(null);
  const [quorum, setQuorum] = useState(null);

  const [votedFor, setVotedFor] = useState(false);
  const [votedAgainst, setVotedAgainst] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadBlockchainData = async () => {
    // Initiate provider
    const provider = new ethers.BrowserProvider(window.ethereum);
    setProvider(provider);

    // Initiate contracts
    const dao = new ethers.Contract(
      config[31337].dao.address,
      DAO_ABI,
      provider
    );
    setDao(dao);

    // Fetch treasury balance
    let treasuryBalance = await provider.getBalance(await dao.getAddress());
    treasuryBalance = ethers.formatUnits(treasuryBalance, 18);
    setTreasuryBalance(treasuryBalance);

    // Fetch accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = ethers.getAddress(accounts[0]);
    setAccount(account);

    // Fetch proposals count
    const count = await dao.proposalCount();
    const items = [];

    for (var i = 0; i < count; i++) {
      const proposal = await dao.proposals(i + 1);

      // fetch recipient account balance
      let recipientBalance = await provider.getBalance(
        await proposal.recipient
      );
      recipientBalance = ethers.formatUnits(recipientBalance, 18);
      // proposal.recipient = recipientBalance;
      setRecipientBalance(recipientBalance);
      items.push(proposal);
    }

    setProposals(items);

    //Fetch votedFor
    const votedFor = await dao.votedFor(account, count);
    setVotedFor(votedFor);
    //Fetch votedAgaianst
    const votedAgainst = await dao.votedAgainst(account, count);
    setVotedAgainst(votedAgainst);

    // Fetch quorum
    setQuorum(await dao.quorum());

    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData();
    }
  }, [isLoading]);

  return (
    <Container>
      <Navigation account={account} />

      <h1 className="my-4 text-center">Welcome to our DAO!</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Create provider={provider} dao={dao} setIsLoading={setIsLoading} />

          <hr />

          <p className="text-center">
            <strong>Treasury Balance:</strong> {treasuryBalance} ETH
          </p>
          <p className="text-center">
            <strong>Quorum:</strong> {quorum.toString()}
          </p>
          <p className="text-center">
            <strong>Recipient's Balance:</strong> {recipientBalance} ETH
          </p>

          <hr />

          <Proposals
            provider={provider}
            dao={dao}
            proposals={proposals}
            quorum={quorum}
            account={account}
            votedFor={votedFor}
            votedAgainst={votedAgainst}
            setIsLoading={setIsLoading}
          />
        </>
      )}
    </Container>
  );
}

export default App;
