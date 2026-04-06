# Blockchain Security Signing Demo

A student-scale Web3 project focused on secure smart contract signing workflows.

This repository demonstrates how to move from a basic contract interaction demo to a more security-oriented design by adding:

- signer authorization controls
- document integrity verification
- transaction validation checks
- replay-resistant EIP-712 signing
- security-focused tests for abuse cases

## Overview

The project models a two-party agreement signing flow:

1. A creator creates an agreement for a specific counterparty.
2. The client computes a SHA-256 digest of the document before submission.
3. The contract stores the agreement metadata, document digest, and signing deadline.
4. Only authorized parties can sign.
5. The system supports both direct signing and relayed EIP-712 authorization.
6. The frontend performs basic security checks before sending transactions.

## Features

### Smart Contract Security Controls

- Rejects zero-address or self-address counterparties
- Enforces signing deadlines
- Prevents duplicate signatures
- Restricts cancellation after counterparty participation
- Tracks agreement lifecycle with explicit states
- Supports nonce-based EIP-712 authorization for replay protection

### Client-Side Security Checks

- Validates addresses and agreement IDs
- Validates document digest format
- Warns on abnormal gas estimates
- Warns on unexpected network / chain ID
- Avoids hard-coded upload secrets in source code

### Security Testing

- Unauthorized signer rejection
- Duplicate-signature rejection
- Expired agreement handling
- Cancellation edge-case testing
- EIP-712 replay protection testing
- Expired authorization rejection

## Project Structure

```text
contracts/
  ContractSignTwoParty.sol
  Agreement.sol

frontend/src/
  App.js
  security/
    documentDigest.js
    transactionGuards.js
  utils/
    uploadToIPFS.js

scripts/
  deploy.js
  sample-script.js
  security-workflow.js

test/
  ContractSignTwoParty.security.js
```

## Tech Stack

- Solidity
- Hardhat
- ethers.js
- React

## Getting Started

### 1. Install dependencies

Root:

```bash
npm install
```

Frontend:

```bash
cd frontend
npm install
```

### 2. Configure environment variables

Example frontend `.env`:

```bash
REACT_APP_CONTRACT_ADDRESS=0xYourDeployedContract
REACT_APP_ALLOWED_CHAIN_ID=31337
REACT_APP_MAX_GAS_LIMIT=250000
REACT_APP_MAX_FEE_GWEI=80
REACT_APP_NFT_STORAGE_TOKEN=your_token_here
```

### 3. Compile and test contracts

```bash
npm run contract:compile
npm run contract:test
```

### 4. Deploy contract

```bash
npm run contract:deploy
```

### 5. Run frontend

```bash
cd frontend
npm start
```

## Security Design

This project focuses on practical security improvements rather than only demonstrating successful contract calls.

### Threats Considered

- unauthorized signing
- signature replay
- stale agreement execution
- off-chain document substitution
- unsafe transaction submission
- hard-coded secret exposure

### Mitigations Implemented

- Agreement signing is limited to the creator and designated counterparty
- Each agreement is bound to a document digest stored on-chain
- Signing windows are time-bounded
- EIP-712 authorizations are bound to nonce, chain ID, and contract address
- Client-side validation checks transaction context before submission
- Upload token handling uses environment variables instead of source-controlled secrets

## EIP-712 Authorization

The contract supports relayed signing through typed-data authorization.

Each authorization is bound to:

- agreement ID
- document digest
- signer address
- signer nonce
- authorization deadline
- chain ID
- verifying contract address

This helps prevent:

- replay on the same contract
- replay on another contract
- replay on another chain
- reuse of an already-consumed authorization

## Testing

Current test coverage includes:

- invalid counterparty rejection
- unauthorized signer rejection
- duplicate-signature rejection
- expiry handling
- cancellation restrictions
- successful full-signing flow
- EIP-712 relayed signing
- replay-attack rejection
- expired authorization rejection

Run tests with:

```bash
npm run contract:test
```

## Example Use Cases

- secure contract signing demo for portfolio projects
- student blockchain security engineering practice
- basic reference for transaction validation patterns
- simple example of replay-resistant typed-data authorization

## Future Improvements

- add frontend support for EIP-712 signing flow
- add event monitoring / alerting for suspicious activity
- add CI for automated contract testing
- add stronger secret management via backend relay service

## License

MIT
