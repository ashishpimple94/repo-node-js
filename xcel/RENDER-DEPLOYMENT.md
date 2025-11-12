# Render Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Prepare Your Repository
- Push your code to GitHub/GitLab/Bitbucket
- Make sure all files are committed

### 2. Create Render Account
- Go to [render.com](https://render.com)
- Sign up or log in
- Connect your Git repository

### 3. Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure the service:

   **Basic Settings:**
   - **Name**: `voterlist-api` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` or `master`
   - **Root Directory**: `xcel` (if your code is in xcel folder)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 4. Environment Variables

Click on **"Environment"** tab and add these variables:

```
MONGODB_URI=your_mongodb_connection_string_here
NODE_ENV=production
PORT=3000
MAX_FILE_SIZE_MB=25
```

**Important:**
- Replace `your_mongodb_connection_string_here` with your actual MongoDB connection string
- Format: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority`
- Make sure MongoDB Atlas allows connections from Render IPs (0.0.0.0/0 for all IPs)

### 5. Advanced Settings

**Health Check Path:**
- Set to: `/health`

**Auto-Deploy:**
- Enable if you want automatic deployments on git push

### 6. Deploy

- Click **"Create Web Service"**
- Render will start building and deploying
- Wait for deployment to complete (usually 2-5 minutes)
- Your API will be available at: `https://your-service-name.onrender.com`

## 📋 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | ✅ Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `NODE_ENV` | ❌ No | Environment mode | `production` |
| `PORT` | ❌ No | Server port (Render sets automatically) | `3000` |
| `MAX_FILE_SIZE_MB` | ❌ No | Max upload size in MB | `25` |

## 🔧 MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (free tier is fine)
3. Create a database user
4. Get connection string
5. **Network Access**: Add `0.0.0.0/0` to allow all IPs (or Render's IPs)

## ✅ Verify Deployment

1. **Health Check:**
   ```
   GET https://your-service-name.onrender.com/health
   ```

2. **API Root:**
   ```
   GET https://your-service-name.onrender.com/
   ```

3. **Test Upload:**
   ```
   POST https://your-service-name.onrender.com/api/voters/upload
   Content-Type: multipart/form-data
   file: [your-excel-file]
   ```

## 🐛 Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure `package.json` has correct `start` script
- Verify Node.js version compatibility

### MongoDB Connection Issues
- Check MongoDB Atlas network access (allow 0.0.0.0/0)
- Verify MONGODB_URI is correct
- Check MongoDB user permissions

### File Upload Issues
- Verify MAX_FILE_SIZE_MB is set correctly
- Check Render service plan limits
- Ensure multer is configured for memory storage

### Service Crashes
- Check logs in Render dashboard
- Verify all environment variables are set
- Check MongoDB connection string format

## 📝 API Endpoints

After deployment, your API will be available at:

- **Root**: `https://your-service-name.onrender.com/`
- **Health**: `https://your-service-name.onrender.com/health`
- **Upload**: `POST https://your-service-name.onrender.com/api/voters/upload`
- **Get All**: `GET https://your-service-name.onrender.com/api/voters`
- **Search**: `GET https://your-service-name.onrender.com/api/voters/search?query=...`
- **Get By ID**: `GET https://your-service-name.onrender.com/api/voters/:id`
- **Delete All**: `DELETE https://your-service-name.onrender.com/api/voters`

## 🔄 Auto-Deploy

Render automatically deploys when you push to your connected branch. To disable:
- Go to your service settings
- Disable "Auto-Deploy"

## 💰 Free Tier Limits

- **Sleep after 15 minutes** of inactivity (wakes on next request)
- **512 MB RAM**
- **0.1 CPU**
- **100 GB bandwidth/month**

For production, consider upgrading to a paid plan.

## 📞 Support

- Render Docs: https://render.com/docs
- Render Support: support@render.com




