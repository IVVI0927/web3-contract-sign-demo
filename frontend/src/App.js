import { uploadFileToIPFS } from "./utils/uploadToIPFS";
import React, { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [partyB, setPartyB] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [contract, setContract] = useState(null);
  const [agreementData, setAgreementData] = useState(null);
  const [queryId, setQueryId] = useState("0");

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // ← 替换成你的合约地址！

  const contractABI = [
    "function createAgreement(address _partyB, string memory _ipfsHash) public",
    "function getAgreement(uint256) public view returns (address,address,string,bool,bool)"
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
      const tx = await contract.createAgreement(partyB, ipfsHash);
      await tx.wait();
      alert("✅ 合约已创建！");
    } catch (error) {
      console.error("创建失败:", error);
      alert("❌ 创建失败！");
    }
  };

  const getAgreement = async () => {
    if (!contract) {
      alert("请先连接钱包！");
      return;
    }
    try {
      const result = await contract.getAgreement(queryId);
      setAgreementData(result);
    } catch (err) {
      console.error("查询失败:", err);
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
          placeholder="乙方地址（partyB）"
          value={partyB}
          onChange={(e) => setPartyB(e.target.value)}
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
        <h2>🔍 查询合约状态</h2>
        <input
          type="text"
          placeholder="输入合约编号（如0）"
          value={queryId}
          onChange={(e) => setQueryId(e.target.value)}
        />
        <br />
        <button onClick={getAgreement}>查询合约</button>

        {agreementData && (
          <div style={{ marginTop: "1rem", textAlign: "left" }}>
            <p>甲方: {agreementData[0]}</p>
            <p>乙方: {agreementData[1]}</p>
            <p>IPFS 哈希: {agreementData[2]}</p>
            <p>甲方已签: {agreementData[3] ? "✅" : "❌"}</p>
            <p>乙方已签: {agreementData[4] ? "✅" : "❌"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;