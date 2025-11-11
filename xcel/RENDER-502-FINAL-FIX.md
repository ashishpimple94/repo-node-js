# 🚨 Render 502 Error - Final Fix

## Problem
502 Bad Gateway error on Render - Server is crashing or timing out.

## Root Causes
1. **Server Crash on Startup** - MongoDB connection fails during startup
2. **Memory Issues** - Server running out of memory
3. **Timeout** - Requests taking too long
4. **Unhandled Errors** - Errors causing server to crash

## ✅ Fixes Applied

### 1. Graceful Shutdown
- Added SIGTERM and SIGINT handlers
- Proper MongoDB connection cleanup
- Graceful server shutdown

### 2. Better Error Handling
- Server error handlers
- Client error handlers
- Unhandled rejection handlers
- Uncaught exception handlers

### 3. Timeout Settings
- Request timeout: 5 minutes
- Response timeout: 5 minutes
- Server timeout: 5 minutes
- Keep-alive: 65 seconds

### 4. Startup Logging
- Better startup logs
- Environment detection
- MongoDB URI check

## 🔧 Check Render Logs

1. Go to **Render Dashboard**
2. Click your **Web Service**
3. Go to **"Logs"** tab
4. Look for:
   - `✅ Server started successfully`
   - `🔗 MongoDB URI set: true`
   - Any error messages

## 🐛 Common Issues & Solutions

### Issue 1: Server Not Starting
**Check logs for:**
- MongoDB connection errors
- Port already in use
- Missing environment variables

**Solution:**
- Verify MONGODB_URI is set
- Check MongoDB Atlas network access
- Ensure port is available

### Issue 2: Memory Issues
**Symptoms:**
- Server crashes after some time
- "Out of memory" errors

**Solution:**
- Reduce batch size in uploads
- Upgrade Render plan (more memory)
- Optimize code

### Issue 3: Timeout
**Symptoms:**
- 502 after 30 seconds
- Large file uploads fail

**Solution:**
- Timeouts already set to 5 minutes
- Check if file is too large
- Consider chunked uploads

## 📋 Deployment Checklist

- [ ] MONGODB_URI set in Render environment variables
- [ ] MongoDB Atlas network access allows 0.0.0.0/0
- [ ] Service redeployed after fixes
- [ ] Logs show "Server started successfully"
- [ ] Health endpoint works: `/health`
- [ ] No errors in logs

## 🧪 Test After Deploy

1. **Health Check:**
   ```bash
   curl https://your-service.onrender.com/health
   ```

2. **Root Endpoint:**
   ```bash
   curl https://your-service.onrender.com/
   ```

3. **Upload Test:**
   ```bash
   curl -X POST https://your-service.onrender.com/api/voters/upload \
     -F "file=@small-test-file.xlsx"
   ```

## 📊 Monitor

Watch Render logs for:
- ✅ Server startup messages
- ❌ Error messages
- 🔄 MongoDB connection status
- ⏱️ Timeout warnings

## 🆘 If Still Getting 502

1. **Check Logs** - Look for specific error
2. **Verify Environment Variables** - All set correctly
3. **Test MongoDB Connection** - Use test script locally
4. **Check Render Status** - Service might be sleeping (free tier)
5. **Upgrade Plan** - Free tier has limitations

## 💡 Pro Tips

- **Free Tier**: Service sleeps after 15 min inactivity
- **First Request**: May take 30-60 seconds to wake up
- **Logs**: Always check logs first for errors
- **Health Endpoint**: Use `/health` to check status

