function pinataHeaders() {
  if (process.env.PINATA_JWT) {
    return {
      Authorization: `Bearer ${process.env.PINATA_JWT}`
    };
  }

  if (process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY) {
    return {
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET_KEY
    };
  }

  return null;
}

async function anchorAuditBlock(block, config) {
  const headers = pinataHeaders();
  if (!headers) {
    return {
      anchored: false,
      provider: config.ledger.sourceLabel
    };
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pinataMetadata: {
          name: `suraksha-audit-block-${block.height}`
        },
        pinataContent: block
      })
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || body.message || `Pinata returned ${response.status}`);
    }

    return {
      anchored: true,
      provider: 'pinata-ipfs',
      ipfsHash: body.IpfsHash,
      gatewayUrl: body.IpfsHash ? `https://gateway.pinata.cloud/ipfs/${body.IpfsHash}` : null
    };
  } catch (error) {
    return {
      anchored: false,
      provider: 'pinata-ipfs',
      error: error.message
    };
  }
}

module.exports = {
  anchorAuditBlock
};
