// START GENAI
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const VPPService = require('../services/VPPService');
const AuthService = require('../services/AuthService');

// Initialize VPP Service
const vppService = new VPPService();
const authService = new AuthService();

/**
 * POST /api/vpp/initialize
 * Initialize VPP session - Step 1 of VPP flow
 * Performs FIDO eligibility check, device profiling, and session creation
 */
router.post('/initialize', async (req, res) => {
    try {
        const { merchantOrigin, integratorOrigin } = req.body;
        
        // Generate correlation ID for this initialization request
        const correlationId = uuidv4();
        const timestamp = Date.now();
        
        console.log(`[${correlationId}] Initializing VPP session...`);
        
        // Create initialization command as per VPP specification (Section 2.2 of PDF)
        const initCommand = {
            type: "COMMAND",
            ref: correlationId,
            ts: timestamp,
            command: {
                type: "INITIALIZATION",
                data: {
                    response_mode: "com_visa_web_message",
                    redirect_uri: integratorOrigin || process.env.INTEGRATOR_ORIGIN || "http://localhost:3000",
                    session_context: {
                        apn: (process.env.VPP_APN || "cardinal-web").toLowerCase(), // Must be lowercase as per PDF
                        client_software: {
                            top_origin: merchantOrigin || process.env.MERCHANT_ORIGIN || "http://localhost:3000",
                            integrator_origin: integratorOrigin || process.env.INTEGRATOR_ORIGIN || "http://localhost:3000",
                            uebas: [
                                {
                                    source: "VDI",
                                    ref: "DFP_SESSION_ID"
                                }
                            ],
                            id: process.env.VPP_CLIENT_ID || "4132664b-e5a4-4326-af7a-f1d9783fb554",
                            version: process.env.VPP_CLIENT_VERSION || "1.0.0",
                            oauth2_version: "1.0",
                            tenancy: {
                                product_code: process.env.VPP_PRODUCT_CODE || "CRD"
                            }
                        }
                    },
                    response_type: "urn:ext:oauth:response-type:server_state"
                }
            }
        };

        // Log the initialization command payload
        console.log('\n' + '='.repeat(80));
        console.log('📤 INITIALIZATION COMMAND PAYLOAD:');
        console.log('='.repeat(80));
        console.log(JSON.stringify(initCommand, null, 2));
        console.log('='.repeat(80) + '\n');

        // Generate VPP initialization URL
        const vppBaseUrl = process.env.VPP_ENVIRONMENT === 'production' 
            ? process.env.VPP_BASE_URL_PROD 
            : process.env.VPP_BASE_URL_SANDBOX;
            
        const initUrl = `${vppBaseUrl}/oauth2/authorization/request/hub#msg=`;
        const encodedCommand = encodeURIComponent(JSON.stringify(initCommand));
        const fullInitUrl = `${initUrl}${encodedCommand}`;
        
        console.log('🔗 Full Initialization URL:');
        console.log(fullInitUrl);
        console.log('\n');

        // Store session data for later use
        const sessionData = {
            correlationId,
            timestamp,
            merchantOrigin: merchantOrigin || process.env.MERCHANT_ORIGIN,
            integratorOrigin: integratorOrigin || process.env.INTEGRATOR_ORIGIN,
            status: 'initialized'
        };

        // In a real implementation, store this in a database or session store
        // For demo purposes, we'll return it to the client
        
        res.json({
            success: true,
            correlationId,
            initializationUrl: fullInitUrl,
            sessionData,
            message: 'VPP initialization command generated successfully'
        });

    } catch (error) {
        console.error('VPP Initialization error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize VPP session',
            details: error.message
        });
    }
});

/**
 * POST /api/vpp/pushed-authorization-request
 * Create a Pushed Authorization Request (PAR) for VPP
 * This is called after initialization with server_state token
 * Makes API call to Visa with transaction info, PAN, merchant details
 */
router.post('/pushed-authorization-request', async (req, res) => {
    try {
        const {
            serverState,
            xViaHint,
            panCredential,
            merchantName,
            amount,
            currency,
            email,
            flowType = 'authentication', // 'authentication' or 'registration'
            trustChain,
            redirectUri,
            state
        } = req.body;

        console.log('Creating Pushed Authorization Request...');
        console.log('Flow Type:', flowType);

        // Validate required parameters
        if (!serverState) {
            return res.status(400).json({
                success: false,
                error: 'server_state is required from initialization'
            });
        }

        if (!panCredential) {
            return res.status(400).json({
                success: false,
                error: 'panCredential is required'
            });
        }

        // Generate PKCE parameters
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        // Create authorization details based on flow type
        let authorizationDetails;
        let prompt;
        let codeChallengeValue;
        
        if (flowType === 'registration') {
            // Passkey registration/binding flow
            prompt = 'create';
            codeChallengeValue = codeChallenge; // Use actual code challenge for registration
            
            // Extract origin without protocol (e.g., "www.bicycle.com" instead of "https://www.bicycle.com")
            const merchantOriginUrl = process.env.MERCHANT_ORIGIN || "https://www.example-merchant.com";
            const originWithoutProtocol = merchantOriginUrl.replace(/^https?:\/\//, '');
            
            authorizationDetails = [
                {
                    preferences: {
                        notification: {
                            email: email || "test@visa.com"
                        }
                    },
                    trustchain: {
                        anchor: {
                            authentication: [
                                {
                                    protocol: "TDS",
                                    source_hint: "CRD",
                                    amr: [],
                                    source_id_hint: "ACS_TNX_ID",
                                    source_id: uuidv4(),
                                    time: Math.floor(Date.now() / 1000).toString() // Unix timestamp as string
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
                    },
                    confinements: {
                        origin: {
                            source_hint: "SERVER_STATE"
                        },
                        device: {
                            source_hint: "SERVER_STATE"
                        }
                    },
                    type: "com_visa_payment_credential_binding",
                    payee: {
                        origin: originWithoutProtocol,
                        name: merchantName || process.env.MERCHANT_NAME || "Bicycle Shop"
                    },
                    payer: {
                        account: {
                            scheme: "com_visa_pan",
                            id: panCredential
                        }
                    }
                }
            ];
        } else {
            // Payment authentication flow
            prompt = 'login';
            codeChallengeValue = ""; // Empty string for authentication flow
            
            if (!amount || !currency) {
                return res.status(400).json({
                    success: false,
                    error: 'amount and currency are required for authentication flow'
                });
            }
            
            // Extract origin without protocol
            const merchantOriginUrl = process.env.MERCHANT_ORIGIN || "https://www.example-merchant.com";
            const originWithoutProtocol = merchantOriginUrl.replace(/^https?:\/\//, '');
            
            authorizationDetails = [
                {
                    payee: {
                        origin: originWithoutProtocol,
                        name: merchantName || process.env.MERCHANT_NAME || "Bicycle Shop"
                    },
                    preferences: {},
                    confinements: {
                        origin: {
                            source_hint: "SERVER_STATE"
                        },
                        device: {
                            source_hint: "SERVER_STATE"
                        }
                    },
                    details: {
                        amount: amount.toString(),
                        currency: currency,
                        label: "Total"
                    },
                    type: "com_visa_payment_transaction",
                    payer: {
                        account: {
                            scheme: "com_visa_pan",
                            id: panCredential
                        }
                    }
                }
            ];
        }

        // Generate client assertion JWT
        const clientAssertion = vppService.generateClientAssertion();
        
        // Create PAR request payload as per VPP specification
        const parRequest = {
            response_type: "code",
            response_mode: "com_visa_web_message", // Always use com_visa_web_message for both flows
            scope: "openid",
            server_state: serverState,
            state: state || uuidv4(),
            redirect_uri: redirectUri || process.env.INTEGRATOR_ORIGIN,
            prompt: prompt,
            amr_values: ["pop#fido2"],
            code_challenge_method: "S256",
            code_challenge: codeChallengeValue, // Use the flow-specific code challenge value
            ui_locales: ["en"],
            authorization_details: authorizationDetails,
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: clientAssertion
        };

        console.log('PAR Request:', JSON.stringify(parRequest, null, 2));

        // Call VPP API to create PAR
        let parResponse = await vppService.createPushedAuthorizationRequest(parRequest, xViaHint);

        // Check for error response indicating no passkey exists (notfound_amr_values)
        if (parResponse.error === 'notfound_amr_values') {
            console.log('⚠️  No passkey found for this PAN/device combination');
            console.log('🔄 Automatically retrying with registration flow (com_visa_payment_transaction)...');
            
            // Validate that we have amount and currency for the registration retry
            if (!amount || !currency) {
                return res.status(400).json({
                    success: false,
                    error: 'notfound_amr_values',
                    error_description: 'No passkey registered. Amount and currency required for registration flow.',
                    requiresFallback: true,
                    fallbackFlow: '3DS',
                    message: 'User must complete 3DS authentication before passkey registration'
                });
            }
            
            // Extract origin without protocol
            const merchantOriginUrl = process.env.MERCHANT_ORIGIN || "https://www.example-merchant.com";
            const originWithoutProtocol = merchantOriginUrl.replace(/^https?:\/\//, '');
            
            // Create registration payload with com_visa_payment_transaction type
            const registrationAuthDetails = [
                {
                    payee: {
                        origin: originWithoutProtocol,
                        name: merchantName || process.env.MERCHANT_NAME || "Bicycle Shop"
                    },
                    preferences: {},
                    confinements: {
                        origin: {
                            source_hint: "SERVER_STATE"
                        },
                        device: {
                            source_hint: "SERVER_STATE"
                        }
                    },
                    details: {
                        amount: amount.toString(),
                        currency: currency,
                        label: "Total"
                    },
                    type: "com_visa_payment_transaction",
                    payer: {
                        account: {
                            scheme: "com_visa_pan",
                            id: panCredential
                        }
                    }
                }
            ];
            
            // Create new PAR request for registration with login prompt
            const registrationParRequest = {
                response_type: "code",
                response_mode: "com_visa_web_message",
                scope: "openid",
                server_state: serverState,
                state: state || uuidv4(),
                redirect_uri: redirectUri || process.env.INTEGRATOR_ORIGIN,
                prompt: "login", // Use login prompt for registration after notfound_amr_values
                amr_values: ["pop#fido2"],
                code_challenge_method: "S256",
                code_challenge: "", // Empty string for this flow
                ui_locales: ["en"],
                authorization_details: registrationAuthDetails,
                client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                client_assertion: vppService.generateClientAssertion()
            };
            
            console.log('🔄 Registration PAR Request:', JSON.stringify(registrationParRequest, null, 2));
            
            // Retry PAR call with registration payload
            parResponse = await vppService.createPushedAuthorizationRequest(registrationParRequest, xViaHint);
            
            // If still error, return it
            if (parResponse.error) {
                console.error('❌ Registration PAR also failed:', parResponse.error);
                return res.status(400).json({
                    success: false,
                    error: parResponse.error,
                    error_description: parResponse.error_description || 'Failed to create registration PAR',
                    requiresFallback: true,
                    fallbackFlow: '3DS'
                });
            }
            
            console.log('✅ Registration PAR successful after notfound_amr_values retry');
        }

        // Store code verifier for later token exchange
        // In production, store this securely associated with the session
        const sessionData = {
            codeVerifier,
            state: parRequest.state,
            timestamp: Date.now(),
            flowType
        };

        res.json({
            success: true,
            request: parResponse.request,
            authorization_endpoint: parResponse.authorization_endpoint,
            expires_in: parResponse.expires_in,
            sessionData,
            xViaHint: xViaHint,
            message: 'Pushed Authorization Request created successfully'
        });

    } catch (error) {
        console.error('PAR creation error:', error);
        
        // Check if error is due to missing passkey
        if (error.message && error.message.includes('notfound_amr_values')) {
            return res.status(400).json({
                success: false,
                error: 'notfound_amr_values',
                error_description: 'No passkey registered for this payment credential and device',
                requiresFallback: true,
                fallbackFlow: '3DS',
                message: 'User must complete 3DS authentication before passkey registration'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create Pushed Authorization Request',
            details: error.message
        });
    }
});

/**
 * POST /api/vpp/handle-callback
 * Handle the callback from VPP after user completes authentication/registration
 */
router.post('/handle-callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.body;

        console.log('Handling VPP callback...');

        if (error) {
            console.error('VPP callback error:', error, error_description);
            return res.status(400).json({
                success: false,
                error: error,
                error_description: error_description
            });
        }

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code not provided'
            });
        }

        // In a real implementation, retrieve the stored session data using the state parameter
        // For demo purposes, we'll proceed with the code exchange

        res.json({
            success: true,
            authorizationCode: code,
            state: state,
            message: 'VPP callback processed successfully'
        });

    } catch (error) {
        console.error('Callback handling error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to handle VPP callback',
            details: error.message
        });
    }
});

/**
 * GET /api/vpp/config
 * Get VPP configuration for client-side use
 */
router.get('/config', (req, res) => {
    try {
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

        res.json({
            success: true,
            config
        });

    } catch (error) {
        console.error('Config retrieval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve VPP configuration'
        });
    }
});

/**
 * POST /api/vpp/create-payment-authorization
 * Create authorization details for payment transaction
 */
router.post('/create-payment-authorization', (req, res) => {
    try {
        const {
            panCredential,
            merchantName,
            amount,
            currency,
            merchantOrigin
        } = req.body;

        // Validate required fields
        if (!panCredential || !amount || !currency) {
            return res.status(400).json({
                success: false,
                error: 'panCredential, amount, and currency are required'
            });
        }

        // Create authorization details for payment transaction
        const authorizationDetails = [
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
                    origin: merchantOrigin || process.env.MERCHANT_ORIGIN
                },
                details: {
                    label: "Total",
                    amount: amount.toString(),
                    currency: currency
                },
                preferences: null,
                confinements: {
                    device: {
                        source_hint: "SERVER_STATE"
                    },
                    domain_name: {
                        source_hint: "SERVER_STATE"
                    }
                }
            }
        ];

        res.json({
            success: true,
            authorizationDetails,
            message: 'Payment authorization details created successfully'
        });

    } catch (error) {
        console.error('Payment authorization creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment authorization details',
            details: error.message
        });
    }
});

module.exports = router;

// END GENAI
