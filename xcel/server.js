import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import multer from 'multer';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import voterRoutes from './routes/voterRoutes.js';

// Load environment variables
dotenv.config();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

// Initialize Express app
const app = express();

// Middleware to ensure MongoDB connection before handling requests
app.use(async (req, res, next) => {
  // Skip connection check for health endpoint and root
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  // Set timeout for Render
  if (process.env.RENDER) {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000);
  }

  try {
    // Check if MONGODB_URI is set
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables');
      const platform = process.env.VERCEL ? 'Vercel' : process.env.RENDER ? 'Render' : 'your hosting platform';
      const connectionString = 'mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority';
      
      return res.status(503).json({
        success: false,
        message: 'Database configuration error',
        message_mr: 'डेटाबेस कॉन्फ़िगरेशन त्रुटि',
        error: 'MONGODB_URI environment variable is not set',
        hint: `Please set MONGODB_URI in ${platform} environment variables`,
        platform: platform,
        instructions: {
          step1: `Go to ${platform} Dashboard → Your Service → Environment`,
          step2: 'Click "Add Environment Variable"',
          step3: 'Key: MONGODB_URI',
          step4: `Value: ${connectionString}`,
          step5: 'Click "Save Changes" and redeploy'
        },
        connectionString: connectionString
      });
    }

    // Ensure MongoDB connection is ready
    if (mongoose.connection.readyState !== 1) {
      console.log('🔄 MongoDB not connected, attempting connection...');
      console.log('📍 Connection state:', mongoose.connection.readyState);
      console.log('🔗 MongoDB URI present:', !!process.env.MONGODB_URI);
      
      try {
        await connectDB();
        console.log('✅ MongoDB connected successfully');
      } catch (connError) {
        console.error('❌ MongoDB connection failed:', connError.message);
        console.error('📋 Error details:', {
          name: connError.name,
          code: connError.code,
          message: connError.message
        });
        throw connError;
      }
    } else {
      console.log('✅ MongoDB already connected');
    }
    next();
  } catch (error) {
    console.error('❌ MongoDB connection error in middleware:', error);
    console.error('📋 Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Provide helpful error messages
    let errorMessage = 'Database connection failed';
    let errorDetails = error.message || 'Unknown error';
    
    if (error.message && (error.message.includes('authentication failed') || error.message.includes('Authentication failed') || error.code === 8000 || error.codeName === 'AuthenticationFailed')) {
      errorMessage = 'Database authentication failed';
      errorDetails = 'Invalid username or password. Please check MONGODB_URI in Render environment variables.';
      
      // Provide specific help for authentication errors
      const platform = process.env.VERCEL ? 'Vercel' : process.env.RENDER ? 'Render' : 'your hosting platform';
      return res.status(503).json({
        success: false,
        message: errorMessage,
        message_mr: 'डेटाबेस प्रमाणीकरण विफल',
        error: errorDetails,
        hint: `Check MONGODB_URI in ${platform} environment variables`,
        platform: platform,
        troubleshooting: {
          step1: 'Verify username and password in MongoDB Atlas',
          step2: 'Check if password has special characters (may need URL encoding)',
          step3: 'Ensure database user exists and has correct permissions',
          step4: 'Verify connection string format: mongodb+srv://username:password@cluster...',
          step5: 'Try resetting database user password in MongoDB Atlas'
        },
        connectionStringFormat: 'mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority',
        note: 'If password has special characters (@, #, $, etc.), they need to be URL encoded in the connection string'
      });
    } else if (error.message && error.message.includes('ENOTFOUND')) {
      errorMessage = 'Database server not found';
      errorDetails = 'Cannot reach MongoDB server. Check your connection string.';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Connection timeout';
      errorDetails = 'Connection to database timed out. Check network access in MongoDB Atlas.';
    }
    
    return res.status(503).json({
      success: false,
      message: errorMessage,
      message_mr: 'डेटाबेस कनेक्शन विफल',
      error: errorDetails,
      hint: process.env.VERCEL ? 'Check Vercel environment variables and MongoDB Atlas network access' : 'Check your .env file'
    });
  }
});

// Create uploads directory if it doesn't exist (for Render and local dev, not needed for Vercel)
if (process.env.VERCEL !== '1' && !fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Increase timeout for Render (default is 30s, increase to 5 minutes for large file uploads)
if (process.env.RENDER) {
  app.use((req, res, next) => {
    req.setTimeout(300000); // 5 minutes
    res.setTimeout(300000); // 5 minutes
    next();
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Excel Upload API',
    status: 'running',
    environment: process.env.VERCEL ? 'production (Vercel)' : process.env.RENDER ? 'production (Render)' : 'development',
    endpoints: {
      uploadExcel: 'POST /api/voters/upload',
      getAllVoters: 'GET /api/voters',
      getVoterById: 'GET /api/voters/:id',
      searchVoters: 'GET /api/voters/search?query=...',
      deleteAllVoters: 'DELETE /api/voters',
    },
  });
});

// Health check endpoint with detailed MongoDB status
app.get('/health', async (req, res) => {
  const connectionState = mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  let mongodbStatus = {
    state: stateMap[connectionState] || 'unknown',
    readyState: connectionState,
    host: mongoose.connection.host || 'N/A',
    name: mongoose.connection.name || 'N/A',
    hasUri: !!process.env.MONGODB_URI
  };

  // Try to connect if not connected
  if (connectionState !== 1 && process.env.MONGODB_URI) {
    try {
      await connectDB();
      mongodbStatus.state = 'connected';
      mongodbStatus.readyState = mongoose.connection.readyState;
      mongodbStatus.host = mongoose.connection.host;
      mongodbStatus.name = mongoose.connection.name;
    } catch (error) {
      mongodbStatus.error = error.message;
      mongodbStatus.state = 'error';
    }
  }

  res.json({
    status: connectionState === 1 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL ? 'production (Vercel)' : process.env.RENDER ? 'production (Render)' : 'development',
    mongodb: mongodbStatus
  });
});

app.use('/api/voters', voterRoutes);

// Multer-specific error handler (e.g., file too large, wrong type)
app.use((err, req, res, next) => {
  if (err && (err instanceof multer.MulterError || err.name === 'MulterError')) {
    let message = 'फ़ाइल अपलोड त्रुटि';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = `फाइल बहुत बड़ी है। अधिकतम ${(process.env.MAX_FILE_SIZE_MB || 25)}MB अनुमति है`;
    }
    return res.status(400).json({ success: false, message });
  }
  return next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request method:', req.method);
  
  // Don't send response if already sent
  if (res.headersSent) {
    console.error('Response already sent, cannot send error response');
    return next(err);
  }

  res.status(500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    message_mr: 'कुछ गलत हो गया!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('=== UNCAUGHT EXCEPTION ===');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  // Don't exit in production, let the process manager handle it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Export app for Vercel serverless functions
// For Render and local development, start the server
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  
  // Create server with increased timeout for Render
  const server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 Server running on port ${PORT}        ║
║   📁 Excel Upload API is ready!           ║
║   🔗 http://localhost:${PORT}              ║
╚════════════════════════════════════════════╝
    `);
  });

  // Set server timeout for Render (5 minutes)
  if (process.env.RENDER) {
    server.timeout = 300000; // 5 minutes
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds
    console.log('⏱️  Render timeout settings: 5 minutes for requests');
  }
}

// Export for Vercel
export default app;

