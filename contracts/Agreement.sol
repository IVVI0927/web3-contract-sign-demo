// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Agreement {
    struct ContractData {
        address partyA;
        address partyB;
        string ipfsHash;
        bool signedByA;
        bool signedByB;
    }

    ContractData[] public agreements;

    function createAgreement(address _partyB, string memory _ipfsHash) public {
        agreements.push(
            ContractData({
                partyA: msg.sender,
                partyB: _partyB,
                ipfsHash: _ipfsHash,
                signedByA: true,
                signedByB: false
            })
        );
    }

    function signAgreement(uint _id) public {
        require(_id < agreements.length, "Invalid agreement ID");
        ContractData storage ag = agreements[_id];
        require(msg.sender == ag.partyB, "Only party B can sign");
        ag.signedByB = true;
    }

    function getAgreement(uint _id) public view returns (
        address, address, string memory, bool, bool
    ) {
        require(_id < agreements.length, "Invalid agreement ID");
        ContractData memory ag = agreements[_id];
        return (ag.partyA, ag.partyB, ag.ipfsHash, ag.signedByA, ag.signedByB);
    }
}