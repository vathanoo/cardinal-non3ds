// START GENAI
const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const https = require('https');
const jwt = require('jsonwebtoken');
const MLEService = require('./MLEService');

class VPPService {
    constructor() {
        this.baseUrl = process.env.VPP_ENVIRONMENT === 'sandbox' 
            ? process.env.VPP_API_BASE_URL_SANDBOX 
            : process.env.VPP_API_BASE_URL_PROD;
            
        this.apiKey = process.env.VDC_API_KEY;
        this.sharedSecret = process.env.VDC_SHARED_SECRET;
        this.userId = process.env.VDC_USER_ID;
        
        // Basic Authentication credentials
        this.basicAuthUsername = process.env.VPP_BASIC_AUTH_USERNAME || 'IC2SI1RB5JKAKL5SKJ1T21uoRgNp2xruV18Gc3TpzAYaszxEo';
        this.basicAuthPassword = process.env.VPP_BASIC_AUTH_PASSWORD || 'xLe5f0Vypq5H0JD8Ipg7TOr1ltyYHrMn';
        
        // Configure 2-Way SSL (Mutual TLS)
        this.httpsAgent = null;
        try {
            const certPath = path.join(__dirname, '../certs/cert.pem');
            const keyPath = path.join(__dirname, '../certs/privateKey-d0a286b0-a2e4-4720-9943-52c87b5a7d94.pem');
            
            if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
                this.httpsAgent = new https.Agent({
                    cert: fs.readFileSync(certPath),
                    key: fs.readFileSync(keyPath),
                    rejectUnauthorized: process.env.VPP_REJECT_UNAUTHORIZED !== 'false' // Default to true for security
                });
                console.log('✅ 2-Way SSL configured with client certificates');
                console.log('   Certificate:', certPath);
                console.log('   Private Key:', keyPath);
            } else {
                console.warn('⚠️  Client certificates not found, 2-Way SSL not configured');
                console.warn('   Expected cert:', certPath);
                console.warn('   Expected key:', keyPath);
            }
        } catch (error) {
            console.error('❌ Failed to configure 2-Way SSL:', error.message);
        }
        
        // Initialize MLE Service for message level encryption
        try {
            this.mleService = new MLEService();
            console.log('✅ MLE Service initialized for PAR encryption');
        } catch (error) {
            console.warn('⚠️  MLE Service initialization failed:', error.message);
            this.mleService = null;
        }
        
        console.log('🔧 VPPService initialized:');
        console.log('  Environment:', process.env.VPP_ENVIRONMENT);
        console.log('  Base URL:', this.baseUrl);
        console.log('  API Key:', this.apiKey ? '✅ Set' : '❌ Not set');
        console.log('  Shared Secret:', this.sharedSecret ? '✅ Set' : '❌ Not set');
        console.log('  MLE Enabled:', this.mleService ? '✅ Yes' : '❌ No');
    }

    /**
     * Generate X-Pay-Token for Visa API authentication
     * @param {string} resourcePath - The API resource path
     * @param {string} queryString - Query string parameters
     * @param {Object} requestBody - Request body for POST requests
     * @returns {string} X-Pay-Token
     */
    generateXPayToken(resourcePath, queryString = '', requestBody = null) {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const preHashString = timestamp + resourcePath + queryString + (requestBody ? JSON.stringify(requestBody) : '');
            
            const hash = crypto.createHmac('sha256', this.sharedSecret)
                .update(preHashString)
                .digest('hex');

            return `xv2:${timestamp}:${hash}`;
        } catch (error) {
            console.error('Error generating X-Pay-Token:', error);
            throw new Error('Failed to generate authentication token');
        }
    }

    /**
     * Generate client assertion JWT for PAR
     * @returns {string} Client assertion JWT
     */
    generateClientAssertion() {
        try {
            const now = Math.floor(Date.now() / 1000);
            
            // JWT Payload
            const payload = {
                aud: ["https://www.visa.com"],
                iss_knd: "CLIENT_ID",
                iss: process.env.VPP_CLIENT_ID || "s6BhdRkqt3",
                exp: now + 120, // 2 minutes expiry
                iat: now,
                jti: crypto.randomUUID()
            };

            // Check if private key path is configured
            const privateKeyPath = process.env.VPP_PRIVATE_KEY_PATH;
            
            if (!privateKeyPath || !fs.existsSync(privateKeyPath)) {
                console.warn('Private key not found, using demo signature');
                // Fallback to demo signature
                const header = {
                    kid: process.env.VPP_CLIENT_ID || "s6BhdRkqt3",
                    typ: "vnd.visa.client_credential+JWT",
                    alg: "RS256"
                };
                const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
                const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
                const signature = crypto.randomBytes(256).toString('base64url');
                return `${encodedHeader}.${encodedPayload}.${signature}`;
            }

            // Load private key
            const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
            
            console.log('🔑 Private key loaded, length:', privateKey.length);
            console.log('🔑 First 50 chars:', privateKey.substring(0, 50));
            console.log('🔑 Last 50 chars:', privateKey.substring(privateKey.length - 50));
            
            // Verify the key format
            if (!privateKey.includes('BEGIN RSA PRIVATE KEY') && !privateKey.includes('BEGIN PRIVATE KEY')) {
                throw new Error('Invalid private key format - missing BEGIN marker');
            }
            
            // Sign JWT with RS256 using the actual private key
            const token = jwt.sign(payload, privateKey, {
                algorithm: 'RS256',
                keyid: process.env.VPP_CLIENT_ID || "s6BhdRkqt3",
                header: {
                    typ: 'vnd.visa.client_credential+JWT'
                }
            });

            console.log('✅ Client assertion generated with real RSA signature');
            return token;

        } catch (error) {
            console.error('Error generating client assertion:', error);
            throw new Error('Failed to generate client assertion');
        }
    }

    /**
     * Create headers for VPP API requests
     * @param {string} resourcePath - The API resource path
     * @param {string} queryString - Query string parameters
     * @param {Object} requestBody - Request body for POST requests
     * @returns {Object} Headers object
     */
    createHeaders(resourcePath, queryString = '', requestBody = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-VIA-HINT': 'US', // Data center hint
            'X-SERVICE-CONTEXT': process.env.VPP_APN || 'demo_apn'
        };

        // Add Basic Authentication
        const basicAuthToken = Buffer.from(`${this.basicAuthUsername}:${this.basicAuthPassword}`).toString('base64');
        headers['Authorization'] = `Basic ${basicAuthToken}`;
        console.log('✅ Basic Authentication added to headers');

        // Add VDC authentication if available
        if (this.apiKey && this.sharedSecret && this.userId) {
            headers['apikey'] = this.apiKey;
            headers['keyId'] = process.env.VPP_CLIENT_ID || 's6BhdRkqt3';
            headers['x-pay-token'] = this.generateXPayToken(resourcePath, queryString, requestBody);
        }

        return headers;
    }

    /**
     * Create a Pushed Authorization Request (PAR)
     * @param {Object} parRequest - PAR request payload
     * @param {string} xViaHint - Data center affinity hint from initialization
     * @returns {Promise<Object>} PAR response
     */
    async createPushedAuthorizationRequest(parRequest, xViaHint = null) {
        try {
            const resourcePath = '/vpp/v1/passkeys/oauth2/authorization/request/pushed';
            
            // Transform the request to match Visa's API format
            const visaAPIPayload = this.transformToVisaAPIFormat(parRequest);
            
            console.log('Creating PAR with VPP API...');
            console.log('Request URL:', `${this.baseUrl}${resourcePath}`);
            console.log('Original Visa API Payload:', JSON.stringify(visaAPIPayload, null, 2));
            
            // Encrypt the payload using MLE if available
            let requestBody;
            if (this.mleService) {
                console.log('🔐 Using Message Level Encryption for PAR request...');
                requestBody = await this.mleService.createEncryptedRequest(visaAPIPayload);
                console.log('✅ Payload encrypted with MLE');
            } else {
                console.warn('⚠️  MLE not available, sending unencrypted payload');
                requestBody = visaAPIPayload;
            }
            
            // Create headers - note: when using MLE, we don't include the payload in X-Pay-Token calculation
            const headers = this.createHeaders(resourcePath, '', this.mleService ? null : visaAPIPayload);
            
            // Add X-VIA-HINT if provided for data center affinity
            if (xViaHint) {
                headers['X-VIA-HINT'] = xViaHint;
                console.log('Using X-VIA-HINT for data center affinity:', xViaHint);
            }
            
            // Add keyId header as shown in the sample curl
            headers['keyId'] = 'bdf44016-16ae-4903-8d16-d37708b8f10c';

            console.log('Request Headers:', JSON.stringify(headers, null, 2));
            console.log('Request Body:', this.mleService ? '{ encData: "<encrypted>" }' : JSON.stringify(requestBody, null, 2));

            // Generate and print curl command
            this.printCurlCommand(`${this.baseUrl}${resourcePath}`, headers, requestBody);

            // Configure axios request with 2-Way SSL
            const axiosConfig = {
                headers
            };
            
            // Add HTTPS agent for 2-Way SSL if configured
            if (this.httpsAgent) {
                axiosConfig.httpsAgent = this.httpsAgent;
                console.log('🔒 Using 2-Way SSL (Mutual TLS) for API request');
            }

            const response = await axios.post(
                `${this.baseUrl}${resourcePath}`,
                requestBody,
                axiosConfig
            );

            console.log('\n========== PAR API RESPONSE ==========');
            console.log('✅ Status:', response.status, response.statusText);
            console.log('\n📋 Response Headers:');
            console.log(JSON.stringify(response.headers, null, 2));
            console.log('\n📦 Response Body:');
            console.log(JSON.stringify(response.data, null, 2));
            console.log('======================================\n');
            
            return response.data;

        } catch (error) {
            console.log('\n========== PAR API ERROR RESPONSE ==========');
            console.error('❌ Status:', error.response?.status, error.response?.statusText);
            
            if (error.response?.headers) {
                console.log('\n📋 Error Response Headers:');
                console.log(JSON.stringify(error.response.headers, null, 2));
            }
            
            console.log('\n📦 Error Response Body:');
            console.error(JSON.stringify(error.response?.data, null, 2));
            console.log('============================================\n');
            
            console.error('PAR creation error details:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            
            // Check for specific error indicating no passkey exists
            if (error.response?.data?.error === 'notfound_amr_values' || 
                error.response?.status === 400) {
                console.log('No passkey found - returning error for fallback to 3DS');
                return {
                    error: 'notfound_amr_values',
                    error_description: 'No passkey registered for this payment credential and device'
                };
            }
            
            throw new Error(`Failed to create PAR: ${error.response?.data?.error_description || error.message}`);
        }
    }

    /**
     * Transform PAR request to Visa API format
     * @param {Object} parRequest - Internal PAR request format
     * @returns {Object} Visa API format payload
     */
    transformToVisaAPIFormat(parRequest) {
        // Generate client assertion JWT
        const clientAssertion = this.generateClientAssertion();

        // Build the payload matching Visa's exact format
        return {
            response_type: parRequest.response_type || "code",
            amr_values: parRequest.amr_values || ["pop#fido2"],
            code_challenge_method: parRequest.code_challenge_method || "S256",
            response_mode: parRequest.response_mode,
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            ui_locales: parRequest.ui_locales || ["en"],
            authorization_details: parRequest.authorization_details,
            scope: parRequest.scope || "openid",
            state: parRequest.state,
            redirect_uri: parRequest.redirect_uri,
            client_assertion: clientAssertion,
            prompt: parRequest.prompt,
            code_challenge: parRequest.code_challenge,
            server_state: parRequest.server_state
        };
    }

    /**
     * Simulate PAR response for demo purposes
     * @param {Object} parRequest - Original PAR request
     * @returns {Object} Simulated PAR response
     */
    simulatePARResponse(parRequest) {
        // Simulate checking if passkey exists (30% chance of no passkey for demo)
        const hasPasskey = Math.random() > 0.3;
        
        // If authentication flow and no passkey, return error
        if (parRequest.prompt === 'login' && !hasPasskey) {
            console.log('Simulating no passkey found scenario');
            return {
                error: 'notfound_amr_values',
                error_description: 'No passkey registered for this payment credential and device'
            };
        }
        
        const simulatedJWT = this.createSimulatedJWT(parRequest);
        
        // Determine authorization endpoint based on flow type
        let authorizationEndpoint;
        if (parRequest.prompt === 'create') {
            // Registration flow - use payment-credential-binding endpoint
            authorizationEndpoint = '/oauth2/authorization/request/hub/payment-credential-binding';
        } else {
            // Authentication flow - use payment-credential-authentication endpoint
            authorizationEndpoint = '/oauth2/authorization/request/hub/payment-credential-authentication';
        }
        
        console.log('📍 Authorization endpoint for prompt "' + parRequest.prompt + '":', authorizationEndpoint);
        
        return {
            request: simulatedJWT,
            authorization_endpoint: authorizationEndpoint,
            expires_in: 480
        };
    }

    /**
     * Create a simulated JWT for demo purposes
     * @param {Object} parRequest - PAR request data
     * @returns {string} Base64 encoded simulated JWT
     */
    createSimulatedJWT(parRequest) {
        const header = {
            alg: "ES256",
            kid: "demo_key_id",
            typ: "oauth-authz-req+jwt"
        };

        // Fix authorization_details to ensure correct field order and preferences
        const fixedAuthorizationDetails = parRequest.authorization_details.map(detail => {
            if (detail.type === "com_visa_payment_transaction") {
                // Ensure correct field order: amount, currency, label (as per sample)
                const fixedDetail = {
                    type: detail.type,
                    payer: detail.payer,
                    payee: detail.payee,
                    details: {
                        amount: detail.details.amount,
                        currency: detail.details.currency,
                        label: detail.details.label
                    },
                    preferences: {},  // Always empty object for authentication
                    confinements: detail.confinements
                };
                return fixedDetail;
            } else if (detail.type === "com_visa_payment_credential_binding") {
                // For registration, keep as-is
                return detail;
            }
            return detail;
        });

        const payload = {
            iss: "https://www.visa.com",
            aud: "https://www.visa.com",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 480,
            max_age: 0,
            amr_values: parRequest.amr_values || ["pop#fido2"],
            client_id: "demo_client_id",
            response_type: parRequest.response_type,
            response_mode: parRequest.response_mode,  // Use the correct response_mode from request
            redirect_uri: parRequest.redirect_uri,
            scope: parRequest.scope,
            state: parRequest.state,
            server_state: parRequest.server_state,
            nonce: crypto.randomUUID(),
            authorization_details: fixedAuthorizationDetails  // Use fixed authorization details
        };

        console.log('🔍 JWT Payload (for debugging):');
        console.log('  response_mode:', payload.response_mode);
        console.log('  authorization_details[0].details:', JSON.stringify(payload.authorization_details[0]?.details));
        console.log('  authorization_details[0].preferences:', JSON.stringify(payload.authorization_details[0]?.preferences));

        // Create a simple base64 encoded "JWT" for demo
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto.randomBytes(32).toString('base64url');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    /**
     * Check if a device/PAN combination has existing passkeys
     * @param {Object} checkRequest - Request to check existing passkeys
     * @returns {Promise<Object>} Check response
     */
    async checkExistingPasskeys(checkRequest) {
        try {
            // This would typically be a call to VPP API to check for existing passkeys
            // For demo purposes, simulate the check
            const hasExistingPasskey = Math.random() > 0.7; // 30% chance of existing passkey

            return {
                hasExistingPasskey,
                passkeyCount: hasExistingPasskey ? Math.floor(Math.random() * 3) + 1 : 0,
                lastUsed: hasExistingPasskey ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null
            };

        } catch (error) {
            console.error('Error checking existing passkeys:', error);
            throw new Error('Failed to check existing passkeys');
        }
    }

    /**
     * Generate and print curl command for debugging
     * @param {string} url - The full URL
     * @param {Object} headers - Request headers
     * @param {Object} payload - Request payload
     */
    printCurlCommand(url, headers, payload) {
        let curlCommand = `curl -X POST '${url}' \\\n`;
        
        // Add headers
        Object.entries(headers).forEach(([key, value]) => {
            curlCommand += `  -H '${key}: ${value}' \\\n`;
        });
        
        // Add payload
        const payloadStr = JSON.stringify(payload, null, 2).replace(/'/g, "'\\''");
        curlCommand += `  -d '${payloadStr}'`;
        
        console.log('\n========== CURL COMMAND ==========');
        console.log(curlCommand);
        console.log('==================================\n');
    }

    /**
     * Validate VPP configuration
     * @returns {Object} Validation result
     */
    validateConfiguration() {
        const issues = [];

        if (!this.baseUrl) {
            issues.push('VPP base URL not configured');
        }

        if (!process.env.VPP_APN) {
            issues.push('VPP APN not configured');
        }

        if (!this.apiKey && process.env.NODE_ENV === 'production') {
            issues.push('VDC API key not configured for production');
        }

        if (!this.sharedSecret && process.env.NODE_ENV === 'production') {
            issues.push('VDC shared secret not configured for production');
        }

        return {
            valid: issues.length === 0,
            issues,
            environment: process.env.VPP_ENVIRONMENT || 'sandbox',
            baseUrl: this.baseUrl
        };
    }

    /**
     * Process VPP callback response
     * @param {Object} callbackData - Callback data from VPP
     * @returns {Object} Processed callback result
     */
    processCallback(callbackData) {
        try {
            const { code, state, error, error_description } = callbackData;

            if (error) {
                return {
                    success: false,
                    error: error,
                    error_description: error_description,
                    timestamp: new Date().toISOString()
                };
            }

            if (!code) {
                return {
                    success: false,
                    error: 'missing_authorization_code',
                    error_description: 'Authorization code not provided in callback',
                    timestamp: new Date().toISOString()
                };
            }

            return {
                success: true,
                authorizationCode: code,
                state: state,
                timestamp: new Date().toISOString(),
                nextStep: 'token_exchange'
            };

        } catch (error) {
            console.error('Error processing VPP callback:', error);
            return {
                success: false,
                error: 'callback_processing_error',
                error_description: 'Failed to process VPP callback',
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = VPPService;

// END GENAI
