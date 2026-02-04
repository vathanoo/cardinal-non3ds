// START GENAI
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class AuthService {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'demo-secret-key';
        this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 900; // 15 minutes default
    }

    /**
     * Create a JWT token for user session
     * @param {Object} userData - User data to encode in token
     * @returns {string} JWT token
     */
    createToken(userData) {
        try {
            const payload = {
                ...userData,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + this.sessionTimeout,
                jti: uuidv4() // JWT ID for token uniqueness
            };

            return jwt.sign(payload, this.jwtSecret);
        } catch (error) {
            console.error('Error creating JWT token:', error);
            throw new Error('Failed to create authentication token');
        }
    }

    /**
     * Verify and decode a JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded token payload
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            } else {
                throw new Error('Token verification failed');
            }
        }
    }

    /**
     * Extract token from Authorization header
     * @param {string} authHeader - Authorization header value
     * @returns {string|null} Extracted token or null
     */
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    /**
     * Validate user credentials (demo implementation)
     * @param {string} email - User email
     * @param {string} cardNumber - Card number
     * @returns {Promise<Object>} Validation result
     */
    async validateCredentials(email, cardNumber) {
        try {
            // In a real implementation, this would validate against your user database
            // For demo purposes, we'll do basic validation
            
            if (!email || !email.includes('@')) {
                return {
                    valid: false,
                    error: 'Invalid email format'
                };
            }

            if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
                return {
                    valid: false,
                    error: 'Invalid card number length'
                };
            }

            // Basic Luhn algorithm check for card number
            if (!this.isValidCardNumber(cardNumber)) {
                return {
                    valid: false,
                    error: 'Invalid card number'
                };
            }

            // Check if it's a Visa card (starts with 4)
            if (!cardNumber.startsWith('4')) {
                return {
                    valid: false,
                    error: 'Only Visa cards are supported for this demo'
                };
            }

            return {
                valid: true,
                userId: uuidv4(),
                email: email,
                maskedCardNumber: this.maskCardNumber(cardNumber),
                cardType: 'Visa'
            };

        } catch (error) {
            console.error('Error validating credentials:', error);
            return {
                valid: false,
                error: 'Credential validation failed'
            };
        }
    }

    /**
     * Validate card number using Luhn algorithm
     * @param {string} cardNumber - Card number to validate
     * @returns {boolean} True if valid
     */
    isValidCardNumber(cardNumber) {
        try {
            // Remove any non-digit characters
            const digits = cardNumber.replace(/\D/g, '');
            
            let sum = 0;
            let isEven = false;
            
            // Loop through digits from right to left
            for (let i = digits.length - 1; i >= 0; i--) {
                let digit = parseInt(digits[i]);
                
                if (isEven) {
                    digit *= 2;
                    if (digit > 9) {
                        digit -= 9;
                    }
                }
                
                sum += digit;
                isEven = !isEven;
            }
            
            return sum % 10 === 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Mask card number for display
     * @param {string} cardNumber - Card number to mask
     * @returns {string} Masked card number
     */
    maskCardNumber(cardNumber) {
        try {
            const digits = cardNumber.replace(/\D/g, '');
            if (digits.length < 4) return cardNumber;
            
            const lastFour = digits.slice(-4);
            const masked = '*'.repeat(digits.length - 4) + lastFour;
            
            // Format with spaces for readability
            return masked.replace(/(.{4})/g, '$1 ').trim();
        } catch (error) {
            return cardNumber;
        }
    }

    /**
     * Generate a secure random state parameter
     * @returns {string} Random state string
     */
    generateState() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Generate PKCE code verifier and challenge
     * @returns {Object} Code verifier and challenge
     */
    generatePKCE() {
        try {
            const codeVerifier = crypto.randomBytes(32).toString('base64url');
            const codeChallenge = crypto
                .createHash('sha256')
                .update(codeVerifier)
                .digest('base64url');

            return {
                codeVerifier,
                codeChallenge,
                codeChallengeMethod: 'S256'
            };
        } catch (error) {
            console.error('Error generating PKCE:', error);
            throw new Error('Failed to generate PKCE parameters');
        }
    }

    /**
     * Create session data for VPP flow
     * @param {Object} userData - User data
     * @param {Object} flowData - VPP flow data
     * @returns {Object} Session data
     */
    createSession(userData, flowData = {}) {
        try {
            const sessionId = uuidv4();
            const session = {
                sessionId,
                userId: userData.userId,
                email: userData.email,
                maskedCardNumber: userData.maskedCardNumber,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.sessionTimeout * 1000).toISOString(),
                vppFlow: {
                    state: this.generateState(),
                    correlationId: uuidv4(),
                    ...flowData
                }
            };

            // In a real implementation, store this session in a database or cache
            // For demo purposes, we'll return it to be managed by the client
            
            return session;
        } catch (error) {
            console.error('Error creating session:', error);
            throw new Error('Failed to create user session');
        }
    }

    /**
     * Validate session data
     * @param {Object} sessionData - Session data to validate
     * @returns {boolean} True if session is valid
     */
    validateSession(sessionData) {
        try {
            if (!sessionData || !sessionData.sessionId || !sessionData.expiresAt) {
                return false;
            }

            const expirationTime = new Date(sessionData.expiresAt);
            const now = new Date();

            return expirationTime > now;
        } catch (error) {
            console.error('Error validating session:', error);
            return false;
        }
    }

    /**
     * Refresh session expiration
     * @param {Object} sessionData - Current session data
     * @returns {Object} Updated session data
     */
    refreshSession(sessionData) {
        try {
            if (!this.validateSession(sessionData)) {
                throw new Error('Cannot refresh expired or invalid session');
            }

            return {
                ...sessionData,
                expiresAt: new Date(Date.now() + this.sessionTimeout * 1000).toISOString(),
                lastActivity: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error refreshing session:', error);
            throw new Error('Failed to refresh session');
        }
    }

    /**
     * Generate device fingerprint (simplified for demo)
     * @param {Object} deviceInfo - Device information
     * @returns {string} Device fingerprint
     */
    generateDeviceFingerprint(deviceInfo = {}) {
        try {
            const {
                userAgent = 'unknown',
                language = 'en',
                platform = 'unknown',
                screenResolution = 'unknown'
            } = deviceInfo;

            const fingerprint = crypto
                .createHash('sha256')
                .update(`${userAgent}:${language}:${platform}:${screenResolution}`)
                .digest('hex');

            return fingerprint.substring(0, 16); // Shortened for demo
        } catch (error) {
            console.error('Error generating device fingerprint:', error);
            return crypto.randomBytes(8).toString('hex');
        }
    }
}

module.exports = AuthService;

// END GENAI
