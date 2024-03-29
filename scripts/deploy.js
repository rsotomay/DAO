// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const NAME = "GASton";
  const SYMBOL = "GSNT";
  const MAX_SUPPLY = "1000000";

  // Deploy Token
  const Token = await hre.ethers.deployContract("Token", [
    NAME,
    SYMBOL,
    MAX_SUPPLY,
  ]);
  await Token.waitForDeployment();
  console.log(`Token Deployed to: ${Token.target}\n`);

  //Deploy DAO
  const DAO = await hre.ethers.deployContract("DAO", [
    Token.target,
    "500000000000000000000001",
  ]);
  await DAO.waitForDeployment();
  console.log(`DAO Deployed to: ${DAO.target}\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
