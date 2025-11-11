import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority';

console.log('🔍 Testing MongoDB Connection...\n');
console.log('📍 Connection String:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
console.log('');

async function testConnection() {
  try {
    console.log('🔄 Attempting to connect...');
    
    const connection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ MongoDB Connected Successfully!');
    console.log('');
    console.log('📊 Connection Details:');
    console.log('   Host:', connection.connection.host);
    console.log('   Database:', connection.connection.name);
    console.log('   Ready State:', connection.connection.readyState);
    console.log('   Port:', connection.connection.port || 'N/A (Atlas)');
    console.log('');

    // Test a simple query
    console.log('🧪 Testing database query...');
    const collections = await connection.connection.db.listCollections().toArray();
    console.log('✅ Database is accessible!');
    console.log('📁 Collections found:', collections.length);
    
    if (collections.length > 0) {
      console.log('   Collections:', collections.map(c => c.name).join(', '));
    }

    // Check if voterdata collection exists
    const voterDataExists = collections.some(c => c.name === 'voterdatas');
    if (voterDataExists) {
      const VoterData = mongoose.connection.db.collection('voterdatas');
      const count = await VoterData.countDocuments();
      console.log('📊 VoterData records:', count);
    }

    console.log('');
    console.log('✅ All tests passed! Database connection is working.');
    
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Connection Failed!');
    console.error('');
    console.error('Error Details:');
    console.error('   Name:', error.name);
    console.error('   Message:', error.message);
    console.error('   Code:', error.code || 'N/A');
    console.error('');
    
    if (error.message.includes('authentication failed')) {
      console.error('💡 Issue: Authentication failed');
      console.error('   - Check username and password');
      console.error('   - Verify database user exists in MongoDB Atlas');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('💡 Issue: Cannot reach MongoDB server');
      console.error('   - Check cluster URL');
      console.error('   - Verify internet connection');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Issue: Connection timeout');
      console.error('   - Check MongoDB Atlas Network Access');
      console.error('   - Allow 0.0.0.0/0 or your IP address');
    } else if (error.message.includes('MONGODB_URI')) {
      console.error('💡 Issue: MONGODB_URI not set');
      console.error('   - Set MONGODB_URI environment variable');
      console.error('   - Or connection string is missing');
    }
    
    console.error('');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted. Closing connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run test
testConnection();


