# 🚀 Render Deployment - Quick Start

## Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

## Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

## Step 3: Create Web Service

### Basic Settings:
- **Name**: `voterlist-api`
- **Region**: Choose closest region
- **Branch**: `main`
- **Root Directory**: `xcel` ⚠️ (if your code is in xcel folder)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Environment Variables:
Click **"Environment"** tab and add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
NODE_ENV=production
MAX_FILE_SIZE_MB=25
RENDER=true
```

**⚠️ IMPORTANT:** Replace `MONGODB_URI` with your actual MongoDB connection string!

### Advanced Settings:
- **Health Check Path**: `/health`
- **Auto-Deploy**: ✅ Enable

## Step 4: Deploy
Click **"Create Web Service"** and wait 2-5 minutes.

## Step 5: Test
Your API will be at: `https://your-service-name.onrender.com`

Test health:
```bash
curl https://your-service-name.onrender.com/health
```

## 🔧 MongoDB Setup

1. **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. **Network Access**: Add `0.0.0.0/0` (allow all IPs)
3. **Database User**: Create user with read/write permissions
4. **Connection String**: Copy and use in Render environment variables

## 📋 Environment Variables Checklist

- [ ] `MONGODB_URI` - Your MongoDB connection string
- [ ] `NODE_ENV` - Set to `production`
- [ ] `MAX_FILE_SIZE_MB` - Optional (default: 25)
- [ ] `RENDER` - Optional (set to `true`)

## ✅ Verify Deployment

1. **Health Check**: `GET /health`
2. **API Root**: `GET /`
3. **Upload Test**: `POST /api/voters/upload`

## 🐛 Common Issues

**Build Fails:**
- Check Root Directory is set to `xcel`
- Verify `package.json` has `start` script

**MongoDB Connection Fails:**
- Check MongoDB Atlas Network Access (allow 0.0.0.0/0)
- Verify MONGODB_URI is correct
- Check username/password in connection string

**Service Crashes:**
- Check logs in Render dashboard
- Verify all environment variables are set
- Check MongoDB connection string format

## 📞 Need Help?

- See `RENDER-DEPLOYMENT.md` for detailed guide
- See `RENDER-ENV-SETUP.txt` for environment variables reference


