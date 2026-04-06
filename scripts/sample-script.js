const hre = require("hardhat");

async function main() {
  const [creator, counterparty] = await hre.ethers.getSigners();
  const Contract = await hre.ethers.getContractFactory("ContractSignTwoParty");
  const agreement = await Contract.deploy();
  await agreement.waitForDeployment();

  const documentDigest = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes("nda-v1:quarterly-revenue-sharing")
  );
  const deadline = BigInt((Math.floor(Date.now() / 1000)) + 3600);

  await agreement.createAgreement(
    counterparty.address,
    documentDigest,
    "ipfs://QmExampleCID",
    deadline
  );

  await agreement.signAgreement(0);
  await agreement.connect(counterparty).signAgreement(0);

  const data = await agreement.getAgreement(0);

  console.log("Agreement deployed to:", await agreement.getAddress());
  console.log("Agreement state:", data);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
