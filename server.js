// server.js - API server for Suraksha Yatra blockchain
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { SurakshaBlockchain } = require('./blockchain');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Serve static files (for demo.html)
app.use(express.static(__dirname));

// Initialize blockchain
console.log('🚀 Initializing Suraksha Yatra Blockchain...');
const surakshaChain = new SurakshaBlockchain();
console.log('✅ Blockchain initialized successfully');

// CORS middleware for demo
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
    next();
});

// Routes

// Home route - serve demo page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'demo.html'));
});

// Register new tourist
app.post('/api/register-tourist', (req, res) => {
    try {
        console.log('📝 New tourist registration request');
        
        const touristData = {
            name: req.body.name,
            aadhaarNumber: req.body.aadhaarNumber,
            phone: req.body.phone,
            kycVerified: req.body.kycVerified || false,
            emergencyContacts: req.body.emergencyContacts || [],
            publicKey: req.body.publicKey || uuidv4(),
            location: req.body.location || 'Not specified'
        };

        // Validate required fields
        if (!touristData.name || !touristData.phone) {
            return res.status(400).json({
                success: false,
                message: '❌ Name and phone are required fields'
            });
        }

        const identityHash = surakshaChain.addTouristIdentity(touristData);
        
        res.json({
            success: true,
            identityHash: identityHash,
            message: '✅ Tourist registered successfully on blockchain',
            blockIndex: surakshaChain.chain.length - 1
        });
    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(500).json({
            success: false,
            message: `❌ Registration failed: ${error.message}`
        });
    }
});

// Verify tourist identity
app.get('/api/verify-tourist/:identityHash', (req, res) => {
    try {
        console.log(`🔍 Verifying tourist: ${req.params.identityHash.substring(0, 12)}...`);
        const verification = surakshaChain.verifyTouristIdentity(req.params.identityHash);
        
        if (verification.valid) {
            const emergencyHistory = surakshaChain.getEmergencyHistory(req.params.identityHash);
            verification.emergencyHistory = emergencyHistory;
            verification.totalEmergencies = emergencyHistory.length;
        }
        
        res.json(verification);
    } catch (error) {
        console.error('❌ Verification error:', error.message);
        res.status(500).json({
            valid: false,
            message: `❌ Verification failed: ${error.message}`
        });
    }
});

// Record emergency
app.post('/api/emergency', (req, res) => {
    try {
        console.log(`🚨 Emergency alert received`);
        
        const emergencyData = {
            type: req.body.type || 'GENERAL',
            location: req.body.location || { lat: 0, lng: 0 },
            timestamp: Date.now(),
            description: req.body.description || 'Emergency situation',
            severity: req.body.severity || 'MEDIUM'
        };

        if (!req.body.identityHash) {
            return res.status(400).json({
                success: false,
                message: '❌ Tourist identity hash is required'
            });
        }

        // Verify tourist exists
        const verification = surakshaChain.verifyTouristIdentity(req.body.identityHash);
        if (!verification.valid) {
            return res.status(404).json({
                success: false,
                message: '❌ Tourist identity not found'
            });
        }

        const emergencyHash = surakshaChain.recordEmergency(
            req.body.identityHash,
            emergencyData
        );

        res.json({
            success: true,
            emergencyHash: emergencyHash,
            message: '🚨 Emergency recorded on blockchain',
            emergencyType: emergencyData.type,
            timestamp: emergencyData.timestamp,
            estimatedResponse: '3-5 minutes'
        });
    } catch (error) {
        console.error('❌ Emergency recording error:', error.message);
        res.status(500).json({
            success: false,
            message: `❌ Emergency recording failed: ${error.message}`
        });
    }
});

// Resolve emergency
app.post('/api/emergency/:emergencyId/resolve', (req, res) => {
    try {
        const resolutionData = {
            resolvedBy: req.body.resolvedBy || 'System',
            note: req.body.note || 'Emergency resolved',
            responseTime: req.body.responseTime || '5 minutes'
        };

        const resolutionHash = surakshaChain.resolveEmergency(
            req.params.emergencyId,
            resolutionData
        );

        res.json({
            success: true,
            resolutionHash: resolutionHash,
            message: '✅ Emergency marked as resolved',
            resolvedBy: resolutionData.resolvedBy
        });
    } catch (error) {
        console.error('❌ Emergency resolution error:', error.message);
        res.status(500).json({
            success: false,
            message: `❌ Emergency resolution failed: ${error.message}`
        });
    }
});

// Get tourist's emergency history
app.get('/api/tourist/:identityHash/emergencies', (req, res) => {
    try {
        const emergencyHistory = surakshaChain.getEmergencyHistory(req.params.identityHash);
        res.json({
            success: true,
            emergencies: emergencyHistory,
            totalCount: emergencyHistory.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get blockchain stats
app.get('/api/stats', (req, res) => {
    try {
        const stats = surakshaChain.getStats();
        const recentActivity = surakshaChain.getRecentActivity();
        
        res.json({
            ...stats,
            recentActivity: recentActivity,
            serverUptime: process.uptime(),
            timestamp: new Date().toLocaleString()
        });
    } catch (error) {
        console.error('❌ Stats error:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
});

// Get full blockchain (for debugging - limit to first 10 blocks in production)
app.get('/api/blockchain', (req, res)=> {
    try {
        const limit = parseInt(req.query.limit) || 10;
        res.json({
            chain: surakshaChain.chain.slice(0, limit),
            totalBlocks: surakshaChain.chain.length,
            showing: Math.min(limit, surakshaChain.chain.length)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: '🟢 Healthy', 
        blockchain: surakshaChain.isChainValid() ? '✅ Valid' : '❌ Corrupted',
        timestamp: Date.now(),
        uptime: process.uptime()
    });
});

// Demo data endpoint (for quick testing)
app.post('/api/demo-data', (req, res) => {
    try {
        console.log('🎭 Creating demo data...');
        
        // Register sample tourists
        const tourist1 = surakshaChain.addTouristIdentity({
            name: 'Rahul Sharma',
            aadhaarNumber: '1234567890123456',
            phone: '+919876543210',
            kycVerified: true,
            emergencyContacts: [
                { name: 'Mom', phone: '+919876543211' },
                { name: 'Dad', phone: '+919876543212' }
            ],
            location: 'Delhi'
        });

        const tourist2 = surakshaChain.addTouristIdentity({
            name: 'Priya Patel',
            aadhaarNumber: '9876543210987654',
            phone: '+919123456789',
            kycVerified: true,
            emergencyContacts: [
                { name: 'Brother', phone: '+919123456790' }
            ],
            location: 'Mumbai'
        });

        // Add sample emergency
        const emergency1 = surakshaChain.recordEmergency(tourist1, {
            type: 'THEFT',
            location: { lat: 28.6139, lng: 77.2090, name: 'Red Fort, Delhi' },
            description: 'Tourist reported pickpocket incident',
            severity: 'MEDIUM'
        });

        res.json({
            success: true,
            message: '🎭 Demo data created successfully',
            data: {
                tourists: [tourist1, tourist2],
                emergencies: [emergency1]
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n🚀 ===============================================');
    console.log('🛡️  SURAKSHA YATRA BLOCKCHAIN SERVER RUNNING');
    console.log('===============================================');
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🎭 Demo UI: http://localhost:${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
    console.log('===============================================\n');
    
    // Show initial blockchain stats
    setTimeout(() => {
        const stats = surakshaChain.getStats();
        console.log('📊 Initial Blockchain Status:');
        console.log(`   Blocks: ${stats.totalBlocks}`);
        console.log(`   Tourists: ${stats.totalTourists}`);
        console.log(`   Emergencies: ${stats.totalEmergencies}`);
        console.log(`   Chain Valid: ${stats.chainIntegrity}`);
        console.log('');
    }, 1000);
});

module.exports = app;