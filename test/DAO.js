const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.parseUnits(n.toString(), "ether");
};

const ether = tokens;

describe("DAO", () => {
  let token, dao;
  let deployer,
    funder,
    investor1,
    investor2,
    investor3,
    investor4,
    investor5,
    recipient,
    user;
  let transaction;

  beforeEach(async () => {
    //Set up accounts
    let accounts = await ethers.getSigners();
    deployer = accounts[0];
    funder = accounts[1];
    investor1 = accounts[2];
    investor2 = accounts[3];
    investor3 = accounts[4];
    investor4 = accounts[5];
    investor5 = accounts[6];
    recipient = accounts[7];
    user = accounts[8];

    //Deploy Token
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy("GASton", "GSNT", "1000000");

    // Send tokens to investors - each one gets 20%
    transaction = await token
      .connect(deployer)
      .transfer(investor1.getAddress(), tokens(200000));
    await transaction.wait();

    transaction = await token
      .connect(deployer)
      .transfer(investor2.getAddress(), tokens(200000));
    await transaction.wait();

    transaction = await token
      .connect(deployer)
      .transfer(investor3.getAddress(), tokens(200000));
    await transaction.wait();

    transaction = await token
      .connect(deployer)
      .transfer(investor4.getAddress(), tokens(200000));
    await transaction.wait();

    transaction = await token
      .connect(deployer)
      .transfer(investor5.getAddress(), tokens(200000));
    await transaction.wait();

    // Deploy DAO
    // Set Quorum to > 50% of token total supply.
    // 500k tokens + 1 wei, i.e., 500000000000000000000001
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(token.getAddress(), "500000000000000000000001");
    // Funder sends 100 Ether to DAO treasury for Governance
    await funder.sendTransaction({
      to: dao.getAddress(),
      value: ether(100),
    });
  });

  describe("Deployment", () => {
    it("sends ether to the DAO treasury", async () => {
      expect(await ethers.provider.getBalance(dao.getAddress())).to.equal(
        ether(100)
      );
    });

    it("returns token address", async () => {
      expect(await dao.token()).to.equal(await token.getAddress());
    });

    it("returns a quorum", async () => {
      expect(await dao.quorum()).to.equal("500000000000000000000001");
    });
  });

  describe("Proposal creation", () => {
    let transaction, result;
    describe("Success", () => {
      beforeEach(async () => {
        transaction = await dao
          .connect(investor1)
          .createProposal("Proposal 1", ether(100), recipient.getAddress());
        result = await transaction.wait();
      });

      it("updates proposal count", async () => {
        expect(await dao.proposalCount()).to.equal(1);
      });

      it("updates proposal mapping", async () => {
        const proposal = await dao.proposals(1);

        expect(proposal.id).to.equal(1);
        expect(proposal.amount).to.equal(ether(100));
        expect(proposal.recipient).to.equal(await recipient.getAddress());
      });

      it("emits a propose event", async () => {
        await expect(transaction)
          .to.emit(dao, "Propose")
          .withArgs(
            1,
            ether(100),
            recipient.getAddress,
            await investor1.getAddress()
          );
      });
    });

    describe("Failure", () => {
      it("rejects invalid amount", async () => {
        await expect(
          dao
            .connect(investor1)
            .createProposal("Proposal 1", ether(1000), recipient.getAddress())
        ).to.be.reverted;
      });

      it("rejects non-investor ", async () => {
        await expect(
          dao
            .connect(user)
            .createProposal("Proposal 1", ether(100), recipient.getAddress())
        ).to.be.reverted;
      });
    });
  });

  describe("Voting", () => {
    let transaction, result;

    beforeEach(async () => {
      transaction = await dao
        .connect(investor1)
        .createProposal("Proposal 1", ether(100), recipient.getAddress());
      result = await transaction.wait();
    });

    describe("Success", () => {
      beforeEach(async () => {
        transaction = await dao.connect(investor1).vote(1);
        result = await transaction.wait();
      });

      it("updates vote count", async () => {
        const proposal = await dao.proposals(1);
        expect(proposal.votes).to.equal(tokens(200000));
      });

      it("emits a vote event", async () => {
        await expect(transaction)
          .to.emit(dao, "Vote")
          .withArgs(1, await investor1.getAddress());
      });
    });

    describe("Failure", () => {
      it("rejects non-investor ", async () => {
        await expect(dao.connect(user).vote(1)).to.be.reverted;
      });

      it("rejects double voting ", async () => {
        transaction = await dao.connect(investor1).vote(1);
        await transaction.wait();

        await expect(dao.connect(investor1).vote(1)).to.be.reverted;
      });
    });
  });

  describe("Govenance", () => {
    let transaction, result;

    describe("Success", () => {
      beforeEach(async () => {
        // create proposal
        transaction = await dao
          .connect(investor1)
          .createProposal("Proposal 1", ether(100), recipient.getAddress());
        result = await transaction.wait();
        // Vote
        transaction = await dao.connect(investor1).vote(1);
        result = await transaction.wait();

        transaction = await dao.connect(investor2).vote(1);
        result = await transaction.wait();

        transaction = await dao.connect(investor3).vote(1);
        result = await transaction.wait();

        //Finalize proposal
        transaction = await dao.connect(investor1).finalizeProposal(1);
        await transaction.wait();
      });

      it("transfer funds to recipient", async () => {
        expect(
          await ethers.provider.getBalance(recipient.getAddress())
        ).to.equal(tokens(10100));
      });

      it("updates the proposal to finalize", async () => {
        const proposal = await dao.proposals(1);
        expect(proposal.finalized).to.equal(true);
      });

      it("emits finalize event", async () => {
        await expect(transaction).to.emit(dao, "Finalize").withArgs(1);
      });
    });
    describe("Failure", () => {
      beforeEach(async () => {
        // create proposal
        transaction = await dao
          .connect(investor1)
          .createProposal("Proposal 1", ether(100), recipient.getAddress());
        result = await transaction.wait();
        // Vote
        transaction = await dao.connect(investor1).vote(1);
        result = await transaction.wait();

        transaction = await dao.connect(investor2).vote(1);
        result = await transaction.wait();
      });

      it("rejects finalization if not enough votes", async () => {
        await expect(dao.connect(investor1).finalizeProposal(1)).to.be.reverted;
      });

      it("rejects finalization from non-investor", async () => {
        transaction = await dao.connect(investor3).vote(1);
        await transaction.wait();

        await expect(dao.connect(user).finalizeProposal(1)).to.be.reverted;
      });

      it("rejects ptoposal if already finalized", async () => {
        //vote 3
        transaction = await dao.connect(investor3).vote(1);
        await transaction.wait();
        // finalize
        transaction = await dao.connect(investor1).finalizeProposal(1);
        await transaction.wait();
        // try to finalized again
        await expect(dao.connect(investor1).finalizeProposal(1)).to.reverted;
      });
    });
  });
});
