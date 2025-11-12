# 🚀 Vercel MongoDB Setup - Quick Guide

## ✅ MongoDB Connection String

```
mongodb+srv://ashishpimple94_db_user:test12345@cluster0.pwonikt.mongodb.net/voterdata?retryWrites=true&w=majority&appName=Cluster0
```

## 📋 Vercel mein Setup kaise karein:

### Step 1: Vercel Dashboard
1. https://vercel.com/dashboard pe jao
2. Apne project pe click karo
3. **Settings** → **Environment Variables**

### Step 2: MONGODB_URI Add karo
1. **Add New** button click karo
2. Fill karo:
   - **Key**: `MONGODB_URI`
   - **Value**: 
     ```
     mongodb+srv://ashishpimple94_db_user:test12345@cluster0.pwonikt.mongodb.net/voterdata?retryWrites=true&w=majority&appName=Cluster0
     ```
   - **Environment**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
     (Teeno select karo)
3. **Save** click karo

### Step 3: Redeploy (IMPORTANT!)
1. **Deployments** tab pe jao
2. Latest deployment pe three dots (⋯) click karo
3. **Redeploy** click karo
4. Wait karo (2-3 minutes)

## 🔍 Connection String Details:

- **Username**: `ashishpimple94_db_user`
- **Password**: `test12345`
- **Cluster**: `cluster0.pwonikt.mongodb.net`
- **Database**: `voterdata`
- **Options**: `retryWrites=true&w=majority&appName=Cluster0`

## ✅ Verify Setup:

### Method 1: Health Check
```bash
curl https://your-project.vercel.app/health
```

Expected response:
```json
{
  "status": "ok",
  "mongodb": {
    "state": "connected",
    "hasUri": true
  }
}
```

### Method 2: Check Vercel Logs
1. Vercel Dashboard → **Deployments**
2. Latest deployment click karo
3. **Logs** tab check karo
4. Look for: `✅ MongoDB Connected successfully`

## ⚠️ Important Notes:

1. **Quotes mat lagao** - Direct paste karo
2. **Spaces mat rakho** - Leading/trailing spaces avoid karo
3. **Redeploy zaroori hai** - Environment variables add karne ke baad redeploy karna zaroori hai
4. **MongoDB Atlas Network Access** - `0.0.0.0/0` allow karo (ya Vercel IPs)

## 🐛 Troubleshooting:

### Connection Failed?
1. MongoDB Atlas → **Network Access** → Add `0.0.0.0/0`
2. Verify username/password
3. Check connection string format
4. Redeploy after changes

### Invalid Scheme Error?
1. Check karo ki quotes nahi lagaye
2. Leading/trailing spaces remove karo
3. Connection string sahi format mein hai

## 📝 Quick Copy:

**For Vercel Environment Variable:**
```
MONGODB_URI=mongodb+srv://ashishpimple94_db_user:test12345@cluster0.pwonikt.mongodb.net/voterdata?retryWrites=true&w=majority&appName=Cluster0
```

---

**Note**: Password `test12345` hai (lowercase, no special characters)

