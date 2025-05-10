// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractSignTwoParty {
    enum Status { Draft, Waiting, Signed }

    struct Contract {
        address creator;
        address signer;
        string ipfsHash;
        bool creatorSigned;
        bool signerSigned;
        Status status;
    }

    uint public contractCount = 0;
    mapping(uint => Contract) public contracts;

    event ContractCreated(uint id, address creator, address signer, string ipfsHash);
    event Signed(uint id, address signer);

    function createContract(address _signer, string calldata _ipfsHash) external returns (uint) {
        contracts[contractCount] = Contract({
            creator: msg.sender,
            signer: _signer,
            ipfsHash: _ipfsHash,
            creatorSigned: false,
            signerSigned: false,
            status: Status.Draft
        });

        emit ContractCreated(contractCount, msg.sender, _signer, _ipfsHash);
        return contractCount++;
    }

    function signContract(uint _id) external {
        Contract storage c = contracts[_id];
        require(msg.sender == c.creator || msg.sender == c.signer, "Not authorized");
        require(c.status != Status.Signed, "Already signed");

        if (msg.sender == c.creator) {
            c.creatorSigned = true;
        } else if (msg.sender == c.signer) {
            c.signerSigned = true;
        }

        if (c.creatorSigned && c.signerSigned) {
            c.status = Status.Signed;
        } else {
            c.status = Status.Waiting;
        }

        emit Signed(_id, msg.sender);
    }

    function getStatus(uint _id) external view returns (Status) {
        return contracts[_id].status;
    }
}