# 🔧 Render MongoDB Connection Setup

## Error
```
"error": "MONGODB_URI environment variable is not set"
```

## Solution

### Step 1: Get Your MongoDB Connection String

Your MongoDB connection string is:
```
mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
```

### Step 2: Add to Render Environment Variables

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click on your **Web Service**
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add these variables:

#### Required:
```
Key: MONGODB_URI
Value: mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
```

#### Optional (but recommended):
```
Key: NODE_ENV
Value: production

Key: RENDER
Value: true

Key: MAX_FILE_SIZE_MB
Value: 25
```

### Step 3: Save and Redeploy

1. Click **"Save Changes"**
2. Render will automatically redeploy
3. Wait for deployment to complete (2-5 minutes)

### Step 4: Verify

Test the API:
```bash
curl https://your-service.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "mongodb": {
    "state": "connected"
  }
}
```

## MongoDB Atlas Setup

### 1. Network Access
1. Go to **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. Click **"Network Access"** in left menu
3. Click **"Add IP Address"**
4. Click **"Allow Access from Anywhere"** (adds 0.0.0.0/0)
5. Click **"Confirm"**

### 2. Database User
- **Username**: Voterlist2
- **Password**: Test123 (case-sensitive: capital T)
- Make sure user has **read/write** permissions

### 3. Connection String Format
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

Your connection string:
```
mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
```

## Troubleshooting

### Still Getting Error?

1. **Check Environment Variables**:
   - Go to Render → Your Service → Environment
   - Verify `MONGODB_URI` is set correctly
   - No extra spaces or quotes

2. **Check MongoDB Atlas**:
   - Network Access allows 0.0.0.0/0
   - Database user exists and password is correct
   - Cluster is running

3. **Redeploy**:
   - After setting environment variables, redeploy service
   - Check logs for connection errors

4. **Test Connection**:
   ```bash
   # Test health endpoint
   curl https://your-service.onrender.com/health
   
   # Should show MongoDB connected
   ```

## Quick Checklist

- [ ] MONGODB_URI set in Render environment variables
- [ ] MongoDB Atlas Network Access allows 0.0.0.0/0
- [ ] Database user (Voterlist2) exists with correct password
- [ ] Service redeployed after setting environment variables
- [ ] Health endpoint shows MongoDB connected

## Need Help?

Check Render logs:
- Go to Render Dashboard → Your Service → Logs
- Look for MongoDB connection errors
- Check for "MONGODB_URI" in logs

