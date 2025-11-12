import mongoose from 'mongoose';

// Cache the connection to reuse in serverless environments
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    console.error('📋 Please set MONGODB_URI in Vercel environment variables:');
    console.error('   Key: MONGODB_URI');
    console.error('   Value: mongodb+srv://ashishpimple94_db_user:test12345@cluster0.pwonikt.mongodb.net/voterdata?retryWrites=true&w=majority&appName=Cluster0');
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  // Clean and validate connection string
  let mongoUri = process.env.MONGODB_URI.trim();
  
  // Remove quotes if present (common issue when copying from docs)
  if ((mongoUri.startsWith('"') && mongoUri.endsWith('"')) || 
      (mongoUri.startsWith("'") && mongoUri.endsWith("'"))) {
    mongoUri = mongoUri.slice(1, -1).trim();
    console.log('⚠️  Removed quotes from MONGODB_URI');
  }
  
  // Validate connection string format
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MONGODB_URI format');
    console.error('📋 Current value (first 50 chars):', mongoUri.substring(0, 50));
    console.error('📋 Expected format: mongodb+srv://username:password@cluster.mongodb.net/database?options');
    throw new Error(`Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://". Got: ${mongoUri.substring(0, 20)}...`);
  }

  // Log connection attempt (without exposing password)
  const uriParts = mongoUri.split('@');
  const sanitizedUri = uriParts.length > 1 ? `mongodb+srv://***@${uriParts[1]}` : 'mongodb+srv://***';
  console.log('🔄 Attempting MongoDB connection to:', sanitizedUri);
  console.log('📋 Connection string length:', mongoUri.length);
  console.log('📋 Connection string starts with:', mongoUri.substring(0, 20));

  // If connection already exists and is ready, return it
  if (cached.conn && mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return cached.conn;
  }

  // If connection is in progress, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: true, // Buffer commands until connection is ready (important for serverless)
      serverSelectionTimeoutMS: 20000, // Increased for serverless (20 seconds)
      socketTimeoutMS: 45000, // How long to wait for socket timeout
      connectTimeoutMS: 20000, // Increased for serverless (20 seconds)
      // Optimized connection pooling for load balancing
      maxPoolSize: process.env.VERCEL ? 1 : 10, // 1 for serverless, 10 for regular servers
      minPoolSize: process.env.VERCEL ? 0 : 2, // 0 for serverless, 2 for regular servers
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true,
      w: 'majority',
      // Additional optimizations for large datasets
      readPreference: 'secondaryPreferred', // Use secondary for reads when available (load balancing)
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority', j: true },
    };

    console.log('📋 Connection options:', {
      serverSelectionTimeoutMS: opts.serverSelectionTimeoutMS,
      connectTimeoutMS: opts.connectTimeoutMS,
      maxPoolSize: opts.maxPoolSize
    });

    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected successfully to:', mongoose.connection.host);
      console.log('📊 Database:', mongoose.connection.name);
      console.log('🔌 Ready state:', mongoose.connection.readyState);
      cached.conn = mongoose;
      return mongoose;
    }).catch((error) => {
      console.error('❌ MongoDB Connection Error:', error.name);
      console.error('📋 Error message:', error.message);
      console.error('🔢 Error code:', error.code);
      console.error('🔢 Error codeName:', error.codeName);
      if (error.reason) {
        console.error('📋 Error reason:', error.reason);
      }
      
      // Provide detailed help for authentication errors
      if (error.message && (error.message.includes('authentication failed') || error.message.includes('Authentication failed') || error.code === 8000 || error.codeName === 'AuthenticationFailed')) {
        console.error('');
        console.error('🔐 AUTHENTICATION ERROR DETECTED');
        console.error('💡 Possible issues:');
        console.error('   1. Username or password is incorrect');
        console.error('   2. Password contains special characters that need URL encoding');
        console.error('   3. Database user does not exist or was deleted');
        console.error('   4. User password was changed in MongoDB Atlas');
        console.error('');
        console.error('🔧 Solutions:');
        console.error('   1. Go to MongoDB Atlas → Database Access');
        console.error('   2. Verify username: Voterlist2');
        console.error('   3. Check/reset password');
        console.error('   4. If password has @, #, $, etc., URL encode it in connection string');
        console.error('   5. Update MONGODB_URI in Render environment variables');
        console.error('');
      }
      
      cached.promise = null;
      cached.conn = null;
      throw error;
    });
  }

  try {
    const conn = await cached.promise;
    // Wait for connection to be ready
    if (conn.connection.readyState !== 1) {
      console.log('⏳ Waiting for connection to be ready...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout: Database did not become ready within 15 seconds'));
        }, 15000);
        
        conn.connection.once('connected', () => {
          clearTimeout(timeout);
          console.log('✅ Connection ready');
          resolve();
        });
        
        conn.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }
    return conn;
  } catch (e) {
    console.error('❌ Connection promise failed:', e.message);
    cached.promise = null;
    cached.conn = null;
    throw e;
  }
};

export default connectDB;

