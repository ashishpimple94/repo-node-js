import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Test different connection strings
const connectionStrings = [
  {
    name: 'Current (Test123)',
    uri: 'mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority'
  },
  {
    name: 'Alternative (test123)',
    uri: 'mongodb+srv://Voterlist2:test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority'
  },
  {
    name: 'Alternative (test12345)',
    uri: 'mongodb+srv://Voterlist2:test12345@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority'
  }
];

async function testConnection(connectionString, name) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   URI: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
    
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 5000,
    });

    console.log(`   ✅ SUCCESS! Connected to: ${mongoose.connection.host}`);
    console.log(`   📊 Database: ${mongoose.connection.name}`);
    
    await mongoose.connection.close();
    return { success: true, name, connectionString };
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    await mongoose.connection.close().catch(() => {});
    return { success: false, name, error: error.message };
  }
}

async function findWorkingConnection() {
  console.log('🔍 Testing MongoDB Connection Strings...\n');
  console.log('This will test different password combinations to find the correct one.\n');

  for (const conn of connectionStrings) {
    const result = await testConnection(conn.uri, conn.name);
    if (result.success) {
      console.log('\n✅ FOUND WORKING CONNECTION STRING!');
      console.log('\n📋 Use this in Render:');
      console.log(`\nMONGODB_URI=${result.connectionString}\n`);
      return result.connectionString;
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n❌ None of the tested connection strings worked.');
  console.log('\n💡 Next Steps:');
  console.log('   1. Go to MongoDB Atlas → Database Access');
  console.log('   2. Check the actual username and password');
  console.log('   3. Reset password if needed');
  console.log('   4. Update connection string with correct credentials');
  
  return null;
}

findWorkingConnection()
  .then((workingUri) => {
    if (workingUri) {
      console.log('\n✅ Copy the connection string above and set it in Render environment variables.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });




