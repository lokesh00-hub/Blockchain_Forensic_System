// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainOfCustody
 * @notice Immutable digital forensic ledger for ransomware incident evidence verification.
 * Adheres to Section 6 of Technical Requirements Document (TRD).
 *
 * Rules:
 * - Only stores cryptographic hashes, identifiers, and timestamps on-chain.
 * - Never stores actual evidence files or sensitive personal data on-chain.
 * - Maintains an immutable, tamper-resistant chain-of-custody event log.
 */
contract ChainOfCustody {

    struct EvidenceRecord {
        string evidenceId;
        string sha256Hash;
        string caseId;
        address custodian;
        uint256 registeredTimestamp;
        uint256 blockNumber;
        bool exists;
    }

    struct CustodyEvent {
        string evidenceId;
        string actionType;      // e.g. "REGISTRATION", "TRANSFER", "VERIFICATION_SUCCESS", "TAMPER_DETECTED"
        address actor;
        uint256 timestamp;
        uint256 blockNumber;
        string remarks;
    }

    address public forensicAdmin;
    uint256 public totalEvidenceRegistered;

    // Mapping: Evidence ID => Evidence Record
    mapping(string => EvidenceRecord) private evidenceRegistry;

    // Mapping: Evidence ID => List of Custody Events
    mapping(string => CustodyEvent[]) private custodyHistory;

    // Events emitted for forensic indexing and off-chain watchers
    event EvidenceRegistered(
        string indexed evidenceId,
        string sha256Hash,
        string caseId,
        address indexed custodian,
        uint256 timestamp,
        uint256 blockNumber
    );

    event CustodyEventLogged(
        string indexed evidenceId,
        string actionType,
        address indexed actor,
        uint256 timestamp,
        string remarks
    );

    event EvidenceVerified(
        string indexed evidenceId,
        bool isAuthentic,
        address indexed verifier,
        uint256 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == forensicAdmin, "Unauthorized: Forensic administrator access required");
        _;
    }

    constructor() {
        forensicAdmin = msg.sender;
        totalEvidenceRegistered = 0;
    }

    /**
     * @notice Register a newly acquired digital evidence file onto the blockchain ledger.
     * @param _evidenceId Unique evidence identifier (e.g., "EV-128")
     * @param _sha256Hash 64-character lowercase SHA-256 cryptographic digest
     * @param _caseId Case identifier (e.g., "CASE-017")
     */
    function registerEvidence(
        string memory _evidenceId,
        string memory _sha256Hash,
        string memory _caseId
    ) external {
        require(bytes(_evidenceId).length > 0, "Evidence ID cannot be empty");
        require(bytes(_sha256Hash).length == 64, "Valid 64-character SHA-256 hash required");
        require(!evidenceRegistry[_evidenceId].exists, "Evidence ID already registered on-chain");

        evidenceRegistry[_evidenceId] = EvidenceRecord({
            evidenceId: _evidenceId,
            sha256Hash: _sha256Hash,
            caseId: _caseId,
            custodian: msg.sender,
            registeredTimestamp: block.timestamp,
            blockNumber: block.number,
            exists: true
        });

        totalEvidenceRegistered++;

        // Record initial custody registration event
        custodyHistory[_evidenceId].push(CustodyEvent({
            evidenceId: _evidenceId,
            actionType: "REGISTRATION",
            actor: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number,
            remarks: "Initial SHA-256 cryptographic baseline registered on-chain"
        }));

        emit EvidenceRegistered(_evidenceId, _sha256Hash, _caseId, msg.sender, block.timestamp, block.number);
    }

    /**
     * @notice Record a custody transfer or handling event for an existing evidence record.
     */
    function recordCustodyEvent(
        string memory _evidenceId,
        string memory _actionType,
        string memory _remarks
    ) external {
        require(evidenceRegistry[_evidenceId].exists, "Evidence ID does not exist on-chain");

        custodyHistory[_evidenceId].push(CustodyEvent({
            evidenceId: _evidenceId,
            actionType: _actionType,
            actor: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number,
            remarks: _remarks
        }));

        emit CustodyEventLogged(_evidenceId, _actionType, msg.sender, block.timestamp, _remarks);
    }

    /**
     * @notice Compare a collected post-incident evidence file's hash against the on-chain baseline.
     */
    function verifyEvidence(
        string memory _evidenceId,
        string memory _currentHash
    ) external returns (bool isAuthentic, uint256 registeredTimestamp, string memory baselineHash) {
        require(evidenceRegistry[_evidenceId].exists, "Evidence ID not registered on-chain");

        EvidenceRecord memory record = evidenceRegistry[_evidenceId];
        isAuthentic = (keccak256(abi.encodePacked(record.sha256Hash)) == keccak256(abi.encodePacked(_currentHash)));

        string memory action = isAuthentic ? "VERIFICATION_SUCCESS" : "TAMPER_DETECTED";
        string memory remarks = isAuthentic 
            ? "Current hash matches registered baseline" 
            : "Cryptographic mismatch: Evidence tampered or modified!";

        custodyHistory[_evidenceId].push(CustodyEvent({
            evidenceId: _evidenceId,
            actionType: action,
            actor: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number,
            remarks: remarks
        }));

        emit EvidenceVerified(_evidenceId, isAuthentic, msg.sender, block.timestamp);
        return (isAuthentic, record.registeredTimestamp, record.sha256Hash);
    }

    /**
     * @notice Retrieve an evidence record from the blockchain ledger.
     */
    function getEvidenceRecord(string memory _evidenceId) external view returns (
        string memory evidenceId,
        string memory sha256Hash,
        string memory caseId,
        address custodian,
        uint256 registeredTimestamp,
        uint256 blockNumber
    ) {
        require(evidenceRegistry[_evidenceId].exists, "Evidence ID not found on-chain");
        EvidenceRecord memory record = evidenceRegistry[_evidenceId];
        return (
            record.evidenceId,
            record.sha256Hash,
            record.caseId,
            record.custodian,
            record.registeredTimestamp,
            record.blockNumber
        );
    }

    /**
     * @notice Check whether an evidence record exists on-chain.
     */
    function evidenceExists(string memory _evidenceId) external view returns (bool) {
        return evidenceRegistry[_evidenceId].exists;
    }

    /**
     * @notice Retrieve the number of custody events logged for an evidence item.
     */
    function getCustodyEventCount(string memory _evidenceId) external view returns (uint256) {
        return custodyHistory[_evidenceId].length;
    }

    /**
     * @notice Retrieve a specific custody event by index.
     */
    function getCustodyEvent(string memory _evidenceId, uint256 _index) external view returns (
        string memory actionType,
        address actor,
        uint256 timestamp,
        uint256 blockNumber,
        string memory remarks
    ) {
        require(evidenceRegistry[_evidenceId].exists, "Evidence ID not found");
        require(_index < custodyHistory[_evidenceId].length, "Event index out of range");

        CustodyEvent memory evt = custodyHistory[_evidenceId][_index];
        return (
            evt.actionType,
            evt.actor,
            evt.timestamp,
            evt.blockNumber,
            evt.remarks
        );
    }
}
