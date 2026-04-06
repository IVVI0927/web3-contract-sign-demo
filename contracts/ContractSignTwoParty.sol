// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ContractSignTwoParty {
    uint64 public constant MAX_SIGNING_WINDOW = 30 days;
    string public constant SIGNING_DOMAIN = "ContractSignTwoParty";
    string public constant SIGNATURE_VERSION = "1";
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 private constant SIGNING_AUTHORIZATION_TYPEHASH =
        keccak256(
            "SigningAuthorization(uint256 agreementId,bytes32 documentDigest,address signer,uint256 nonce,uint256 authorizationDeadline)"
        );
    uint256 private constant SECP256K1_HALF_N =
        0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;

    enum Status {
        None,
        Active,
        FullySigned,
        Cancelled,
        Expired
    }

    struct Agreement {
        address creator;
        address counterparty;
        bytes32 documentDigest;
        string documentUri;
        uint64 createdAt;
        uint64 signingDeadline;
        bool creatorSigned;
        bool counterpartySigned;
        Status status;
    }

    error InvalidCounterparty(address counterparty);
    error InvalidDocumentDigest();
    error InvalidSigningDeadline(uint64 deadline);
    error AgreementNotFound(uint256 agreementId);
    error UnauthorizedSigner(address caller);
    error AgreementNotActive(Status status);
    error AgreementStillActive(uint256 agreementId, uint64 signingDeadline);
    error AlreadySigned(uint256 agreementId, address signer);
    error SigningWindowExpired(uint256 agreementId);
    error CannotCancelAfterCounterpartySignature(uint256 agreementId);
    error AuthorizationExpired(uint256 authorizationDeadline);
    error AuthorizationExceedsSigningDeadline(uint256 authorizationDeadline, uint64 signingDeadline);
    error InvalidSignature(address recoveredSigner, address expectedSigner);
    error InvalidSignatureLength(uint256 length);
    error InvalidSignatureS(bytes32 s);
    error InvalidSignatureV(uint8 v);

    uint256 public agreementCount;
    mapping(uint256 => Agreement) private agreements;
    mapping(address => uint256) public signingNonces;

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed creator,
        address indexed counterparty,
        bytes32 documentDigest,
        string documentUri,
        uint64 signingDeadline
    );
    event AgreementSigned(uint256 indexed agreementId, address indexed signer, Status status);
    event AgreementCancelled(uint256 indexed agreementId, address indexed cancelledBy);
    event AgreementExpired(uint256 indexed agreementId);
    event SigningAuthorizationUsed(
        uint256 indexed agreementId,
        address indexed signer,
        uint256 nonce,
        uint256 authorizationDeadline
    );

    function createAgreement(
        address _counterparty,
        bytes32 _documentDigest,
        string calldata _documentUri,
        uint64 _signingDeadline
    ) external returns (uint256 agreementId) {
        if (_counterparty == address(0) || _counterparty == msg.sender) {
            revert InvalidCounterparty(_counterparty);
        }
        if (_documentDigest == bytes32(0)) {
            revert InvalidDocumentDigest();
        }

        uint64 currentTime = uint64(block.timestamp);
        if (
            _signingDeadline <= currentTime ||
            _signingDeadline > currentTime + MAX_SIGNING_WINDOW
        ) {
            revert InvalidSigningDeadline(_signingDeadline);
        }

        agreementId = agreementCount;
        agreements[agreementId] = Agreement({
            creator: msg.sender,
            counterparty: _counterparty,
            documentDigest: _documentDigest,
            documentUri: _documentUri,
            createdAt: currentTime,
            signingDeadline: _signingDeadline,
            creatorSigned: false,
            counterpartySigned: false,
            status: Status.Active
        });

        agreementCount += 1;

        emit AgreementCreated(
            agreementId,
            msg.sender,
            _counterparty,
            _documentDigest,
            _documentUri,
            _signingDeadline
        );
    }

    function signAgreement(uint256 _agreementId) external {
        Agreement storage agreement = _getAgreement(_agreementId);
        _validateActiveAgreement(_agreementId, agreement);
        _signAs(_agreementId, agreement, msg.sender);
    }

    function signAgreementWithAuthorization(
        uint256 _agreementId,
        address _signer,
        uint256 _authorizationDeadline,
        bytes calldata _signature
    ) external {
        Agreement storage agreement = _getAgreement(_agreementId);
        _validateActiveAgreement(_agreementId, agreement);

        if (_authorizationDeadline > agreement.signingDeadline) {
            revert AuthorizationExceedsSigningDeadline(
                _authorizationDeadline,
                agreement.signingDeadline
            );
        }
        if (block.timestamp > _authorizationDeadline) {
            revert AuthorizationExpired(_authorizationDeadline);
        }

        uint256 nonce = signingNonces[_signer];
        bytes32 digest = getSigningAuthorizationDigest(
            _agreementId,
            _signer,
            nonce,
            _authorizationDeadline
        );
        address recoveredSigner = _recoverSigner(digest, _signature);

        if (recoveredSigner != _signer) {
            revert InvalidSignature(recoveredSigner, _signer);
        }

        signingNonces[_signer] = nonce + 1;
        emit SigningAuthorizationUsed(_agreementId, _signer, nonce, _authorizationDeadline);

        _signAs(_agreementId, agreement, _signer);
    }

    function cancelAgreement(uint256 _agreementId) external {
        Agreement storage agreement = _getAgreement(_agreementId);

        if (agreement.status != Status.Active) {
            revert AgreementNotActive(agreement.status);
        }
        if (msg.sender != agreement.creator) {
            revert UnauthorizedSigner(msg.sender);
        }
        if (agreement.counterpartySigned) {
            revert CannotCancelAfterCounterpartySignature(_agreementId);
        }

        agreement.status = Status.Cancelled;
        emit AgreementCancelled(_agreementId, msg.sender);
    }

    function markExpired(uint256 _agreementId) external {
        Agreement storage agreement = _getAgreement(_agreementId);

        if (agreement.status != Status.Active) {
            revert AgreementNotActive(agreement.status);
        }
        if (block.timestamp <= agreement.signingDeadline) {
            revert AgreementStillActive(_agreementId, agreement.signingDeadline);
        }

        agreement.status = Status.Expired;
        emit AgreementExpired(_agreementId);
    }

    function getAgreement(uint256 _agreementId)
        external
        view
        returns (
            address creator,
            address counterparty,
            bytes32 documentDigest,
            string memory documentUri,
            uint64 createdAt,
            uint64 signingDeadline,
            bool creatorSigned,
            bool counterpartySigned,
            Status status
        )
    {
        Agreement storage agreement = _getAgreement(_agreementId);
        return (
            agreement.creator,
            agreement.counterparty,
            agreement.documentDigest,
            agreement.documentUri,
            agreement.createdAt,
            agreement.signingDeadline,
            agreement.creatorSigned,
            agreement.counterpartySigned,
            agreement.status
        );
    }

    function canSign(uint256 _agreementId, address _account) external view returns (bool) {
        Agreement storage agreement = _getAgreement(_agreementId);

        if (agreement.status != Status.Active || block.timestamp > agreement.signingDeadline) {
            return false;
        }

        if (_account == agreement.creator) {
            return !agreement.creatorSigned;
        }

        if (_account == agreement.counterparty) {
            return !agreement.counterpartySigned;
        }

        return false;
    }

    function getSigningAuthorizationDigest(
        uint256 _agreementId,
        address _signer,
        uint256 _nonce,
        uint256 _authorizationDeadline
    ) public view returns (bytes32) {
        Agreement storage agreement = _getAgreement(_agreementId);

        bytes32 structHash = keccak256(
            abi.encode(
                SIGNING_AUTHORIZATION_TYPEHASH,
                _agreementId,
                agreement.documentDigest,
                _signer,
                _nonce,
                _authorizationDeadline
            )
        );

        return keccak256(
            abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash)
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function _getAgreement(uint256 _agreementId) internal view returns (Agreement storage agreement) {
        agreement = agreements[_agreementId];
        if (agreement.creator == address(0)) {
            revert AgreementNotFound(_agreementId);
        }
    }

    function _validateActiveAgreement(uint256 _agreementId, Agreement storage agreement) internal {
        if (agreement.status != Status.Active) {
            revert AgreementNotActive(agreement.status);
        }
        if (block.timestamp > agreement.signingDeadline) {
            agreement.status = Status.Expired;
            emit AgreementExpired(_agreementId);
            revert SigningWindowExpired(_agreementId);
        }
    }

    function _signAs(
        uint256 _agreementId,
        Agreement storage agreement,
        address signer
    ) internal {
        if (signer != agreement.creator && signer != agreement.counterparty) {
            revert UnauthorizedSigner(signer);
        }

        if (signer == agreement.creator) {
            if (agreement.creatorSigned) {
                revert AlreadySigned(_agreementId, signer);
            }
            agreement.creatorSigned = true;
        } else {
            if (agreement.counterpartySigned) {
                revert AlreadySigned(_agreementId, signer);
            }
            agreement.counterpartySigned = true;
        }

        if (agreement.creatorSigned && agreement.counterpartySigned) {
            agreement.status = Status.FullySigned;
        }

        emit AgreementSigned(_agreementId, signer, agreement.status);
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(SIGNING_DOMAIN)),
                keccak256(bytes(SIGNATURE_VERSION)),
                block.chainid,
                address(this)
            )
        );
    }

    function _recoverSigner(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) {
            revert InvalidSignatureLength(signature.length);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (uint256(s) > SECP256K1_HALF_N) {
            revert InvalidSignatureS(s);
        }
        if (v != 27 && v != 28) {
            revert InvalidSignatureV(v);
        }

        return ecrecover(digest, v, r, s);
    }
}
