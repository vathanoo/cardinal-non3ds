# Migration from localhost to simulator.vpps.com

## Overview

This document summarizes the changes made to fix the VPP service redirect_uri issue when using `localhost`. Due to browser security changes mandated by cyber security requirements, the application has been migrated from using `localhost` to `simulator.vpps.com`.

---

## Problem Statement

The VPP (Visa Payment Passkey) service was unable to accept redirect URIs with `localhost` as the origin due to enhanced browser security policies. This prevented the proper functioning of the OAuth2 authorization flow and passkey operations.

---

## Solution

The solution involves two main steps:

### 1. **Hosts File Configuration** (Manual Step Required)
Map `simulator.vpps.com` to `127.0.0.1` in the system hosts file.

### 2. **Application Configuration Updates** (Completed Automatically)
Update all configuration files and code to use `simulator.vpps.com` instead of `localhost`.

---

## Changes Made

### 1. `.env` File Updates

**Changed:**
- `ALLOWED_ORIGINS`: `https://localhost:3000,http://localhost:3000` → `https://simulator.vpps.com:3000,http://simulator.vpps.com:3000`
- `MERCHANT_ORIGIN`: `https://localhost:3000` → `https://simulator.vpps.com:3000`
- `INTEGRATOR_ORIGIN`: `https://localhost:3000` → `https://simulator.vpps.com:3000`

**Impact:** All server-side configuration now uses the new domain for CORS, merchant identification, and OAuth2 redirects.

---

### 2. `server.js` Updates

**Changed:**
- Server startup message now displays: `https://simulator.vpps.com:3000` instead of `https://localhost:3000`
- Added warning message about hosts file requirement

**New Output:**
```
🚀 VPP Merchant Server running on port 3000 (HTTPS)
📱 Access the demo at: https://simulator.vpps.com:3000
🏥 Health check: https://simulator.vpps.com:3000/health

⚠️  IMPORTANT: Make sure you have updated /etc/hosts file
   Add this line: 127.0.0.1       simulator.vpps.com
   See HOSTS_FILE_UPDATE_GUIDE.md for instructions
```

**Impact:** Clear guidance for users on how to access the application and what prerequisites are needed.

---

### 3. `public/app.js` Updates

**Changed:**
- Updated `allowedOrigins` array in `handleVPPMessage()` method
- Replaced: `'http://localhost:3000', 'http://localhost'`
- With: `'https://simulator.vpps.com:3000', 'http://simulator.vpps.com:3000'`

**Impact:** The client-side application now accepts postMessage communications from the new domain, ensuring VPP iframe messages are properly received.

---

### 4. New Documentation Files Created

#### `HOSTS_FILE_UPDATE_GUIDE.md`
Comprehensive guide for updating the hosts file on both macOS and Windows, including:
- Step-by-step instructions with commands
- Verification steps
- DNS cache flushing procedures
- Troubleshooting tips

#### `LOCALHOST_TO_SIMULATOR_MIGRATION.md` (This File)
Complete documentation of all changes made during the migration.

---

## Required Manual Steps

### ⚠️ CRITICAL: Update Hosts File

You **must** update your system's hosts file before the application will work. This is a **one-time setup**.

#### For macOS:

```bash
# 1. Open hosts file with admin privileges
sudo nano /etc/hosts

# 2. Add this line at the bottom:
127.0.0.1       simulator.vpps.com

# 3. Save: Ctrl+O, Enter, Ctrl+X

# 4. Flush DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 5. Verify
ping simulator.vpps.com
```

#### For Windows:

```
1. Open Notepad as Administrator
2. Open: C:\Windows\System32\drivers\etc\hosts
3. Add at bottom: 127.0.0.1       simulator.vpps.com
4. Save the file
5. Run in Command Prompt (Admin): ipconfig /flushdns
```

**See `HOSTS_FILE_UPDATE_GUIDE.md` for detailed instructions.**

---

## How to Use After Migration

### 1. Update Hosts File (One-Time)
Follow the instructions above or in `HOSTS_FILE_UPDATE_GUIDE.md`

### 2. Start the Server
```bash
node server.js
```

### 3. Access the Application
Open your browser and navigate to:
```
https://simulator.vpps.com:3000
```

### 4. Accept SSL Certificate
Since this is a self-signed certificate, you'll need to accept the browser warning:
- Chrome: Click "Advanced" → "Proceed to simulator.vpps.com (unsafe)"
- Firefox: Click "Advanced" → "Accept the Risk and Continue"
- Safari: Click "Show Details" → "visit this website"

---

## Technical Details

### Why This Change Was Necessary

1. **Browser Security Policies**: Modern browsers have implemented stricter security policies around `localhost` origins, particularly for OAuth2 flows and cross-origin communications.

2. **VPP Service Requirements**: The Visa Payment Passkey service requires proper domain names for redirect URIs to ensure secure authentication flows.

3. **Production Parity**: Using a domain name (even if mapped locally) better simulates production environments where actual domain names are used.

### How It Works

1. **Hosts File Mapping**: The hosts file tells your operating system to resolve `simulator.vpps.com` to `127.0.0.1` (localhost) before making any DNS queries.

2. **Local Resolution**: When you access `https://simulator.vpps.com:3000`, your browser:
   - Checks the hosts file first
   - Finds the mapping to `127.0.0.1`
   - Connects to your local server on port 3000
   - Uses `simulator.vpps.com` as the origin for all security checks

3. **Security Context**: The browser treats `simulator.vpps.com` as a proper domain, allowing:
   - Proper CORS handling
   - OAuth2 redirect URI validation
   - PostMessage origin verification
   - Cookie and session management

---

## Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `.env` | Updated ALLOWED_ORIGINS, MERCHANT_ORIGIN, INTEGRATOR_ORIGIN | Server configuration |
| `server.js` | Updated startup messages, added hosts file warning | User guidance |
| `public/app.js` | Updated allowedOrigins in handleVPPMessage() | Client-side security |
| `HOSTS_FILE_UPDATE_GUIDE.md` | New file | User instructions |
| `LOCALHOST_TO_SIMULATOR_MIGRATION.md` | New file | Migration documentation |

---

## Verification Checklist

After completing the migration, verify the following:

- [ ] Hosts file has been updated with `127.0.0.1       simulator.vpps.com`
- [ ] DNS cache has been flushed
- [ ] `ping simulator.vpps.com` resolves to `127.0.0.1`
- [ ] Server starts without errors
- [ ] Application is accessible at `https://simulator.vpps.com:3000`
- [ ] SSL certificate warning can be accepted
- [ ] Login functionality works
- [ ] VPP initialization completes successfully
- [ ] No CORS errors in browser console
- [ ] PostMessage communications work (check console logs)

---

## Troubleshooting

### Issue: Cannot access simulator.vpps.com

**Solution:**
1. Verify hosts file entry: `cat /etc/hosts | grep simulator`
2. Flush DNS cache (see commands above)
3. Try `ping simulator.vpps.com` - should show `127.0.0.1`
4. Restart your browser

### Issue: SSL Certificate Error

**Solution:**
This is expected with self-signed certificates. Click "Advanced" and proceed to the site. The certificate is valid for local development.

### Issue: CORS Errors

**Solution:**
1. Verify `.env` file has correct ALLOWED_ORIGINS
2. Restart the server after any `.env` changes
3. Clear browser cache and reload

### Issue: VPP Messages Not Received

**Solution:**
1. Check browser console for origin mismatch warnings
2. Verify `public/app.js` has correct allowedOrigins
3. Ensure you're accessing via `https://simulator.vpps.com:3000` (not localhost)

---

## Rollback Instructions

If you need to revert to localhost:

1. **Remove hosts file entry:**
   ```bash
   sudo nano /etc/hosts
   # Delete or comment out the simulator.vpps.com line
   ```

2. **Revert `.env` changes:**
   ```bash
   ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3000
   MERCHANT_ORIGIN=https://localhost:3000
   INTEGRATOR_ORIGIN=https://localhost:3000
   ```

3. **Revert `public/app.js`:**
   Change allowedOrigins back to include `'http://localhost:3000', 'http://localhost'`

4. **Restart server and access via `https://localhost:3000`**

---

## Production Deployment Notes

When deploying to production:

1. **Do NOT use simulator.vpps.com** - this is for local development only
2. Update `.env` with your actual production domain
3. Use proper SSL certificates (not self-signed)
4. Update VPP service configuration with production redirect URIs
5. Ensure DNS is properly configured for your domain

---

## Support

For issues or questions:
1. Check `HOSTS_FILE_UPDATE_GUIDE.md` for detailed setup instructions
2. Review browser console for error messages
3. Check server logs for backend errors
4. Verify all configuration files have been updated correctly

---

## Summary

This migration ensures the VPP service works correctly with modern browser security requirements by:
- Using a proper domain name instead of `localhost`
- Maintaining local development convenience through hosts file mapping
- Providing clear documentation and troubleshooting guidance
- Ensuring all configuration is consistent across the application

**Next Step:** Follow the instructions in `HOSTS_FILE_UPDATE_GUIDE.md` to update your hosts file, then start the server and access the application at `https://simulator.vpps.com:3000`.
