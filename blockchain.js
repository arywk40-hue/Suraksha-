// blockchain.js - Suraksha Yatra Blockchain Implementation
const crypto = require('crypto');

class SurakshaBlockchain {
    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        this.touristIdentities = new Map();
        this.emergencyRecords = new Map();
        this.createGenesisBlock();
    }

    createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: Date.now(),
            transactions: [],
            previousHash: '0',
            hash: this.calculateHash(0, '0', [], Date.now()),
            nonce: 0
        };
        this.chain.push(genesisBlock);
    }

    calculateHash(index, previousHash, transactions, timestamp, nonce = 0) {
        const data = index + previousHash + JSON.stringify(transactions) + timestamp + nonce;
        return crypto.createHash('sha256').update(data).toString('hex');
    }

    addTouristIdentity(touristData) {
        const identityHash = crypto.createHash('sha256')
            .update(JSON.stringify(touristData) + Date.now())
            .digest('hex');

        const transaction = {
            type: 'TOURIST_REGISTRATION',
            identityHash: identityHash,
            touristData: touristData,
            timestamp: Date.now()
        };

        this.pendingTransactions.push(transaction);
        this.touristIdentities.set(identityHash, touristData);

        // Mine a new block if we have enough transactions
        if (this.pendingTransactions.length >= 3) {
            this.minePendingTransactions();
        }

        return identityHash;
    }

    recordEmergency(identityHash, emergencyData) {
        const emergencyId = crypto.createHash('sha256')
            .update(identityHash + JSON.stringify(emergencyData) + Date.now())
            .digest('hex');

        const transaction = {
            type: 'EMERGENCY_RECORD',
            identityHash: identityHash,
            emergencyId: emergencyId,
            emergencyData: emergencyData,
            timestamp: Date.now()
        };

        this.pendingTransactions.push(transaction);
        
        if (!this.emergencyRecords.has(identityHash)) {
            this.emergencyRecords.set(identityHash, []);
        }
        this.emergencyRecords.get(identityHash).push({
            emergencyId: emergencyId,
            ...emergencyData
        });

        // Mine a new block
        if (this.pendingTransactions.length >= 2) {
            this.minePendingTransactions();
        }

        return emergencyId;
    }

    resolveEmergency(emergencyId, resolutionData) {
        let found = false;
        
        for (let [identityHash, emergencies] of this.emergencyRecords) {
            const emergency = emergencies.find(e => e.emergencyId === emergencyId);
            if (emergency) {
                emergency.resolved = true;
                emergency.resolution = resolutionData;
                emergency.resolvedAt = Date.now();
                found = true;
                
                const transaction = {
                    type: 'EMERGENCY_RESOLUTION',
                    emergencyId: emergencyId,
                    resolutionData: resolutionData,
                    timestamp: Date.now()
                };
                
                this.pendingTransactions.push(transaction);
                break;
            }
        }

        if (found && this.pendingTransactions.length >= 2) {
            this.minePendingTransactions();
        }

        return found;
    }

    verifyTouristIdentity(identityHash) {
        const touristData = this.touristIdentities.get(identityHash);
        
        if (!touristData) {
            return {
                valid: false,
                message: 'Tourist identity not found'
            };
        }

        // Check if identity exists in blockchain
        let existsInChain = false;
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.type === 'TOURIST_REGISTRATION' && tx.identityHash === identityHash) {
                    existsInChain = true;
                    break;
                }
            }
            if (existsInChain) break;
        }

        return {
            valid: existsInChain,
            touristData: touristData,
            message: existsInChain ? 'Identity verified on blockchain' : 'Identity not found in blockchain'
        };
    }

    getEmergencyHistory(identityHash) {
        return this.emergencyRecords.get(identityHash) || [];
    }

    minePendingTransactions() {
        if (this.pendingTransactions.length === 0) return;

        const previousBlock = this.chain[this.chain.length - 1];
        const newBlock = {
            index: this.chain.length,
            timestamp: Date.now(),
            transactions: [...this.pendingTransactions],
            previousHash: previousBlock.hash,
            nonce: 0
        };

        // Simple proof of work
        newBlock.hash = this.calculateHash(
            newBlock.index,
            newBlock.previousHash,
            newBlock.transactions,
            newBlock.timestamp,
            newBlock.nonce
        );

        this.chain.push(newBlock);
        this.pendingTransactions = [];

        console.log(`✅ Mined new block #${newBlock.index} with ${newBlock.transactions.length} transactions`);
    }

    getStats() {
        let totalTourists = 0;
        let totalEmergencies = 0;
        let resolvedEmergencies = 0;

        for (const [identityHash, emergencies] of this.emergencyRecords) {
            totalTourists++;
            totalEmergencies += emergencies.length;
            resolvedEmergencies += emergencies.filter(e => e.resolved).length;
        }

        return {
            totalBlocks: this.chain.length,
            totalTourists: this.touristIdentities.size,
            totalEmergencies: totalEmergencies,
            resolvedEmergencies: resolvedEmergencies,
            pendingTransactions: this.pendingTransactions.length,
            chainIntegrity: this.isChainValid() ? 'Valid' : 'Corrupted'
        };
    }

    getRecentActivity() {
        const recentTransactions = [];
        const recentBlocks = this.chain.slice(-5).reverse();

        for (const block of recentBlocks) {
            for (const tx of block.transactions) {
                recentTransactions.push({
                    type: tx.type,
                    timestamp: tx.timestamp,
                    blockIndex: block.index
                });
            }
        }

        return recentTransactions.slice(0, 10);
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Check if current block's hash is correct
            if (currentBlock.hash !== this.calculateHash(
                currentBlock.index,
                currentBlock.previousHash,
                currentBlock.transactions,
                currentBlock.timestamp,
                currentBlock.nonce
            )) {
                return false;
            }

            // Check if previous hash matches
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        return true;
    }
}

module.exports = { SurakshaBlockchain };