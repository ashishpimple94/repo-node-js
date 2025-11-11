# 🚨 QUICK FIX: Render MongoDB Connection Error

## Error
```
"error": "MONGODB_URI environment variable is not set"
```

## ⚡ IMMEDIATE SOLUTION

### Step 1: Go to Render Dashboard
1. Open: https://dashboard.render.com
2. Click on your **Web Service**

### Step 2: Add Environment Variable
1. Click **"Environment"** tab (left sidebar)
2. Click **"Add Environment Variable"** button
3. Fill in:
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority`
4. Click **"Save Changes"**

### Step 3: Redeploy
- Render will **automatically redeploy** after saving
- Wait 2-5 minutes for deployment

### Step 4: Test
```bash
curl https://your-service.onrender.com/health
```

## ✅ Complete Environment Variables List

Add these in Render:

```
MONGODB_URI=mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
NODE_ENV=production
RENDER=true
MAX_FILE_SIZE_MB=25
```

## 🔍 Verify It's Set

After setting, check:
1. Go to Environment tab
2. You should see `MONGODB_URI` in the list
3. Value should start with `mongodb+srv://`

## ⚠️ Common Mistakes

1. **Extra spaces**: No spaces before/after the value
2. **Quotes**: Don't add quotes around the value
3. **Copy-paste**: Make sure entire string is copied
4. **Redeploy**: Must redeploy after setting

## 🎯 That's It!

After setting `MONGODB_URI` and redeploying, the error will be fixed!


