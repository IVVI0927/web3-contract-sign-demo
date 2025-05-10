const hre = require("hardhat");

async function main() {
  const Agreement = await hre.ethers.getContractFactory("Agreement");
  const agreement = await Agreement.deploy();
  await agreement.waitForDeployment(); // ✅ fixed!

  console.log("✅ Agreement deployed to:", agreement.target); // Use .target instead of .address in Ethers v6

  const partyB = "0x000000000000000000000000000000000000dEaD";
  const ipfsHash = "QmExampleIPFSHash";

  await agreement.createAgreement(partyB, ipfsHash);
  const data = await agreement.getAgreement(0);

  console.log("📄 Agreement data:", data);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});