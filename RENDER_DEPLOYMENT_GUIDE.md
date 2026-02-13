# Render.com Deployment Guide

This guide will walk you through deploying your Visa Payment Passkey (VPP) Merchant application to Render.com.

## Prerequisites

1. A [Render.com](https://render.com) account (free tier available)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Your VPP credentials and configuration values from Visa Developer Center

## Deployment Steps

### 1. Push Your Code to Git Repository

If you haven't already, initialize a git repository and push your code:

```bash
git init
git add .
git commit -m "Initial commit - VPP Merchant Implementation"
git remote add origin <your-repository-url>
git push -u origin main
```

**Important:** Make sure your `.env` file is in `.gitignore` to avoid committing sensitive credentials.

### 2. Create a New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** button and select **"Web Service"**
3. Connect your Git repository
4. Select the repository containing your VPP application

### 3. Configure Your Web Service

Use the following settings:

- **Name:** `visa-payment-passkey-merchant` (or your preferred name)
- **Region:** Choose the region closest to your users
- **Branch:** `main` (or your default branch)
- **Root Directory:** Leave blank (unless your app is in a subdirectory)
- **Environment:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Plan:** Free (or select a paid plan for production)

### 4. Configure Environment Variables

In the Render dashboard, add the following environment variables:

#### Required Environment Variables

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-set by Render) | `10000` |
| `VPP_ENVIRONMENT` | VPP environment | `sandbox` or `production` |
| `MERCHANT_NAME` | Your merchant name | `Your Merchant Name` |
| `MERCHANT_ORIGIN` | Your deployed app URL | `https://your-app.onrender.com` |
| `INTEGRATOR_ORIGIN` | Same as merchant origin | `https://your-app.onrender.com` |
| `VPP_APN` | Application Package Name (lowercase) | `your_apn_from_visa` |
| `VPP_CLIENT_ID` | Client ID from VPP onboarding | `your_client_id` |
| `VPP_CLIENT_VERSION` | Client version from VPP onboarding | `1.0.0` |
| `VPP_PRODUCT_CODE` | Product code from VPP onboarding | `your_product_code` |
| `VDC_API_KEY` | Visa Developer Center API Key | `your_vdc_api_key` |
| `VDC_SHARED_SECRET` | Visa Developer Center Shared Secret | `your_vdc_shared_secret` |
| `VDC_USER_ID` | Visa Developer Center User ID | `your_vdc_user_id` |
| `VPP_BASIC_AUTH_USERNAME` | Basic auth username for PA API | `your_username` |
| `VPP_BASIC_AUTH_PASSWORD` | Basic auth password for PA API | `your_password` |

#### Optional Environment Variables (with defaults)

| Variable Name | Default Value | Description |
|--------------|---------------|-------------|
| `VPP_BASE_URL_SANDBOX` | `https://sandbox.auth.visa.com` | Sandbox auth URL |
| `VPP_API_BASE_URL_SANDBOX` | `https://sandbox.api.visa.com/passkey` | Sandbox API URL |
| `VPP_BASE_URL_PROD` | `https://auth.visa.com` | Production auth URL |
| `VPP_API_BASE_URL_PROD` | `https://api.visa.com/passkey` | Production API URL |
| `FIDO2_TIMEOUT` | `360000` | FIDO2 timeout in milliseconds |
| `FIDO2_RP_NAME` | `VPP Merchant Demo` | Relying Party name |
| `SESSION_TIMEOUT` | `900` | Session timeout in seconds |
| `VPP_REJECT_UNAUTHORIZED` | `true` | Reject unauthorized SSL certs |
| `DEBUG_MODE` | `false` | Enable debug logging |
| `LOG_LEVEL` | `info` | Logging level |

**Note:** Render will auto-generate `JWT_SECRET` if you use the `render.yaml` configuration file.

### 5. Deploy Using render.yaml (Recommended)

The project includes a `render.yaml` file for automated deployment:

1. In your Render dashboard, go to **"Blueprint"** → **"New Blueprint Instance"**
2. Connect your repository
3. Render will automatically detect the `render.yaml` file
4. Review the configuration and click **"Apply"**
5. Add the required environment variables marked with `sync: false`

### 6. Manual Deployment (Alternative)

If not using `render.yaml`:

1. Click **"Create Web Service"** after configuring settings
2. Render will automatically build and deploy your application
3. Monitor the deployment logs for any errors

### 7. Update MERCHANT_ORIGIN After Deployment

After your first deployment:

1. Note your Render URL (e.g., `https://your-app.onrender.com`)
2. Update the following environment variables with your actual URL:
   - `MERCHANT_ORIGIN`
   - `INTEGRATOR_ORIGIN`
3. Trigger a manual deploy or wait for auto-deploy

### 8. SSL Certificates

**Good news!** Render.com automatically provides free SSL certificates for all web services. Your application will be accessible via HTTPS without any additional configuration.

The modified `server.js` automatically detects production mode and uses HTTP (since Render handles SSL termination), while using HTTPS locally for development.

## Verification

### 1. Check Health Endpoint

Visit your deployed application's health endpoint:
```
https://your-app.onrender.com/health
```

You should see:
```json
{
  "status": "OK",
  "timestamp": "2026-02-13T17:48:22.000Z",
  "service": "VPP Merchant Implementation",
  "version": "1.0.0"
}
```

### 2. Access the Application

Visit your application:
```
https://your-app.onrender.com
```

### 3. Check Logs

Monitor your application logs in the Render dashboard:
1. Go to your web service
2. Click on **"Logs"** tab
3. Look for startup messages confirming the server is running

## Troubleshooting

### Common Issues

#### 1. Build Fails
- **Check Node version:** Ensure your `package.json` specifies `"engines": { "node": ">=16.0.0" }`
- **Check dependencies:** Run `npm install` locally to verify all dependencies install correctly

#### 2. Application Crashes on Startup
- **Check environment variables:** Ensure all required variables are set
- **Review logs:** Check Render logs for specific error messages
- **SSL certificates:** The app will run without SSL certs in production mode

#### 3. VPP API Calls Fail
- **Verify credentials:** Double-check VDC API keys and VPP credentials
- **Check environment:** Ensure `VPP_ENVIRONMENT` matches your credentials (sandbox vs production)
- **CORS issues:** Update `MERCHANT_ORIGIN` to match your Render URL

#### 4. Free Tier Limitations
- **Spin down:** Free tier services spin down after 15 minutes of inactivity
- **Cold starts:** First request after spin down may take 30-60 seconds
- **Upgrade:** Consider paid plans for production use

## Environment-Specific Configuration

### Sandbox (Testing)
```bash
VPP_ENVIRONMENT=sandbox
VPP_BASE_URL_SANDBOX=https://sandbox.auth.visa.com
VPP_API_BASE_URL_SANDBOX=https://sandbox.api.visa.com/passkey
```

### Production
```bash
VPP_ENVIRONMENT=production
VPP_BASE_URL_PROD=https://auth.visa.com
VPP_API_BASE_URL_PROD=https://api.visa.com/passkey
```

## Continuous Deployment

Render automatically deploys your application when you push to your connected Git branch:

1. Make changes to your code
2. Commit and push to your repository
3. Render automatically detects changes and redeploys
4. Monitor deployment progress in the Render dashboard

## Security Best Practices

1. **Never commit `.env` files** - Use Render's environment variables
2. **Use strong secrets** - Let Render generate `JWT_SECRET`
3. **Enable HTTPS only** - Render provides this by default
4. **Rotate credentials** - Regularly update API keys and secrets
5. **Monitor logs** - Check for suspicious activity
6. **Use production credentials carefully** - Test thoroughly in sandbox first

## Scaling

### Free Tier
- 512 MB RAM
- Shared CPU
- Spins down after 15 minutes of inactivity

### Paid Tiers
- More RAM and CPU
- No spin down
- Better performance
- Custom domains
- Priority support

## Custom Domain (Optional)

To use your own domain:

1. Go to your web service settings
2. Click **"Custom Domain"**
3. Add your domain
4. Update DNS records as instructed
5. Render automatically provisions SSL certificate

## Monitoring

### Built-in Monitoring
- **Logs:** Real-time application logs
- **Metrics:** CPU, memory, and bandwidth usage
- **Alerts:** Set up email notifications for issues

### Health Checks
Render automatically monitors your `/health` endpoint and restarts if it fails.

## Support

- **Render Documentation:** https://render.com/docs
- **Render Community:** https://community.render.com
- **Visa Developer Center:** https://developer.visa.com

## Next Steps

1. ✅ Deploy to Render
2. ✅ Verify health endpoint
3. ✅ Test VPP initialization flow
4. ✅ Test passkey registration
5. ✅ Test payment authentication
6. 🚀 Go live!

---

**Note:** This application requires valid Visa Payment Passkey credentials from Visa Developer Center. Ensure you have completed VPP onboarding before deploying to production.
