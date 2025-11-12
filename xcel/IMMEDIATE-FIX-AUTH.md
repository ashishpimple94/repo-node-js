# 🚨 IMMEDIATE FIX: MongoDB Authentication Error

## Current Error
```
"Database authentication failed"
"Invalid username or password"
```

## ⚡ QUICK FIX (3 Steps)

### Step 1: Check MongoDB Atlas Password

1. Go to **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. Click **"Database Access"** (left sidebar)
3. Find user **"Voterlist2"**
4. Click on the user
5. **Check the password** - Is it really `Test123`?

### Step 2: Reset Password (Recommended)

1. In MongoDB Atlas → Database Access → Voterlist2
2. Click **"Edit"** button
3. Click **"Edit Password"**
4. Set password to: `Test123` (or remember what you set)
5. Click **"Update User"**

### Step 3: Update Render

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click your **Web Service**
3. Go to **"Environment"** tab
4. Find **"MONGODB_URI"**
5. Click **"Edit"** or delete and recreate
6. Set value to:
   ```
   mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
   ```
7. Click **"Save Changes"**
8. Wait for auto-redeploy (2-5 minutes)

## 🔍 Verify Password

Run this locally to test:
```bash
node fix-mongodb-auth.js
```

This will test different password combinations and tell you which one works.

## ⚠️ Common Issues

### Issue 1: Password is Different
- Maybe password is `test123` (lowercase) not `Test123`
- Maybe password is `test12345` (old one)
- **Solution**: Check MongoDB Atlas or reset password

### Issue 2: Special Characters
If password has `@`, `#`, `$`, etc.:
- `@` → Use `%40`
- `#` → Use `%23`
- `$` → Use `%24`

Example: Password `Test@123` → Use `Test%40123` in connection string

### Issue 3: User Doesn't Exist
- Check if user "Voterlist2" exists in MongoDB Atlas
- If not, create new user with read/write permissions

### Issue 4: Wrong Username
- Verify username is exactly `Voterlist2` (case-sensitive)
- Check for typos

## ✅ After Fixing

Test the connection:
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

## 📋 Checklist

- [ ] Checked MongoDB Atlas → Database Access → Voterlist2
- [ ] Verified/reset password
- [ ] Updated MONGODB_URI in Render
- [ ] Saved changes
- [ ] Service redeployed
- [ ] Health endpoint shows "connected"

## 🆘 Still Not Working?

1. **Create New User** in MongoDB Atlas:
   - Username: `Voterlist2` (or new name)
   - Password: `Test123` (simple, no special chars)
   - Permissions: Read/Write
   - Update connection string with new credentials

2. **Test Locally**:
   ```bash
   node fix-mongodb-auth.js
   ```

3. **Check Render Logs** for detailed error messages




