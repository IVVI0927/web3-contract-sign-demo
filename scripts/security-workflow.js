const { ethers, network } = require("hardhat");

async function main() {
  const [creator, counterparty, attacker] = await ethers.getSigners();
  const Contract = await ethers.getContractFactory("ContractSignTwoParty");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const network = await ethers.provider.getNetwork();

  const now = Math.floor(Date.now() / 1000);
  const documentDigest = ethers.keccak256(
    ethers.toUtf8Bytes("msa-v2:customer-data-processing")
  );

  await contract.createAgreement(
    counterparty.address,
    documentDigest,
    "ipfs://QmSecurityExample",
    BigInt(now + 3600)
  );

  console.log("Deployed:", await contract.getAddress());
  console.log("Created agreement 0 with deadline in 1 hour");

  try {
    await contract.connect(attacker).signAgreement(0);
  } catch (error) {
    console.log("Blocked unauthorized signer:", error.shortMessage || error.message);
  }

  const authorizationDeadline = BigInt(now + 900);
  const nonce = await contract.signingNonces(counterparty.address);
  const domain = {
    name: "ContractSignTwoParty",
    version: "1",
    chainId: Number(network.chainId),
    verifyingContract: await contract.getAddress()
  };
  const types = {
    SigningAuthorization: [
      { name: "agreementId", type: "uint256" },
      { name: "documentDigest", type: "bytes32" },
      { name: "signer", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "authorizationDeadline", type: "uint256" }
    ]
  };
  const value = {
    agreementId: 0,
    documentDigest,
    signer: counterparty.address,
    nonce,
    authorizationDeadline
  };
  const signature = await counterparty.signTypedData(domain, types, value);

  await contract.signAgreement(0);
  await contract.connect(attacker).signAgreementWithAuthorization(
    0,
    counterparty.address,
    authorizationDeadline,
    signature
  );

  const agreement = await contract.getAgreement(0);
  console.log("Agreement status after valid signatures:", agreement.status);
  console.log("Counterparty nonce after relay authorization:", await contract.signingNonces(counterparty.address));
  console.log("Executed on chain:", network.name);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
