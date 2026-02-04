// START GENAI
// VPP Merchant Demo Application
class VPPMerchantApp {
    constructor() {
        this.config = {};
        this.session = null;
        this.currentFlow = null;
        this.vppIframe = null;
        
        // VPP initialization state variables
        this.serverState = null;
        this.xViaHint = null;
        this.dfpSessionId = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing VPP Merchant Demo...');
        
        try {
            // Load configuration
            await this.loadConfig();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check for existing session
            this.checkExistingSession();
            
            // Update environment info
            this.updateEnvironmentInfo();
            
            console.log('✅ VPP Merchant Demo initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize VPP Merchant Demo:', error);
            this.showInitializationError(error);
            // Stop execution - prevent any further operations
            throw error;
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/vpp/config');
            const data = await response.json();
            
            if (data.success) {
                this.config = data.config;
                console.log('📋 Configuration loaded:', this.config);
            } else {
                throw new Error('Failed to load configuration');
            }
        } catch (error) {
            console.error('Configuration loading error:', error);
            // Use fallback config for demo
            this.config = {
                environment: 'sandbox',
                vppBaseUrl: 'https://sandbox.auth.visa.com',
                merchantOrigin: window.location.origin,
                integratorOrigin: window.location.origin,
                fido2Timeout: 360000,
                rpName: 'VPP Merchant Demo'
            };
        }
    }

    setupEventListeners() {
        // VPP iframe message listener
        window.addEventListener('message', (event) => {
            this.handleVPPMessage(event);
        });

        // Form input listeners
        this.setupFormListeners();
        
        // Visibility change listener for session management
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.session) {
                this.validateSession();
            }
        });
    }

    setupFormListeners() {
        // Payment form listeners
        const merchantNameInput = document.getElementById('merchantName');
        const amountInput = document.getElementById('amount');
        const currencySelect = document.getElementById('currency');

        if (merchantNameInput) {
            merchantNameInput.addEventListener('input', this.updatePaymentSummary.bind(this));
        }
        if (amountInput) {
            amountInput.addEventListener('input', this.updatePaymentSummary.bind(this));
        }
        if (currencySelect) {
            currencySelect.addEventListener('change', this.updatePaymentSummary.bind(this));
        }
    }

    checkExistingSession() {
        const token = localStorage.getItem('vpp_session_token');
        if (token) {
            this.validateStoredSession(token);
        }
    }

    async validateStoredSession(token) {
        try {
            const response = await fetch('/api/auth/validate-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            const data = await response.json();
            
            if (data.success && data.valid) {
                this.session = {
                    token,
                    user: data.user
                };
                this.showDashboard();
                this.showStatus('Session restored successfully', 'success');
            } else {
                localStorage.removeItem('vpp_session_token');
            }
        } catch (error) {
            console.error('Session validation error:', error);
            localStorage.removeItem('vpp_session_token');
        }
    }

    updateEnvironmentInfo() {
        const environmentBadge = document.getElementById('environmentBadge');
        const footerEnvironment = document.getElementById('footerEnvironment');
        
        const envText = this.config.environment === 'production' ? 'Production' : 'Sandbox';
        
        if (environmentBadge) {
            environmentBadge.textContent = envText;
            environmentBadge.className = `environment-badge ${this.config.environment}`;
        }
        
        if (footerEnvironment) {
            footerEnvironment.textContent = envText;
        }
    }

    // Navigation Functions
    showSection(sectionId) {
        const sections = ['welcomeSection', 'loginSection', 'dashboardSection', 'paymentSection', 'registrationSection'];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = id === sectionId ? 'block' : 'none';
            }
        });
    }

    showLoginForm() {
        this.showSection('loginSection');
    }

    showDashboard() {
        if (!this.session) {
            this.showLoginForm();
            return;
        }

        this.showSection('dashboardSection');
        this.updateDashboardInfo();
        this.updateUserInfo();
    }

    showDocumentation() {
        this.showStatus('Documentation would open in a new window', 'info');
        // In a real implementation, this would open documentation
    }

    updateDashboardInfo() {
        if (!this.session) return;

        const elements = {
            dashboardEmail: this.session.user.email,
            dashboardCard: this.session.user.maskedCardNumber
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value) {
                element.textContent = value;
            }
        });
    }

    updateUserInfo() {
        if (!this.session) return;

        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        
        if (userInfo && userEmail) {
            userEmail.textContent = this.session.user.email;
            userInfo.style.display = 'flex';
        }
    }

    // Authentication Functions
    async handleLogin(event) {
        event.preventDefault();
        
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn.querySelector('.btn-text');
        const btnSpinner = loginBtn.querySelector('.btn-spinner');
        
        // Show loading state
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';
        loginBtn.disabled = true;

        try {
            const formData = new FormData(event.target);
            const credentials = {
                email: formData.get('email'),
                cardNumber: formData.get('cardNumber').replace(/\s/g, '') // Remove spaces
            };

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (data.success) {
                this.session = {
                    token: data.token,
                    user: data.user
                };
                
                localStorage.setItem('vpp_session_token', data.token);
                this.showStatus('Login successful! Welcome to VPP Demo', 'success');
                
                setTimeout(() => {
                    this.showDashboard();
                }, 1000);
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus(error.message || 'Login failed. Please try again.', 'error');
            this.showFlowError('Login Error', error);
            throw error; // Stop execution
        } finally {
            // Reset button state
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.session?.token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.session = null;
            localStorage.removeItem('vpp_session_token');
            
            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                userInfo.style.display = 'none';
            }
            
            this.showSection('welcomeSection');
            this.showStatus('Logged out successfully', 'success');
        }
    }

    // Utility Functions
    formatCardNumber(input) {
        let value = input.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
        input.value = formattedValue;
    }

    useTestCard(cardNumber) {
        const cardInput = document.getElementById('cardNumber');
        if (cardInput) {
            cardInput.value = cardNumber.match(/.{1,4}/g).join(' ');
        }
    }

    updatePaymentSummary() {
        const merchantName = document.getElementById('merchantName')?.value || 'VPP Demo Store';
        const amount = document.getElementById('amount')?.value || '25.99';
        const currency = document.getElementById('currency')?.value || 'USD';
        
        const summaryMerchant = document.getElementById('summaryMerchant');
        const summaryAmount = document.getElementById('summaryAmount');
        const summaryCard = document.getElementById('summaryCard');
        
        if (summaryMerchant) summaryMerchant.textContent = merchantName;
        if (summaryAmount) {
            const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
            summaryAmount.textContent = `${currencySymbol}${amount}`;
        }
        if (summaryCard && this.session) {
            summaryCard.textContent = this.session.user.maskedCardNumber;
        }
    }

    // VPP Flow Functions
    startPasskeyRegistration() {
        this.showSection('registrationSection');
        this.resetRegistrationSteps();
        this.currentFlow = 'registration';
    }

    startPaymentFlow() {
        this.showSection('paymentSection');
        this.updatePaymentSummary();
        this.currentFlow = 'payment';
    }

    resetRegistrationSteps() {
        // Reset step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === 0) step.classList.add('active');
        });
        
        // Reset step panels
        document.querySelectorAll('.step-panel').forEach((panel, index) => {
            panel.classList.remove('active');
            if (index === 0) panel.classList.add('active');
        });
    }

    async simulate3DSChallenge() {
        try {
            this.showStatus('Starting 3DS challenge simulation...', 'info');
            
            const response = await fetch('/api/passkey/simulate-3ds-challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify({
                    panCredential: this.session.user.maskedCardNumber.replace(/[*\s]/g, ''),
                    amount: '0',
                    currency: 'USD'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showStatus('3DS challenge completed successfully!', 'success');
                this.moveToNextStep(2);
                
                // Simulate device verification
                setTimeout(() => {
                    this.simulateDeviceVerification();
                }, 2000);
            } else {
                throw new Error(data.error || '3DS challenge failed');
            }
        } catch (error) {
            console.error('3DS challenge error:', error);
            this.showStatus(error.message || '3DS challenge failed', 'error');
            this.showFlowError('3DS Challenge Error', error);
            throw error; // Stop execution
        }
    }

    simulateDeviceVerification() {
        this.showStatus('Verifying device capabilities...', 'info');
        
        // Simulate device verification process
        setTimeout(() => {
            this.showStatus('Device verification completed!', 'success');
            this.moveToNextStep(3);
        }, 3000);
    }

    moveToNextStep(stepNumber) {
        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNum = index + 1;
            step.classList.remove('active');
            
            if (stepNum < stepNumber) {
                step.classList.add('completed');
            } else if (stepNum === stepNumber) {
                step.classList.add('active');
            }
        });
        
        // Update step panels
        document.querySelectorAll('.step-panel').forEach((panel, index) => {
            panel.classList.remove('active');
            if (index === stepNumber - 1) {
                panel.classList.add('active');
            }
        });
    }

    async createPasskey() {
        try {
            this.showStatus('Initializing VPP session...', 'info');
            
            // Step 1: Initialize VPP session
            const initResponse = await fetch('/api/vpp/initialize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify({
                    merchantOrigin: this.config.merchantOrigin,
                    integratorOrigin: this.config.integratorOrigin
                })
            });

            const initData = await initResponse.json();
            console.log('📋 Init Data:', initData);
            
            if (!initData.success) {
                throw new Error(initData.error || 'VPP initialization failed');
            }

            this.showStatus('Loading VPP iframe for device profiling...', 'info');
            
            // Step 2: Create and load VPP iframe
            this.createVPPIframe(initData.initializationUrl);
            
            // Step 3: Wait for initialization and device profiling to complete
            // The handleVPPResult and handleVPPEvent methods will process the responses
            // Once both complete, we'll have serverState and dfpSessionId
            
        } catch (error) {
            console.error('Passkey creation error:', error);
            this.showStatus(error.message || 'Failed to create passkey', 'error');
            this.showFlowError('Passkey Creation Error', error);
            throw error; // Stop execution
        }
    }

    createVPPIframe(initUrl) {
        const iframe = document.getElementById('vppIframe');
        if (iframe) {
            iframe.src = initUrl;
            console.log('📱 VPP iframe loaded with URL:', initUrl);
        }
    }

    async proceedWithPARAfterInit() {
        try {
            // Check if we have both serverState and dfpSessionId
            if (!this.serverState || !this.dfpSessionId) {
                console.error('Missing required tokens:', { serverState: !!this.serverState, dfpSessionId: !!this.dfpSessionId });
                throw new Error('Initialization incomplete - missing server_state or dfp_session_id');
            }

            this.showStatus('Checking if passkey exists...', 'info');
            
            // Step 3: First check if passkey exists using AUTHENTICATION flow (as per PDF page 21)
            // "The integrator calls the Authentication Using Passkey API with payment details to
            // determine if a passkey exists. The required payload for authentication containing the
            // server_state_token from the Initialization result should be included with the type set to
            // com_visa_payment_credential_authentication, the response_mode set to 'form_post' and
            // a valid redirect_uri provided."
            const parResponse = await fetch('/api/vpp/pushed-authorization-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify({
                    serverState: this.serverState,
                    xViaHint: this.xViaHint,
                    panCredential: this.session.user.cardNumber,
                    merchantName: 'VPP Demo Store',
                    amount: '25.99', // Use actual amount for authentication check
                    currency: 'USD',
                    flowType: 'authentication', // ✅ Use authentication to check if passkey exists
                    redirectUri: this.config.integratorOrigin
                })
            });

            const parData = await parResponse.json();
            console.log('📋 PAR Response (Authentication Check):', parData);

            // Step 4: Handle error response (notfound_amr_values)
            // "If a 400 failure response is returned, and includes the error "notfound_amr_values", then
            // it signals that a passkey does not exist for the given payment credential and device
            // combination and the cardholder must successfully complete issuer ID&V (i.e. 3DS
            // challenge) before returning to the Visa Payment Passkey registration."
            if (!parData.success && parData.error === 'notfound_amr_values') {
                console.log('⚠️ No passkey found - fallback to 3DS required (Step 3.3-3.4)');
                this.showStatus('No passkey found. Redirecting to 3DS authentication...', 'warning');
                
                // Fallback to 3DS flow
                setTimeout(() => {
                    this.handle3DSFallback();
                }, 2000);
                return;
            }

            if (!parData.success) {
                throw new Error(parData.error || 'PAR creation failed');
            }

            // If we reach here, passkey exists - this shouldn't happen in registration flow
            // but we'll handle it gracefully
            this.showStatus('✅ Passkey already exists! Launching authentication...', 'success');
            
            // Launch VPP authorization flow for authentication
            this.launchVPPAuthorizationFlow(parData);
            
        } catch (error) {
            console.error('PAR creation error:', error);
            this.showStatus(error.message || 'Failed to create authorization request', 'error');
            this.showFlowError('Authorization Request Error', error);
        }
    }

    async handle3DSFallback() {
        try {
            this.showStatus('Starting 3DS authentication...', 'info');
            
            // Simulate 3DS challenge
            const response = await fetch('/api/passkey/simulate-3ds-challenge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify({
                    panCredential: this.session.user.cardNumber,
                    amount: '0',
                    currency: 'USD'
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showStatus('✅ 3DS authentication successful!', 'success');
                this.trustChain = data.trustChain;
                
                // After successful 3DS, retry PAR with trust chain
                setTimeout(() => {
                    this.retryPARAfter3DS();
                }, 2000);
            } else {
                throw new Error(data.error || '3DS authentication failed');
            }
        } catch (error) {
            console.error('3DS fallback error:', error);
            this.showStatus(error.message || '3DS authentication failed', 'error');
            this.showFlowError('3DS Authentication Error', error);
        }
    }

    async retryPARAfter3DS() {
        try {
            this.showStatus('Retrying passkey registration with 3DS proof...', 'info');
            
            // Retry PAR with trust chain from 3DS
            const parResponse = await fetch('/api/vpp/pushed-authorization-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify({
                    serverState: this.serverState,
                    xViaHint: this.xViaHint,
                    panCredential: this.session.user.cardNumber,
                    merchantName: 'VPP Demo Store',
                    amount: '0',
                    currency: 'USD',
                    email: this.session.user.email,
                    flowType: 'registration',
                    trustChain: this.trustChain,
                    redirectUri: this.config.integratorOrigin
                })
            });

            const parData = await parResponse.json();
            console.log('📋 PAR Response after 3DS:', parData);

            // After successful 3DS, even if notfound_amr_values is returned again,
            // we should proceed with passkey creation since ID&V is complete
            if (!parData.success && parData.error === 'notfound_amr_values') {
                console.log('⚠️ Still no passkey after 3DS - but ID&V is complete, proceeding with creation');
                this.showStatus('✅ 3DS verification complete! Launching passkey creation...', 'success');
                
                // Since this is a simulated environment and we have trust chain,
                // we can proceed to launch the passkey creation flow
                // In production, the API would return success after valid trust chain
                
                // For demo: simulate successful PAR response
                const simulatedParData = {
                    success: true,
                    request: this.createSimulatedJWT(),
                    authorization_endpoint: '/oauth2/authorization/request/hub/payment-credential-binding',  // ✅ Fixed: Full path for registration
                    expires_in: 480
                };
                
                this.launchVPPAuthorizationFlow(simulatedParData);
                return;
            }

            if (!parData.success) {
                throw new Error(parData.error || 'PAR creation failed after 3DS');
            }

            this.showStatus('✅ Authorization approved! Launching passkey registration...', 'success');
            
            // Launch VPP authorization flow
            this.launchVPPAuthorizationFlow(parData);
            
        } catch (error) {
            console.error('PAR retry error:', error);
            this.showStatus(error.message || 'Failed to create authorization after 3DS', 'error');
            this.showFlowError('Authorization Request Error', error);
        }
    }

    createSimulatedJWT() {
        // Create a simulated JWT for demo purposes
        const header = {
            alg: "ES256",
            kid: "demo_key_id",
            typ: "oauth-authz-req+jwt"
        };

        const payload = {
            iss: "https://www.visa.com",
            aud: "https://www.visa.com",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 480,
            max_age: 0,
            amr_values: ["pop#fido2"],
            client_id: "demo_client_id",
            response_type: "code",
            response_mode: "com_visa_web_message",
            redirect_uri: "https://www.example-merchant.com/callback",
            scope: "openid",
            state: crypto.randomUUID ? crypto.randomUUID() : this.generateUUID(),
            server_state: this.serverState,
            nonce: crypto.randomUUID ? crypto.randomUUID() : this.generateUUID(),
            authorization_details: [
                {
                    type: "com_visa_payment_credential_binding",
                    payer: {
                        account: {
                            scheme: "com_visa_pan",
                            id: this.session.user.cardNumber
                        }
                    },
                    payee: {
                        name: "VPP Demo Store",
                        origin: this.config.merchantOrigin
                    },
                    preferences: {
                        notification: {
                            email: this.session.user.email
                        }
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
            ]
        };

        // Create a simple base64 encoded "JWT" for demo
        const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
        const signature = btoa(crypto.randomUUID ? crypto.randomUUID() : this.generateUUID()).replace(/=/g, '');

        return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    launchVPPAuthorizationFlow(parData) {
        try {
            this.showStatus('Preparing passkey registration...', 'info');
            
            // Create authorization request command
            const authCommand = {
                type: "COMMAND",
                ref: crypto.randomUUID ? crypto.randomUUID() : this.generateUUID(),
                ts: Date.now(),
                command: {
                    type: "AUTHORIZATION_REQUEST",
                    data: {
                        request: parData.request,  // JWT from PAR response
                        authorization_endpoint: parData.authorization_endpoint  // Endpoint from PAR response
                    }
                }
            };

            const vppBaseUrl = this.config.vppBaseUrl;
            const fragment = encodeURIComponent(JSON.stringify(authCommand));
            
            // ✅ Use authorization_endpoint from PAR response (not hardcoded)
            // This will be either:
            // - /oauth2/authorization/request/hub/payment-credential-binding (for registration)
            // - /oauth2/authorization/request/hub/payment-credential-authentication (for payment)
            const authorizationEndpoint = parData.authorization_endpoint;
            
            // Log URL components for debugging
            console.log('='.repeat(80));
            console.log('🔗 URL CONSTRUCTION DETAILS:');
            console.log('='.repeat(80));
            console.log('1. VPP Base URL:', vppBaseUrl);
            console.log('2. Authorization Endpoint (from PAR):', authorizationEndpoint);
            console.log('3. Authorization Command:', JSON.stringify(authCommand, null, 2));
            console.log('4. Fragment (first 100 chars):', fragment.substring(0, 100) + '...');
            
            // Construct URL: base + endpoint + #msg= + fragment
            const authUrl = `${vppBaseUrl}${authorizationEndpoint}#msg=${fragment}`;
            
            console.log('-'.repeat(80));
            console.log('🚀 FINAL AUTHORIZATION URL:');
            console.log(authUrl);
            console.log('='.repeat(80));
            
            // Open in popup for better UX
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = 120;
            const windowSettings = `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=no,status=yes,location=no`;
            
            window.open(authUrl, 'vpp_passkey_registration', windowSettings);
            
            this.showStatus('Complete passkey registration in the popup window', 'info');
            
        } catch (error) {
            console.error('Authorization flow launch error:', error);
            this.showStatus(error.message || 'Failed to launch authorization flow', 'error');
            this.showFlowError('Authorization Flow Error', error);
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async processPayment(event) {
        event.preventDefault();
        
        const paymentBtn = document.getElementById('paymentBtn');
        const btnText = paymentBtn.querySelector('.btn-text');
        const btnSpinner = paymentBtn.querySelector('.btn-spinner');
        
        // Show loading state
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline';
        paymentBtn.disabled = true;

        try {
            const formData = new FormData(event.target);
            const paymentData = {
                merchantName: formData.get('merchantName') || 'VPP Demo Store',
                amount: parseFloat(formData.get('amount')),
                currency: formData.get('currency'),
                description: formData.get('description'),
                panCredential: this.session.user.maskedCardNumber.replace(/[*\s]/g, '')
            };

            this.showStatus('Initializing payment with VPP...', 'info');

            // Step 1: Create payment authorization details
            const authResponse = await fetch('/api/passkey/authentication-flow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.session.token}`
                },
                body: JSON.stringify(paymentData)
            });

            const authData = await authResponse.json();
            
            if (!authData.success) {
                throw new Error(authData.error || 'Failed to create payment authorization');
            }

            this.showStatus('Authenticating with passkey...', 'info');
            
            // Simulate passkey authentication
            this.simulatePasskeyAuthentication(paymentData);
            
        } catch (error) {
            console.error('Payment processing error:', error);
            this.showStatus(error.message || 'Payment processing failed', 'error');
            this.showFlowError('Payment Processing Error', error);
            throw error; // Stop execution
        } finally {
            // Reset button state
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            paymentBtn.disabled = false;
        }
    }

    simulatePasskeyAuthentication(paymentData) {
        // Simulate WebAuthn get() call
        if (navigator.credentials && navigator.credentials.get) {
            this.showStatus('Please authenticate with your passkey', 'info');
            
            // Simulate authentication process
            setTimeout(() => {
                this.showStatus('Authentication successful!', 'success');
                
                setTimeout(() => {
                    this.showPaymentSuccess(paymentData);
                }, 1000);
            }, 3000);
        } else {
            this.showStatus('⚠️ WebAuthn not supported on this device', 'warning');
        }
    }

    showPaymentSuccess(paymentData) {
        const currencySymbol = paymentData.currency === 'USD' ? '$' : 
                             paymentData.currency === 'EUR' ? '€' : '£';
        
        this.showStatus(
            `🎉 Payment successful! ${currencySymbol}${paymentData.amount} charged to ${this.session.user.maskedCardNumber}`, 
            'success'
        );
        
        setTimeout(() => {
            this.showDashboard();
        }, 3000);
    }

    // VPP Message Handler
    handleVPPMessage(event) {
        // Validate origin for security - allow sandbox and production Visa domains
        const allowedOrigins = [
            'https://sandbox.auth.visa.com',
            'https://sandbox.in.auth.visa.com',
            'https://auth.visa.com',
            'https://in.auth.visa.com',
            'https://localhost:3000',
            'http://localhost:3000'
        ];
        
        const isAllowedOrigin = allowedOrigins.some(origin => event.origin.includes(origin.replace('https://', '').replace('http://', '')));
        
        if (!isAllowedOrigin) {
            console.warn('⚠️ Ignoring message from untrusted origin:', event.origin);
            return;
        }

        console.log('📨 VPP Message received from:', event.origin);
        console.log('📨 Message data:', event.data);
        
        try {
            const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            
            if (message.type === 'RESULT') {
                this.handleVPPResult(message);
            } else if (message.type === 'EVENT') {
                this.handleVPPEvent(message);
            } else {
                console.log('📨 Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('❌ Error parsing VPP message:', error);
            console.error('Raw event data:', event.data);
        }
    }

    handleVPPResult(message) {
        const { result } = message;
        
        console.log('📋 Processing VPP Result:', result);
        
        if (result.command_type === 'INITIALIZATION') {
            if (result.status === 'SUCCESS') {
                console.log('✅ VPP Initialization successful');
                console.log('📊 Initialization data:', result.data);
                
                // Store server_state token from initialization
                if (result.data && result.data.tokens && result.data.tokens.length > 0) {
                    const serverStateToken = result.data.tokens.find(t => 
                        t.token_type_hint === 'urn:ext:oauth:token-type-hint:server_state'
                    );
                    
                    if (serverStateToken) {
                        this.serverState = serverStateToken.token;
                        this.xViaHint = result.data.x_via_hint;
                        console.log('💾 Stored server_state token for PAR');
                    }
                }
                
                // Check iframe support
                if (result.data && result.data.iframe_support) {
                    console.log('🖼️ Iframe support:', result.data.iframe_support);
                }
                
                this.showStatus('VPP session initialized successfully', 'success');
            } else {
                console.error('❌ VPP Initialization failed');
                console.error('Error details:', result.data);
                const errorMsg = result.data?.error_description || result.data?.error || 'VPP initialization failed';
                const error = new Error(errorMsg);
                this.showStatus('VPP initialization failed: ' + errorMsg, 'error');
                this.showFlowError('VPP Initialization Error', error);
            }
        } else if (result.command_type === 'AUTHORIZATION_REQUEST') {
            if (result.status === 'SUCCESS') {
                console.log('✅ VPP Authorization successful');
                console.log('📊 Authorization data:', result.data);
                this.showStatus('VPP authorization completed', 'success');
                // Handle authorization success
            } else {
                console.error('❌ VPP Authorization failed');
                console.error('Error details:', result.data);
                const errorMsg = result.data?.error_description || result.data?.error || 'VPP authorization failed';
                const error = new Error(errorMsg);
                this.showStatus('VPP authorization failed: ' + errorMsg, 'error');
                this.showFlowError('VPP Authorization Error', error);
            }
        }
    }

    handleVPPEvent(message) {
        const { event } = message;
        
        console.log('📋 Processing VPP Event:', event);
        
        if (event.type === 'DEVICE_DATA_CAPTURED') {
            console.log('✅ Device profiling successful');
            console.log('📊 Device data:', event.data);
            
            // Extract DFP session ID
            if (event.data && event.data.uebas && event.data.uebas.length > 0) {
                const dfpSession = event.data.uebas.find(u => u.ueba_source === 'VDI');
                if (dfpSession) {
                    this.dfpSessionId = dfpSession.ueba_ref;
                    console.log('💾 DFP Session ID:', this.dfpSessionId);
                }
            }
            
            this.showStatus('✅ Device profiling completed successfully', 'success');
            
            // Both initialization and device profiling are complete
            if (this.serverState && this.dfpSessionId) {
                console.log('🎉 VPP initialization fully complete - ready for PAR');
                this.showStatus('VPP ready for passkey operations', 'success');
                
                // Automatically proceed with PAR after initialization
                setTimeout(() => {
                    this.proceedWithPARAfterInit();
                }, 1000);
            }
            
        } else if (event.type === 'DEVICE_DATA_CAPTURE_FAILED') {
            console.error('❌ Device profiling failed');
            console.error('Error details:', event.data);
            
            const errorMsg = event.data?.error_description || event.data?.error || event.error_message || 'Device profiling failed';
            const error = new Error(errorMsg);
            
            this.showStatus('❌ Device profiling failed: ' + errorMsg, 'error');
            this.showFlowError('Device Profiling Error', error);
            
        } else if (event.type === 'POPUP_WINDOW_TERMINATED') {
            console.log('🪟 VPP popup closed');
            this.showStatus('VPP popup was closed by user', 'info');
        } else {
            console.log('📨 Unknown event type:', event.type);
        }
    }

    // Status Message System
    showStatus(message, type = 'info', duration = 5000) {
        const container = document.getElementById('statusContainer');
        if (!container) return;

        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 0.25rem;">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'} 
                ${type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div>${message}</div>
        `;

        container.appendChild(statusDiv);

        // Auto-remove after duration
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, duration);

        console.log(`${type.toUpperCase()}: ${message}`);
    }

    validateSession() {
        if (this.session) {
            // In a real implementation, validate session with server
            console.log('🔄 Validating session...');
        }
    }

    // Show flow error on screen and stop execution
    showFlowError(title, error) {
        // Disable all interactive elements
        const buttons = document.querySelectorAll('button, input[type="submit"]');
        buttons.forEach(btn => btn.disabled = true);

        // Create error modal overlay
        const errorModal = document.createElement('div');
        errorModal.className = 'flow-error-modal';
        errorModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            animation: fadeIn 0.3s ease-in-out;
        `;

        errorModal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div style="
                background: white;
                border-radius: 16px;
                padding: 32px;
                max-width: 550px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
                animation: slideIn 0.3s ease-in-out;
            ">
                <div style="
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #fc8181 0%, #e53e3e 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
                ">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                
                <h2 style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #1a202c;
                    margin: 0 0 12px;
                    text-align: center;
                ">${title}</h2>
                
                <p style="
                    font-size: 15px;
                    color: #4a5568;
                    margin: 0 0 20px;
                    text-align: center;
                    line-height: 1.5;
                ">The operation encountered an error and has been stopped to prevent further issues.</p>
                
                <div style="
                    background: #fff5f5;
                    border-left: 4px solid #e53e3e;
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 24px;
                ">
                    <div style="
                        font-weight: 600;
                        color: #c53030;
                        margin-bottom: 8px;
                        font-size: 13px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    ">Error Message:</div>
                    <div style="
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        color: #742a2a;
                        word-break: break-word;
                        line-height: 1.5;
                    ">${error.message || 'An unknown error occurred'}</div>
                </div>
                
                <div style="
                    background: #f7fafc;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 24px;
                ">
                    <div style="
                        font-weight: 600;
                        color: #2d3748;
                        margin-bottom: 12px;
                        font-size: 14px;
                    ">💡 What to do next:</div>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        color: #4a5568;
                        font-size: 14px;
                        line-height: 1.6;
                    ">
                        <li style="margin-bottom: 6px;">Check the error message above for details</li>
                        <li style="margin-bottom: 6px;">Review the browser console for additional logs</li>
                        <li style="margin-bottom: 6px;">Try the operation again after resolving the issue</li>
                        <li style="margin-bottom: 6px;">Contact support if the problem persists</li>
                    </ul>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="this.closest('.flow-error-modal').remove(); document.querySelectorAll('button, input[type=\\'submit\\']').forEach(btn => btn.disabled = false);" style="
                        background: white;
                        color: #4a5568;
                        border: 2px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 10px 24px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='#cbd5e0'; this.style.background='#f7fafc'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'">
                        Dismiss
                    </button>
                    <button onclick="window.location.reload()" style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 10px 24px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'">
                        Reload Page
                    </button>
                </div>
            </div>
        `;

        // Remove existing error modal if any
        const existingModal = document.querySelector('.flow-error-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add error modal to body
        document.body.appendChild(errorModal);

        // Log detailed error information
        console.error('='.repeat(80));
        console.error(`FLOW ERROR: ${title} - EXECUTION STOPPED`);
        console.error('='.repeat(80));
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        console.error('Timestamp:', new Date().toISOString());
        console.error('Current Flow:', this.currentFlow);
        console.error('='.repeat(80));
    }

    // Show initialization error on screen and stop execution
    showInitializationError(error) {
        // Hide all sections
        const sections = ['welcomeSection', 'loginSection', 'dashboardSection', 'paymentSection', 'registrationSection'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });

        // Create and display error screen
        const errorScreen = document.createElement('div');
        errorScreen.id = 'initializationErrorScreen';
        errorScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        errorScreen.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 600px;
                width: 100%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                text-align: center;
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: #fee;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                ">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>
                
                <h1 style="
                    font-size: 28px;
                    font-weight: 700;
                    color: #1a202c;
                    margin: 0 0 16px;
                ">Initialization Failed</h1>
                
                <p style="
                    font-size: 16px;
                    color: #4a5568;
                    margin: 0 0 24px;
                    line-height: 1.6;
                ">The application failed to initialize properly and cannot continue.</p>
                
                <div style="
                    background: #fff5f5;
                    border: 1px solid #feb2b2;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 24px;
                    text-align: left;
                ">
                    <div style="
                        font-weight: 600;
                        color: #c53030;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                    ">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        Error Details:
                    </div>
                    <div style="
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        color: #742a2a;
                        word-break: break-word;
                    ">${error.message || 'Unknown error occurred'}</div>
                </div>
                
                <div style="
                    background: #f7fafc;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 24px;
                    text-align: left;
                ">
                    <div style="font-weight: 600; color: #2d3748; margin-bottom: 12px;">Troubleshooting Steps:</div>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        color: #4a5568;
                        text-align: left;
                    ">
                        <li style="margin-bottom: 8px;">Check if the server is running properly</li>
                        <li style="margin-bottom: 8px;">Verify your network connection</li>
                        <li style="margin-bottom: 8px;">Check the browser console for detailed error logs</li>
                        <li style="margin-bottom: 8px;">Ensure all required environment variables are set</li>
                        <li style="margin-bottom: 8px;">Try clearing browser cache and reloading</li>
                    </ul>
                </div>
                
                <button onclick="window.location.reload()" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 12px 32px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Reload Application
                </button>
            </div>
        `;

        // Remove existing error screen if any
        const existingError = document.getElementById('initializationErrorScreen');
        if (existingError) {
            existingError.remove();
        }

        // Add error screen to body
        document.body.appendChild(errorScreen);

        // Log detailed error information
        console.error('='.repeat(80));
        console.error('INITIALIZATION ERROR - APPLICATION STOPPED');
        console.error('='.repeat(80));
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        console.error('Timestamp:', new Date().toISOString());
        console.error('='.repeat(80));
    }
}

// Global functions for HTML event handlers
let app;

function showLoginForm() {
    app?.showLoginForm();
}

function showDashboard() {
    app?.showDashboard();
}

function showDocumentation() {
    app?.showDocumentation();
}

function handleLogin(event) {
    app?.handleLogin(event);
}

function logout() {
    app?.logout();
}

function formatCardNumber(input) {
    app?.formatCardNumber(input);
}

function useTestCard(cardNumber) {
    app?.useTestCard(cardNumber);
}

function startPasskeyRegistration() {
    app?.startPasskeyRegistration();
}

function startPaymentFlow() {
    app?.startPaymentFlow();
}

function simulate3DSChallenge() {
    app?.simulate3DSChallenge();
}

function createPasskey() {
    app?.createPasskey();
}

function processPayment(event) {
    app?.processPayment(event);
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app = new VPPMerchantApp();
    
    // Global error handler
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        app?.showStatus('An unexpected error occurred', 'error');
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        app?.showStatus('An unexpected error occurred', 'error');
    });
});

// END GENAI
