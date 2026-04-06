/* global BigInt */
import { ethers } from "ethers";

const DEFAULT_ALLOWED_CHAIN_ID = Number(process.env.REACT_APP_ALLOWED_CHAIN_ID || "31337");
const DEFAULT_MAX_GAS = BigInt(process.env.REACT_APP_MAX_GAS_LIMIT || "250000");
const DEFAULT_MAX_FEE_GWEI = BigInt(process.env.REACT_APP_MAX_FEE_GWEI || "80");

export function validateCreateAgreementInput({
  walletAddress,
  counterparty,
  documentDigest,
  documentUri,
  deadlineHours
}) {
  const errors = [];
  const parsedDeadlineHours = Number(deadlineHours);

  if (!walletAddress) {
    errors.push("Connect a wallet before creating an agreement.");
  }
  if (!ethers.isAddress(counterparty)) {
    errors.push("Counterparty address is invalid.");
  }
  if (walletAddress && counterparty && walletAddress.toLowerCase() === counterparty.toLowerCase()) {
    errors.push("Creator and counterparty must be different addresses.");
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(documentDigest)) {
    errors.push("Document digest must be a 32-byte hex string.");
  }
  if (!documentUri.trim()) {
    errors.push("Document URI is required.");
  }
  if (!Number.isFinite(parsedDeadlineHours) || parsedDeadlineHours <= 0 || parsedDeadlineHours > 24 * 30) {
    errors.push("Deadline must be between 1 hour and 30 days.");
  }

  return errors;
}

export function validateAgreementId(value) {
  if (!/^\d+$/.test(String(value))) {
    return ["Agreement ID must be a non-negative integer."];
  }

  return [];
}

export function assessTransactionRisk({
  chainId,
  gasEstimate,
  maxFeePerGas,
  value
}) {
  const warnings = [];
  const errors = [];

  if (Number(chainId) !== DEFAULT_ALLOWED_CHAIN_ID) {
    errors.push(
      `Unexpected network. Expected chain ID ${DEFAULT_ALLOWED_CHAIN_ID}, received ${chainId}.`
    );
  }

  if (gasEstimate && gasEstimate > DEFAULT_MAX_GAS) {
    warnings.push(
      `Gas estimate ${gasEstimate.toString()} exceeds the recommended ceiling ${DEFAULT_MAX_GAS.toString()}.`
    );
  }

  if (maxFeePerGas) {
    const maxFeeGwei = BigInt(ethers.formatUnits(maxFeePerGas, "gwei").split(".")[0] || "0");
    if (maxFeeGwei > DEFAULT_MAX_FEE_GWEI) {
      warnings.push(
        `Max fee per gas is ${maxFeeGwei.toString()} gwei, above the configured warning threshold ${DEFAULT_MAX_FEE_GWEI.toString()} gwei.`
      );
    }
  }

  if (value && value > 0n) {
    warnings.push("This transaction sends ETH value. Review whether that is expected.");
  }

  return { warnings, errors };
}

export function buildDeadlineTimestamp(deadlineHours) {
  const deadlineSeconds = Number(deadlineHours) * 60 * 60;
  return BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
}

export function formatStatus(status) {
  const statusMap = {
    0: "None",
    1: "Active",
    2: "Fully Signed",
    3: "Cancelled",
    4: "Expired"
  };

  return statusMap[Number(status)] || "Unknown";
}
