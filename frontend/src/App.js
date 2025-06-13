import { uploadFileToIPFS } from "./utils/uploadToIPFS";
import React, { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [signers, setSigners] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [contract, setContract] = useState(null);
  const [queryId, setQueryId] = useState("0");
  const [signersStatus, setSignersStatus] = useState(null);

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // ← 替换成你的合约地址！

  const contractABI = [
  "function createContract(address[] _signers, string _ipfsHash) public returns (uint256)",
  "function signContract(uint256 _id) public",
  "function getSigners(uint256 _id) public view returns (address[])",
  "function isSigned(uint256 _id, address _signer) public view returns (bool)",
  "function isFinalized(uint256 _id) public view returns (bool)"
];

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const agreementContract = new ethers.Contract(contractAddress, contractABI, signer);
      setContract(agreementContract);

      console.log("Connected to wallet:", address);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const createAgreement = async () => {
    if (!contract) {
      alert("合约尚未连接");
      return;
    }
    try {
      const signersArray = signers.split(",").map(addr => addr.trim()).filter(addr => addr);
      const tx = await contract.createContract(signersArray, ipfsHash);
      await tx.wait();
      alert("✅ 合约已创建！");
    } catch (error) {
      console.error("创建失败:", error);
      alert("❌ 创建失败！");
    }
  };

  const signAgreement = async () => {
    if (!contract) {
      alert("合约尚未连接");
      return;
    }
    try {
      const tx = await contract.signContract(Number(queryId));
      await tx.wait();
      alert("✅ 合约已签署！");
    } catch (error) {
      console.error("签署失败:", error);
      alert("❌ 签署失败！");
    }
  };

  const showSignersStatus = async () => {
    if (!contract) {
      alert("合约尚未连接");
      return;
    }
    try {
      const id = Number(queryId);
      const signersList = await contract.getSigners(id);
      const statusList = await Promise.all(signersList.map(async (signer) => {
        const signed = await contract.isSigned(id, signer);
        return { signer, signed };
      }));
      setSignersStatus(statusList);
    } catch (error) {
      console.error("查询签署状态失败:", error);
      alert("❌ 查询签署状态失败！");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const cid = await uploadFileToIPFS(file);
    alert("上传成功，CID为: " + cid);
    setIpfsHash(cid);
  };

  return (
    <div className="App" style={{ padding: "2rem" }}>
      <h1>📝 Web3 合约签署 Demo</h1>
      {!walletAddress ? (
        <button onClick={connectWallet}>连接 MetaMask 钱包</button>
      ) : (
        <p>✅ 钱包已连接: {walletAddress}</p>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h2>➕ 创建合约记录</h2>
        <input
          type="text"
          placeholder="请输入多个地址，以逗号分隔"
          value={signers}
          onChange={(e) => setSigners(e.target.value)}
        />
        <br />
        <input
          type="text"
          placeholder="IPFS 哈希（或上传文件）"
          value={ipfsHash}
          onChange={(e) => setIpfsHash(e.target.value)}
        />
        <br />
        <input type="file" onChange={handleFileChange} />
        <br />
        <button onClick={createAgreement}>📩 创建链上合约</button>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <h2>🔏 签署合约</h2>
        <input
          type="text"
          placeholder="输入合约编号（如0）"
          value={queryId}
          onChange={(e) => setQueryId(e.target.value)}
        />
        <br />
        <button onClick={signAgreement}>签署合约</button>
        <button onClick={showSignersStatus} style={{ marginLeft: "1rem" }}>显示签署状态</button>

        {signersStatus && (
          <div style={{ marginTop: "1rem", textAlign: "left" }}>
            {signersStatus.map(({ signer, signed }) => (
              <p key={signer}>{signer}: {signed ? "✅ 已签署" : "❌ 未签署"}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;