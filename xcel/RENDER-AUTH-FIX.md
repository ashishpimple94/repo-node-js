# 🔐 Render MongoDB Authentication Error Fix

## Error
```
"message": "Database authentication failed"
"error": "Invalid username or password. Please check MONGODB_URI."
```

## 🔍 Common Causes

1. **Wrong Username/Password** - Credentials don't match MongoDB Atlas
2. **Special Characters in Password** - Need URL encoding (@, #, $, %, etc.)
3. **User Doesn't Exist** - Database user was deleted
4. **Password Changed** - Password was reset in MongoDB Atlas
5. **Connection String Format** - Incorrect format in environment variable

## ✅ Step-by-Step Fix

### Step 1: Verify MongoDB Atlas User

1. Go to **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
2. Click **"Database Access"** (left menu)
3. Find user **"Voterlist2"**
4. Check if user exists and is active

### Step 2: Reset Password (if needed)

1. Click on user **"Voterlist2"**
2. Click **"Edit"** or **"Reset Password"**
3. Set new password (remember it!)
4. Click **"Update User"**

### Step 3: URL Encode Password (if has special characters)

If password has special characters, encode them:

| Character | URL Encoded |
|-----------|-------------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |
| `/` | `%2F` |
| ` ` (space) | `%20` |

**Example:**
- Password: `Test@123` → Use: `Test%40123`
- Password: `My#Pass` → Use: `My%23Pass`

### Step 4: Update Render Environment Variable

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click your **Web Service**
3. Go to **"Environment"** tab
4. Find **"MONGODB_URI"** variable
5. Click **"Edit"** or delete and recreate
6. Update the connection string:

**If password is `Test123` (no special chars):**
```
mongodb+srv://Voterlist2:Test123@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
```

**If password has special characters (URL encoded):**
```
mongodb+srv://Voterlist2:URL_ENCODED_PASSWORD@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
```

### Step 5: Save and Redeploy

1. Click **"Save Changes"**
2. Render will auto-redeploy
3. Wait 2-5 minutes

## 🧪 Test Connection

After redeploy, test:
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

## 🔧 Quick Password Reset

If you forgot the password:

1. **MongoDB Atlas** → **Database Access**
2. Click **"Voterlist2"** user
3. Click **"Edit"** → **"Edit Password"**
4. Set new password: `Test123` (or your choice)
5. **Update MONGODB_URI** in Render with new password
6. **Redeploy**

## 📋 Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

**Your format:**
```
mongodb+srv://Voterlist2:<PASSWORD>@cluster0.ezzkjmw.mongodb.net/voterdata?retryWrites=true&w=majority
```

Replace `<PASSWORD>` with actual password (URL encoded if needed).

## ⚠️ Important Notes

1. **Password is case-sensitive**: `Test123` ≠ `test123`
2. **No quotes**: Don't add quotes around the connection string
3. **No spaces**: Remove any spaces before/after
4. **Special chars**: Must be URL encoded
5. **User permissions**: User must have read/write access

## 🐛 Still Not Working?

1. **Check Render Logs**: Look for detailed error messages
2. **Test locally**: Use `node test-db-connection.js`
3. **Verify in Atlas**: User exists and is active
4. **Network Access**: Allow 0.0.0.0/0 in MongoDB Atlas
5. **Try new user**: Create a new database user and test

## ✅ Checklist

- [ ] User "Voterlist2" exists in MongoDB Atlas
- [ ] Password is correct (case-sensitive)
- [ ] Special characters are URL encoded
- [ ] MONGODB_URI updated in Render
- [ ] Service redeployed
- [ ] Health endpoint shows "connected"


