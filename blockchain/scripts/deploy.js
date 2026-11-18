const hre = require("hardhat");

async function main() {
  console.log("Deploying ChainOfCustody digital forensic smart contract...");

  const ChainOfCustody = await hre.ethers.getContractFactory("ChainOfCustody");
  const contract = await ChainOfCustody.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`ChainOfCustody contract deployed successfully to: ${address}`);
  console.log("Update CONTRACT_ADDRESS in your .env file with this address.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
