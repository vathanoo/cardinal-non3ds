<!-- START GENAI -->
# Hosts File Update Guide

## ⚠️ NOTE: This guide is no longer required

**The application now uses `localhost` directly instead of a custom domain, so you don't need to update your hosts file.**

~~Due to browser security changes mandated by cyber security, you need to update your hosts file to map `simulator.vpps.com` to `127.0.0.1`.~~

## For macOS (Your Current System)

### Steps:

1. **Open Terminal** (if not already open)

2. **Edit the hosts file with admin privileges:**
   ```bash
   sudo nano /etc/hosts
   ```
   
3. **Enter your admin password** when prompted

4. **Navigate to the bottom of the file** using arrow keys

5. **Add this line at the bottom (NOT NEEDED ANYMORE):**
   ```
   127.0.0.1       localhost
   ```

6. **Save and exit:**
   - Press `Ctrl + O` (to write/save)
   - Press `Enter` (to confirm)
   - Press `Ctrl + X` (to exit)

7. **Verify the change:**
   ```bash
   cat /etc/hosts | grep simulator
   ```
   
   You should see:
   ```
   127.0.0.1       simulator.vpps.com
   ```

8. **Flush DNS cache (optional but recommended):**
   ```bash
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   ```

9. **Test the mapping:**
   ```bash
   ping simulator.vpps.com
   ```
   
   You should see responses from `127.0.0.1`

---

## For Windows (Reference)

If you need to do this on Windows:

1. **Open Notepad as Administrator**
   - Right-click on Notepad
   - Select "Run as administrator"

2. **Open the hosts file:**
   - Go to File > Open
   - Navigate to: `C:\Windows\System32\drivers\etc\`
   - Change file type filter to "All Files (*.*)"
   - Select `hosts` file and open it

3. **Add this line at the bottom:**
   ```
   127.0.0.1       simulator.vpps.com
   ```

4. **Save the file:**
   - File > Save

5. **Flush DNS cache:**
   - Open Command Prompt as Administrator
   - Run: `ipconfig /flushdns`

---

## What This Does

- Maps the domain `simulator.vpps.com` to your local machine (`127.0.0.1`)
- Allows the VPP service to work with a proper domain name instead of `localhost`
- Satisfies browser security requirements for redirect URIs
- This is a **one-time setup** - you won't need to do this again

## After Updating Hosts File

~~Once you've updated the hosts file, the application configuration has been automatically updated to use `https://simulator.vpps.com:3000` instead of `https://localhost:3000`.~~

**The application now uses `https://localhost:3000` directly:**

1. Start the server: `node server.js`
2. Access the application at: `https://localhost:3000`
3. Accept the self-signed certificate warning in your browser

---

## Troubleshooting

### If ping doesn't work:
- Make sure there are no typos in the hosts file
- Ensure there's proper spacing (use tabs or spaces consistently)
- Try flushing DNS cache again

### If browser can't connect:
- Make sure the server is running on port 3000
- Check that you're using `https://` (not `http://`)
- Accept the self-signed certificate warning

### To remove the entry later:
- Edit `/etc/hosts` again with sudo
- Delete or comment out the line (add `#` at the beginning)
- Save and flush DNS cache

<!-- END GENAI -->
