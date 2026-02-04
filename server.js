// START GENAI
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Load environment variables FIRST
const loadEnv = () => {
    try {
        const envFile = fs.readFileSync('.env', 'utf8');
        envFile.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim();
                if (!value.startsWith('#')) {
                    process.env[key.trim()] = value;
                }
            }
        });
    } catch (error) {
        console.log('No .env file found, using default configuration');
    }
};

loadEnv();

// NOW load VPPService after env vars are loaded
const VPPService = require('./services/VPPService');

// Initialize VPP Service
const vppService = new VPPService();

const PORT = process.env.PORT || 3000;

// Simple UUID generator
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Simple JWT implementation
const createJWT = (payload, secret = 'demo-secret') => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');
    return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyJWT = (token, secret = 'demo-secret') => {
    try {
        const [header, payload, signature] = token.split('.');
        const expectedSignature = crypto.createHmac('sha256', secret)
            .update(`${header}.${payload}`)
            .digest('base64url');
        
        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }
        
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) {
            throw new Error('Token expired');
        }
        
        return decodedPayload;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

// Serve static files
const serveStatic = (req, res, filePath) => {
    const fullPath = path.join(__dirname, filePath);
    
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
};

// Parse JSON body
const parseJSON = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
};

// API Handlers
const handleVPPConfig = (req, res) => {
    const config = {
        vppBaseUrl: process.env.VPP_ENVIRONMENT === 'production' 
            ? process.env.VPP_BASE_URL_PROD 
            : process.env.VPP_BASE_URL_SANDBOX,
        merchantOrigin: process.env.MERCHANT_ORIGIN,
        integratorOrigin: process.env.INTEGRATOR_ORIGIN,
        environment: process.env.VPP_ENVIRONMENT || 'sandbox',
        fido2Timeout: parseInt(process.env.FIDO2_TIMEOUT) || 360000,
        rpName: process.env.FIDO2_RP_NAME || 'VPP Merchant Demo'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, config }));
};

const handleLogin = async (req, res) => {
    try {
        const { email, cardNumber } = await parseJSON(req);
        
        if (!email || !cardNumber) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Email and card number required' }));
            return;
        }

        // Basic validation
        if (!cardNumber.startsWith('4')) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Only Visa cards supported (must start with 4)' }));
            return;
        }

        const userId = generateUUID();
        const sessionId = generateUUID();
        const maskedCardNumber = cardNumber.replace(/\d(?=\d{4})/g, '*');

        const token = createJWT({
            userId,
            sessionId,
            email,
            cardNumber: cardNumber, // Store actual card number in JWT
            maskedCardNumber: maskedCardNumber,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 900
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            token,
            user: { userId, email, cardNumber, maskedCardNumber }, // Include both
            message: 'Authentication successful'
        }));

    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Authentication failed' }));
    }
};

const handleVPPInitialize = async (req, res) => {
    try {
        const body = await parseJSON(req);
        const correlationId = generateUUID();
        const timestamp = Date.now();

        const initCommand = {
            type: "COMMAND",
            ref: correlationId,
            ts: timestamp,
            command: {
                type: "INITIALIZATION",
                data: {
                    response_mode: "com_visa_web_message",
                    redirect_uri: body.integratorOrigin || process.env.INTEGRATOR_ORIGIN,
                    session_context: {
                        apn: process.env.VPP_APN?.toLowerCase() || "vdp-web",
                        client_software: {
                            top_origin: body.merchantOrigin || process.env.MERCHANT_ORIGIN,
                            integrator_origin: body.integratorOrigin || process.env.INTEGRATOR_ORIGIN,
                            uebas: [{ source: "VDI", ref: "" }],
                            id: process.env.VPP_CLIENT_ID || "s6BhdRkqt3",
                            version: process.env.VPP_CLIENT_VERSION || "1.0.0",
                            oauth2_version: "1.0",
                            tenancy: { product_code: process.env.VPP_PRODUCT_CODE || "vdp-web" }
                        }
                    },
                    response_type: "urn:ext:oauth:response-type:server_state"
                }
            }
        };

        const vppBaseUrl = process.env.VPP_ENVIRONMENT === 'production' 
            ? process.env.VPP_BASE_URL_PROD 
            : process.env.VPP_BASE_URL_SANDBOX;
            
        const initUrl = `${vppBaseUrl}/oauth2/authorization/request/hub#msg=`;
        const encodedCommand = encodeURIComponent(JSON.stringify(initCommand));
        const fullInitUrl = `${initUrl}${encodedCommand}`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            correlationId,
            initializationUrl: fullInitUrl,
            sessionData: { correlationId, timestamp, status: 'initialized' },
            message: 'VPP initialization command generated successfully'
        }));

    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Failed to initialize VPP session' }));
    }
};

const handlePushedAuthorizationRequest = async (req, res) => {
    try {
        const body = await parseJSON(req);
        const {
            serverState,
            xViaHint,
            panCredential,
            merchantName,
            amount,
            currency,
            email,
            flowType = 'authentication',
            trustChain,
            redirectUri,
            state
        } = body;

        console.log('Creating Pushed Authorization Request...');
        console.log('Flow Type:', flowType);

        // Validate required parameters
        if (!serverState) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'server_state is required from initialization'
            }));
            return;
        }

        if (!panCredential) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'panCredential is required'
            }));
            return;
        }

        // Generate PKCE parameters
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        // Create authorization details based on flow type
        let authorizationDetails;
        let prompt;
        
        if (flowType === 'registration') {
            // Passkey registration/binding flow
            prompt = 'create';
            authorizationDetails = [
                {
                    type: "com_visa_payment_credential_binding",
                    payer: {
                        account: {
                            scheme: "com_visa_pan",
                            id: panCredential
                        }
                    },
                    payee: {
                        name: merchantName || process.env.MERCHANT_NAME || "Demo Merchant",
                        origin: process.env.MERCHANT_ORIGIN
                    },
                    preferences: email ? {
                        notification: {
                            email: email
                        }
                    } : undefined,
                    confinements: {
                        origin: {
                            source_hint: "SERVER_STATE"
                        },
                        device: {
                            source_hint: "SERVER_STATE"
                        }
                    },
                    trustchain: trustChain || {
                        anchor: {
                            authentication: [
                                {
                                    protocol: "TDS",
                                    source_hint: "CRD",
                                    amr: [],
                                    source_id_hint: "ACS_TNX_ID",
                                    source_id: generateUUID(),
                                    time: Math.floor(Date.now() / 1000).toString()
                                }
                            ]
                        },
                        surrogate: {
                            authentication: [
                                {
                                    amr_values: ["pop#fido2"],
                                    time: ""
                                }
                            ]
                        }
                    }
                }
            ];
        } else {
            // Payment authentication flow
            prompt = 'login';
            
            if (!amount || !currency) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'amount and currency are required for authentication flow'
                }));
                return;
            }
            
            authorizationDetails = [
                {
                    type: "com_visa_payment_transaction",
                    payer: {
                        account: {
                            scheme: "com_visa_pan",
                            id: panCredential
                        }
                    },
                    payee: {
                        name: merchantName || process.env.MERCHANT_NAME || "Demo Merchant",
                        origin: process.env.MERCHANT_ORIGIN
                    },
                    details: {
                        label: "Total",
                        amount: amount.toString(),
                        currency: currency
                    },
                    confinements: {
                        origin: {
                            source_hint: "SERVER_STATE"
                        },
                        device: {
                            source_hint: "SERVER_STATE"
                        }
                    }
                }
            ];
        }

        // Generate client assertion JWT
        const now = Math.floor(Date.now() / 1000);
        const header = {
            kid: process.env.VPP_CLIENT_ID || "demo_client_id",
            typ: "vnd.visa.client_credential+JWT",
            alg: "RS256"
        };
        const payload = {
            aud: ["https://www.visa.com"],
            iss_knd: "CLIENT_ID",
            iss: process.env.VPP_CLIENT_ID || "demo_client_id",
            exp: now + 120,
            iat: now,
            jti: generateUUID()
        };
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = crypto.randomBytes(256).toString('base64url');
        const clientAssertion = `${encodedHeader}.${encodedPayload}.${signature}`;
        
        // Create PAR request payload
        const parRequest = {
            response_type: "code",
            response_mode: "com_visa_web_message",
            scope: "openid",
            server_state: serverState,
            state: state || generateUUID(),
            redirect_uri: "https://www.example-merchant.com/callback",
            prompt: prompt,
            amr_values: ["pop#fido2"],
            code_challenge_method: "S256",
            code_challenge: codeChallenge,
            ui_locales: ["en"],
            authorization_details: authorizationDetails,
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: clientAssertion
        };

        console.log('PAR Request:', JSON.stringify(parRequest, null, 2));

        // Call actual VPP API
        const parResponse = await vppService.createPushedAuthorizationRequest(parRequest, xViaHint);

        // Check for error response indicating no passkey exists
        if (parResponse.error === 'notfound_amr_values') {
            console.log('No passkey found for this PAN/device combination');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'notfound_amr_values',
                error_description: 'No passkey registered for this payment credential and device',
                requiresFallback: true,
                fallbackFlow: '3DS',
                message: 'User must complete 3DS authentication before passkey registration'
            }));
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            request: parResponse.request,
            authorization_endpoint: parResponse.authorization_endpoint,
            expires_in: parResponse.expires_in,
            sessionData: {
                codeVerifier,
                state: parRequest.state,
                timestamp: Date.now(),
                flowType
            },
            xViaHint: xViaHint,
            message: 'Pushed Authorization Request created successfully'
        }));

    } catch (error) {
        console.error('PAR creation error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: 'Failed to create Pushed Authorization Request',
            details: error.message
        }));
    }
};

// SSL options - with error handling
let sslOptions;
try {
    sslOptions = {
        key: fs.readFileSync(path.join(__dirname, 'certs', 'privateKey-d0a286b0-a2e4-4720-9943-52c87b5a7d94.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
    };
    console.log('✅ SSL certificates loaded successfully');
    console.log('   Using cert.pem with privateKey-d0a286b0-a2e4-4720-9943-52c87b5a7d94.pem');
} catch (error) {
    console.error('❌ FATAL ERROR: Failed to load SSL certificates');
    console.error('Error details:', error.message);
    console.error('Expected files:');
    console.error('  - ' + path.join(__dirname, 'certs', 'privateKey-d0a286b0-a2e4-4720-9943-52c87b5a7d94.pem'));
    console.error('  - ' + path.join(__dirname, 'certs', 'cert.pem'));
    console.error('\nPlease ensure SSL certificates exist in the certs directory.');
    console.error('Server cannot start without SSL certificates.');
    process.exit(1);
}

// Create HTTPS server
const server = https.createServer(sslOptions, async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // API Routes
        if (pathname === '/api/vpp/config' && method === 'GET') {
            handleVPPConfig(req, res);
        } else if (pathname === '/api/vpp/initialize' && method === 'POST') {
            handleVPPInitialize(req, res);
        } else if (pathname === '/api/vpp/pushed-authorization-request' && method === 'POST') {
            handlePushedAuthorizationRequest(req, res);
        } else if (pathname === '/api/auth/login' && method === 'POST') {
            handleLogin(req, res);
        } else if (pathname === '/api/auth/validate-token' && method === 'POST') {
            try {
                const { token } = await parseJSON(req);
                const decoded = verifyJWT(token);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    valid: true,
                    user: { 
                        userId: decoded.userId, 
                        email: decoded.email, 
                        cardNumber: decoded.cardNumber,
                        maskedCardNumber: decoded.maskedCardNumber 
                    }
                }));
            } catch (error) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, valid: false, error: 'Invalid token' }));
            }
        } else if (pathname === '/api/passkey/simulate-3ds-challenge' && method === 'POST') {
            const challengeResult = {
                acsTransactionId: generateUUID(),
                authenticationStatus: 'Y',
                eci: '05',
                cavv: Buffer.from(generateUUID()).toString('base64'),
                timestamp: new Date().toISOString()
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, challengeResult, message: '3DS challenge completed' }));
        } else if (pathname === '/api/passkey/authentication-flow' && method === 'POST') {
            const body = await parseJSON(req);
            const authorizationDetails = [{
                type: "com_visa_payment_transaction",
                payer: { account: { scheme: "com_visa_pan", id: body.panCredential } },
                payee: { name: body.merchantName || "Demo Merchant", origin: process.env.MERCHANT_ORIGIN },
                details: { label: "Total", amount: body.amount.toString(), currency: body.currency }
            }];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, authorizationDetails, flow: 'authentication' }));
        } else if (pathname === '/health' && method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'OK',
                timestamp: new Date().toISOString(),
                service: 'VPP Merchant Implementation',
                version: '1.0.0'
            }));
        } else if (pathname === '/' || pathname === '/index.html') {
            serveStatic(req, res, 'public/index.html');
        } else if (pathname.startsWith('/')) {
            // Serve static files
            const filePath = pathname === '/' ? 'public/index.html' : `public${pathname}`;
            serveStatic(req, res, filePath);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
});

// Handle server startup errors
server.on('error', (error) => {
    console.error('❌ FATAL ERROR: Server failed to start');
    console.error('Error details:', error.message);
    
    if (error.code === 'EADDRINUSE') {
        console.error(`\nPort ${PORT} is already in use.`);
        console.error('Please either:');
        console.error(`  1. Stop the process using port ${PORT}`);
        console.error('  2. Set a different PORT in your .env file');
    } else if (error.code === 'EACCES') {
        console.error(`\nPermission denied to bind to port ${PORT}.`);
        console.error('Please use a port number above 1024 or run with appropriate permissions.');
    } else {
        console.error('\nUnexpected error occurred during server startup.');
    }
    
    console.error('\nServer initialization failed. Exiting...');
    process.exit(1);
});

server.listen(PORT, () => {
    console.log(`🚀 VPP Merchant Server running on port ${PORT} (HTTPS)`);
    console.log(`📱 Access the demo at: https://localhost:${PORT}`);
    console.log(`🏥 Health check: https://localhost:${PORT}/health`);
    console.log('');
    console.log('🔐 Visa Payment Passkey Demo Ready!');
    console.log('   - Use test card: 4111 1111 1111 1111');
    console.log('   - Demo works without external dependencies');
    console.log('   - Check browser console for VPP flow details');
    console.log('   - ⚠️  Accept the self-signed certificate in your browser');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION - Server will shut down');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED PROMISE REJECTION - Server will shut down');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    process.exit(1);
});

module.exports = server;

// END GENAI
