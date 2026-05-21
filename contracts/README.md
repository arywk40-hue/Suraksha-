# Suraksha Polygon Registry

`SurakshaRegistry.sol` stores audit block anchors on Polygon while the larger audit payload stays on IPFS.

Recommended deployment flow:

1. Deploy the contract with Hardhat, Foundry, or Remix on Polygon Amoy.
2. Save the deployed address in your backend secrets as `POLYGON_REGISTRY_ADDRESS`.
3. Pin each audit block to IPFS and submit `height`, `blockHash`, `payloadHash`, and `ipfsCid` to `anchorBlock`.

The backend already pins blocks to Pinata when `PINATA_JWT` or `PINATA_API_KEY` plus `PINATA_SECRET_KEY` is configured. On-chain submission is intentionally kept behind wallet/private-key setup so no deployment key is committed to the repo.
