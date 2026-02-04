<!-- START GENAI -->
# Visa Payment Passkey (VPP) Merchant Demo

A comprehensive Node.js implementation demonstrating Visa Payment Passkey integration for merchants, showcasing FIDO2-based authentication for secure payments.

## Overview

This project implements the core functionalities from the VPP Merchant Implementation Guide:

- VPP session initialization with device profiling
- Passkey registration flow with 3DS authentication  
- Payment authentication using existing passkeys
- Complete web interface with modern UI

## Quick Start

1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Open browser: `http://localhost:3000`
4. Use test card: `4111 1111 1111 1111`

## Project Structure

```
├── server.js              # Express server
├── routes/               # API routes
│   ├── vpp.js           # VPP endpoints
│   ├── auth.js          # Authentication
│   └── passkey.js       # Passkey management
├── services/            # Business logic
│   ├── VPPService.js    # VPP API integration
│   └── AuthService.js   # Authentication service
└── public/              # Web interface
    ├── index.html       # Main page
    ├── styles.css       # Styling
    └── app.js           # Client-side logic
```

## Features

### VPP Integration
- Initialization with FIDO eligibility check
- Device profiling and session creation
- Pushed Authorization Request (PAR) implementation
- Iframe and popup integration patterns

### Security
- JWT-based session management
- CORS and CSP security headers
- Input validation and sanitization
- Secure credential handling

### User Experience
- Modern, responsive web interface
- Step-by-step flow indicators
- Real-time status updates
- Mobile-friendly design

## Configuration

Update `.env` file with your VDC credentials:

```env
VDC_API_KEY=your_api_key
VDC_SHARED_SECRET=your_shared_secret
VPP_APN=your_apn
VPP_CLIENT_ID=your_client_id
```

## Browser Support

Requires WebAuthn API support:
- Chrome 67+, Firefox 60+, Safari 14+, Edge 18+
- Device with platform authenticator (biometrics/PIN)

## Important Notes

- This is a demonstration implementation
- Production deployment requires real VDC credentials
- HTTPS required for WebAuthn in production
- Includes simulated responses for demo purposes

## Support

For VPP questions: VisaPasskeySupport@visa.com
EOF

<!-- END GENAI -->
