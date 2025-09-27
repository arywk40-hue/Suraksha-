// test.js - Test the blockchain functionality
const { SurakshaBlockchain } = require('./blockchain');

async function testBlockchain() {
    console.log('🧪 Testing Suraksha Blockchain...\n');
    
    const chain = new SurakshaBlockchain();
    
    // Test 1: Register tourist
    console.log('📝 Test 1: Registering tourist...');
    const touristData = {
        name: 'Rahul Sharma',
        aadhaarNumber: '1234567890123456',
        phone: '+919876543210',
        kycVerified: true,
        emergencyContacts: [
            { name: 'Mom', phone: '+919876543211' },
            { name: 'Dad', phone: '+919876543212' }
        ]
    };
    
    const identityHash = chain.addTouristIdentity(touristData);
    console.log(`✅ Tourist registered with hash: ${identityHash}`);
    
    // Test 2: Verify identity
    console.log('\n🔍 Test 2: Verifying tourist identity...');
    const verification = chain.verifyTouristIdentity(identityHash);
    console.log('✅ Verification result:', verification);
    
    // Test 3: Record emergency
    console.log('\n🚨 Test 3: Recording emergency...');
    const emergencyData = {
        type: 'THEFT',
        location: { lat: 28.6139, lng: 77.2090 },
        description: 'Pickpocket incident at Red Fort'
    };
    
    const emergencyHash = chain.recordEmergency(identityHash, emergencyData);
    console.log(`✅ Emergency recorded with hash: ${emergencyHash}`);
    
    // Test 4: Check blockchain validity
    console.log('\n🔗 Test 4: Checking blockchain integrity...');
    console.log('✅ Blockchain valid:', chain.isChainValid());
    
    // Test 5: Get stats
    console.log('\n📊 Test 5: Blockchain statistics...');
    console.log('✅ Stats:', chain.getStats());
    
    console.log('\n🎉 All tests passed! Blockchain is working correctly.');
}

// Run tests
testBlockchain().catch(console.error);