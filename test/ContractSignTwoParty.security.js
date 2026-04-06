const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("ContractSignTwoParty security controls", function () {
  async function buildAuthorization(contract, signer, agreementId, authorizationDeadline) {
    const nonce = await contract.signingNonces(signer.address);
    const network = await ethers.provider.getNetwork();

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

    const agreement = await contract.getAgreement(agreementId);
    const value = {
      agreementId,
      documentDigest: agreement.documentDigest,
      signer: signer.address,
      nonce,
      authorizationDeadline
    };

    const signature = await signer.signTypedData(domain, types, value);

    return { nonce, signature };
  }

  async function deployFixture() {
    const [creator, counterparty, attacker] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("ContractSignTwoParty");
    const contract = await Contract.deploy();
    const now = await time.latest();
    const deadline = now + 24 * 60 * 60;
    const digest = ethers.keccak256(ethers.toUtf8Bytes("msa-v1"));

    return { contract, creator, counterparty, attacker, digest, deadline };
  }

  async function createAgreementFixture() {
    const fixture = await deployFixture();

    await fixture.contract.createAgreement(
      fixture.counterparty.address,
      fixture.digest,
      "ipfs://QmSecurityCase",
      fixture.deadline
    );

    return fixture;
  }

  it("rejects zero-address counterparties", async function () {
    const { contract, digest, deadline } = await loadFixture(deployFixture);

    await expect(
      contract.createAgreement(ethers.ZeroAddress, digest, "ipfs://bad", deadline)
    )
      .to.be.revertedWithCustomError(contract, "InvalidCounterparty")
      .withArgs(ethers.ZeroAddress);
  });

  it("blocks unauthorized signers", async function () {
    const { contract, attacker } = await loadFixture(createAgreementFixture);

    await expect(contract.connect(attacker).signAgreement(0))
      .to.be.revertedWithCustomError(contract, "UnauthorizedSigner")
      .withArgs(attacker.address);
  });

  it("prevents double-signing from the same participant", async function () {
    const { contract } = await loadFixture(createAgreementFixture);

    await contract.signAgreement(0);

    await expect(contract.signAgreement(0))
      .to.be.revertedWithCustomError(contract, "AlreadySigned");
  });

  it("marks agreements expired after the signing deadline", async function () {
    const { contract, counterparty, deadline } = await loadFixture(createAgreementFixture);

    await time.increaseTo(deadline + 1);

    await expect(contract.connect(counterparty).signAgreement(0))
      .to.be.revertedWithCustomError(contract, "SigningWindowExpired")
      .withArgs(0);

    await contract.markExpired(0);

    const agreement = await contract.getAgreement(0);
    expect(agreement.status).to.equal(4n);
  });

  it("blocks creator cancellation after the counterparty has signed", async function () {
    const { contract, counterparty } = await loadFixture(createAgreementFixture);

    await contract.connect(counterparty).signAgreement(0);

    await expect(contract.cancelAgreement(0))
      .to.be.revertedWithCustomError(contract, "CannotCancelAfterCounterpartySignature")
      .withArgs(0);
  });

  it("reaches fully signed state only after both parties sign", async function () {
    const { contract, counterparty } = await loadFixture(createAgreementFixture);

    await contract.signAgreement(0);
    let agreement = await contract.getAgreement(0);
    expect(agreement.status).to.equal(1n);

    await contract.connect(counterparty).signAgreement(0);
    agreement = await contract.getAgreement(0);
    expect(agreement.status).to.equal(2n);
    expect(agreement.creatorSigned).to.equal(true);
    expect(agreement.counterpartySigned).to.equal(true);
  });

  it("accepts EIP-712 authorization from a relayer while binding it to nonce and document digest", async function () {
    const { contract, counterparty, attacker, deadline } = await loadFixture(createAgreementFixture);
    const authorizationDeadline = deadline - 60;
    const { signature } = await buildAuthorization(
      contract,
      counterparty,
      0n,
      authorizationDeadline
    );

    await contract.connect(attacker).signAgreementWithAuthorization(
      0,
      counterparty.address,
      authorizationDeadline,
      signature
    );

    const agreement = await contract.getAgreement(0);
    expect(agreement.counterpartySigned).to.equal(true);
    expect(await contract.signingNonces(counterparty.address)).to.equal(1n);
  });

  it("blocks replay of a previously used EIP-712 authorization", async function () {
    const { contract, counterparty, attacker, deadline } = await loadFixture(createAgreementFixture);
    const authorizationDeadline = deadline - 60;
    const { signature } = await buildAuthorization(
      contract,
      counterparty,
      0n,
      authorizationDeadline
    );

    await contract.connect(attacker).signAgreementWithAuthorization(
      0,
      counterparty.address,
      authorizationDeadline,
      signature
    );

    await expect(
      contract.connect(attacker).signAgreementWithAuthorization(
        0,
        counterparty.address,
        authorizationDeadline,
        signature
      )
    )
      .to.be.revertedWithCustomError(contract, "InvalidSignature");
  });

  it("rejects expired EIP-712 signing authorizations", async function () {
    const { contract, counterparty, attacker } = await loadFixture(createAgreementFixture);
    const latest = await time.latest();
    const authorizationDeadline = latest + 5;
    const { signature } = await buildAuthorization(
      contract,
      counterparty,
      0n,
      authorizationDeadline
    );

    await time.increaseTo(authorizationDeadline + 1);

    await expect(
      contract.connect(attacker).signAgreementWithAuthorization(
        0,
        counterparty.address,
        authorizationDeadline,
        signature
      )
    )
      .to.be.revertedWithCustomError(contract, "AuthorizationExpired")
      .withArgs(authorizationDeadline);
  });
});
