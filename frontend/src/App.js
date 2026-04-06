/* global BigInt */
import React, { useState } from "react";
import { ethers } from "ethers";
import "./App.css";
import { uploadFileToIPFS } from "./utils/uploadToIPFS";
import { digestFile, shortenHex } from "./security/documentDigest";
import {
  assessTransactionRisk,
  buildDeadlineTimestamp,
  formatStatus,
  validateAgreementId,
  validateCreateAgreementInput
} from "./security/transactionGuards";

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS || "";

const contractABI = [
  "function createAgreement(address _counterparty, bytes32 _documentDigest, string _documentUri, uint64 _signingDeadline) returns (uint256)",
  "function signAgreement(uint256 _agreementId)",
  "function cancelAgreement(uint256 _agreementId)",
  "function canSign(uint256 _agreementId, address _account) view returns (bool)",
  "function getAgreement(uint256 _agreementId) view returns (address creator, address counterparty, bytes32 documentDigest, string documentUri, uint64 createdAt, uint64 signingDeadline, bool creatorSigned, bool counterpartySigned, uint8 status)"
];

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [documentUri, setDocumentUri] = useState("");
  const [documentDigest, setDocumentDigest] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("24");
  const [contract, setContract] = useState(null);
  const [agreementId, setAgreementId] = useState("0");
  const [agreementData, setAgreementData] = useState(null);
  const [securityMessages, setSecurityMessages] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setSecurityMessages(["MetaMask is required to run this security demo."]);
      return;
    }

    if (!contractAddress) {
      setSecurityMessages([
        "Missing REACT_APP_CONTRACT_ADDRESS. Configure the deployed contract address before connecting."
      ]);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const connectedAddress = await signer.getAddress();

      setWalletAddress(connectedAddress);
      setChainId(network.chainId.toString());
      setContract(new ethers.Contract(contractAddress, contractABI, signer));
      setSecurityMessages([]);
      setStatusMessage(`Connected ${connectedAddress} on chain ID ${network.chainId.toString()}.`);
    } catch (error) {
      setSecurityMessages([`Wallet connection failed: ${error.message}`]);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setSecurityMessages([]);

    try {
      const digest = await digestFile(file);
      setDocumentDigest(digest);

      try {
        const cid = await uploadFileToIPFS(file);
        setDocumentUri(`ipfs://${cid}`);
        setStatusMessage(`Document hashed and uploaded. Digest ${shortenHex(digest)} mapped to ${cid}.`);
      } catch (uploadError) {
        setStatusMessage(
          `Document hashed locally as ${shortenHex(digest)}. IPFS upload skipped: ${uploadError.message}`
        );
      }
    } catch (error) {
      setSecurityMessages([`Failed to hash document: ${error.message}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const createAgreement = async () => {
    if (!contract) {
      setSecurityMessages(["Connect a wallet before creating an agreement."]);
      return;
    }

    const inputErrors = validateCreateAgreementInput({
      walletAddress,
      counterparty,
      documentDigest,
      documentUri,
      deadlineHours
    });

    if (inputErrors.length > 0) {
      setSecurityMessages(inputErrors);
      return;
    }

    try {
      const deadline = buildDeadlineTimestamp(deadlineHours);
      const gasEstimate = await contract.createAgreement.estimateGas(
        counterparty,
        documentDigest,
        documentUri,
        deadline
      );
      const feeData = await contract.runner.provider.getFeeData();
      const txRisk = assessTransactionRisk({
        chainId,
        gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas,
        value: 0n
      });

      if (txRisk.errors.length > 0) {
        setSecurityMessages(txRisk.errors);
        return;
      }

      setSecurityMessages(txRisk.warnings);

      const tx = await contract.createAgreement(
        counterparty,
        documentDigest,
        documentUri,
        deadline
      );
      await tx.wait();
      setStatusMessage(
        `Agreement submitted with digest ${shortenHex(documentDigest)} and gas estimate ${gasEstimate.toString()}.`
      );
    } catch (error) {
      setSecurityMessages([`Agreement creation failed: ${error.shortMessage || error.message}`]);
    }
  };

  const loadAgreement = async () => {
    if (!contract) {
      setSecurityMessages(["Connect a wallet before querying agreement state."]);
      return;
    }

    const inputErrors = validateAgreementId(agreementId);
    if (inputErrors.length > 0) {
      setSecurityMessages(inputErrors);
      return;
    }

    try {
      const data = await contract.getAgreement(BigInt(agreementId));
      const canCurrentSignerSign = walletAddress
        ? await contract.canSign(BigInt(agreementId), walletAddress)
        : false;

      setAgreementData({
        creator: data.creator,
        counterparty: data.counterparty,
        documentDigest: data.documentDigest,
        documentUri: data.documentUri,
        createdAt: Number(data.createdAt),
        signingDeadline: Number(data.signingDeadline),
        creatorSigned: data.creatorSigned,
        counterpartySigned: data.counterpartySigned,
        status: formatStatus(data.status),
        canCurrentSignerSign
      });
      setSecurityMessages([]);
      setStatusMessage(`Loaded agreement ${agreementId}.`);
    } catch (error) {
      setSecurityMessages([`Agreement lookup failed: ${error.shortMessage || error.message}`]);
    }
  };

  const signAgreement = async () => {
    if (!contract) {
      setSecurityMessages(["Connect a wallet before signing."]);
      return;
    }

    const inputErrors = validateAgreementId(agreementId);
    if (inputErrors.length > 0) {
      setSecurityMessages(inputErrors);
      return;
    }

    try {
      const gasEstimate = await contract.signAgreement.estimateGas(BigInt(agreementId));
      const feeData = await contract.runner.provider.getFeeData();
      const txRisk = assessTransactionRisk({
        chainId,
        gasEstimate,
        maxFeePerGas: feeData.maxFeePerGas,
        value: 0n
      });

      if (txRisk.errors.length > 0) {
        setSecurityMessages(txRisk.errors);
        return;
      }

      setSecurityMessages(txRisk.warnings);

      const tx = await contract.signAgreement(BigInt(agreementId));
      await tx.wait();
      setStatusMessage(`Agreement ${agreementId} signed after passing transaction checks.`);
      await loadAgreement();
    } catch (error) {
      setSecurityMessages([`Signature failed: ${error.shortMessage || error.message}`]);
    }
  };

  const cancelAgreement = async () => {
    if (!contract) {
      setSecurityMessages(["Connect a wallet before cancelling."]);
      return;
    }

    const inputErrors = validateAgreementId(agreementId);
    if (inputErrors.length > 0) {
      setSecurityMessages(inputErrors);
      return;
    }

    try {
      const tx = await contract.cancelAgreement(BigInt(agreementId));
      await tx.wait();
      setStatusMessage(`Agreement ${agreementId} cancelled by creator.`);
      await loadAgreement();
    } catch (error) {
      setSecurityMessages([`Cancellation failed: ${error.shortMessage || error.message}`]);
    }
  };

  return (
    <div className="app-shell">
      <div className="hero-card">
        <p className="eyebrow">Blockchain Security Engineering Demo</p>
        <h1>Secure Document Signing Workflow</h1>
        <p className="hero-copy">
          This demo focuses on safer contract interaction: document integrity checks,
          signer authorization, deadline enforcement, and transaction risk warnings.
        </p>
        <button className="primary-button" onClick={connectWallet}>
          {walletAddress ? "Reconnect Wallet" : "Connect Wallet"}
        </button>
        <div className="meta-grid">
          <div className="meta-card">
            <span>Wallet</span>
            <strong>{walletAddress ? shortenHex(walletAddress) : "Not connected"}</strong>
          </div>
          <div className="meta-card">
            <span>Chain ID</span>
            <strong>{chainId || "Unknown"}</strong>
          </div>
          <div className="meta-card">
            <span>Contract</span>
            <strong>{contractAddress ? shortenHex(contractAddress) : "Missing env var"}</strong>
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Create Protected Agreement</h2>
          <label>
            Counterparty Address
            <input
              type="text"
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <label>
            Document URI
            <input
              type="text"
              value={documentUri}
              onChange={(event) => setDocumentUri(event.target.value)}
              placeholder="ipfs://..."
            />
          </label>
          <label>
            Document SHA-256 Digest
            <input
              type="text"
              value={documentDigest}
              onChange={(event) => setDocumentDigest(event.target.value)}
              placeholder="0x..."
            />
          </label>
          <label>
            Signing Window (hours)
            <input
              type="number"
              min="1"
              max="720"
              value={deadlineHours}
              onChange={(event) => setDeadlineHours(event.target.value)}
            />
          </label>
          <label className="file-input">
            Upload File to Hash
            <input type="file" onChange={handleFileChange} />
          </label>
          <button className="primary-button" onClick={createAgreement} disabled={isUploading}>
            {isUploading ? "Hashing..." : "Create Agreement"}
          </button>
        </section>

        <section className="panel">
          <h2>Agreement Monitoring</h2>
          <label>
            Agreement ID
            <input
              type="text"
              value={agreementId}
              onChange={(event) => setAgreementId(event.target.value)}
              placeholder="0"
            />
          </label>
          <div className="action-row">
            <button className="secondary-button" onClick={loadAgreement}>
              Load Agreement
            </button>
            <button className="secondary-button" onClick={signAgreement}>
              Sign Agreement
            </button>
            <button className="danger-button" onClick={cancelAgreement}>
              Cancel
            </button>
          </div>

          {agreementData ? (
            <div className="agreement-card">
              <p><strong>Status:</strong> {agreementData.status}</p>
              <p><strong>Creator:</strong> {agreementData.creator}</p>
              <p><strong>Counterparty:</strong> {agreementData.counterparty}</p>
              <p><strong>Document Digest:</strong> {agreementData.documentDigest}</p>
              <p><strong>Document URI:</strong> {agreementData.documentUri}</p>
              <p><strong>Creator Signed:</strong> {agreementData.creatorSigned ? "Yes" : "No"}</p>
              <p><strong>Counterparty Signed:</strong> {agreementData.counterpartySigned ? "Yes" : "No"}</p>
              <p><strong>Current Wallet Can Sign:</strong> {agreementData.canCurrentSignerSign ? "Yes" : "No"}</p>
              <p><strong>Deadline:</strong> {new Date(agreementData.signingDeadline * 1000).toLocaleString()}</p>
            </div>
          ) : (
            <p className="muted-copy">No agreement loaded yet.</p>
          )}
        </section>

        <section className="panel">
          <h2>Security Analysis</h2>
          <ul className="signal-list">
            <li>Transactions are pre-checked for unexpected chain ID and abnormal gas settings.</li>
            <li>Document integrity is anchored on-chain with a SHA-256 digest instead of trusting only a URI.</li>
            <li>IPFS upload secrets are read from environment variables instead of hard-coded in source.</li>
            <li>Signing is limited to the creator and named counterparty, with deadline-based expiry.</li>
          </ul>
          {statusMessage ? <p className="status-banner">{statusMessage}</p> : null}
          {securityMessages.length > 0 ? (
            <div className="warning-card">
              <h3>Security Messages</h3>
              {securityMessages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No current validation warnings.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
