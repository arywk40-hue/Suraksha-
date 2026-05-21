// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SurakshaRegistry {
    struct AuditAnchor {
        uint256 height;
        bytes32 blockHash;
        bytes32 payloadHash;
        string ipfsCid;
        uint256 timestamp;
    }

    address public owner;
    mapping(bytes32 => AuditAnchor) public anchors;

    event AuditAnchored(uint256 indexed height, bytes32 indexed blockHash, bytes32 payloadHash, string ipfsCid);
    event OwnershipTransferred(address indexed previousOwner, address indexed nextOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function anchorBlock(
        uint256 height,
        bytes32 blockHash,
        bytes32 payloadHash,
        string calldata ipfsCid
    ) external onlyOwner {
        require(height > 0, "height required");
        require(blockHash != bytes32(0), "block hash required");
        require(anchors[blockHash].timestamp == 0, "already anchored");

        anchors[blockHash] = AuditAnchor({
            height: height,
            blockHash: blockHash,
            payloadHash: payloadHash,
            ipfsCid: ipfsCid,
            timestamp: block.timestamp
        });

        emit AuditAnchored(height, blockHash, payloadHash, ipfsCid);
    }

    function transferOwnership(address nextOwner) external onlyOwner {
        require(nextOwner != address(0), "next owner required");
        emit OwnershipTransferred(owner, nextOwner);
        owner = nextOwner;
    }
}
