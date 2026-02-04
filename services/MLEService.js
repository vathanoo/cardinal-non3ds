// START GENAI
const jose = require('jose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Message Level Encryption Service for VPP API
 * Encrypts payloads using JWE (JSON Web Encryption) with RSA-OAEP-256 and A128GCM
 */
class MLEService {
    constructor() {
        // Load the server certificate for encryption
        this.certPath = path.join(__dirname, '../certs/server_cert_bdf44016-16ae-4903-8d16-d37708b8f10c.pem');
        this.keyId = 'bdf44016-16ae-4903-8d16-d37708b8f10c';
        
        if (!fs.existsSync(this.certPath)) {
            throw new Error(`Server certificate not found at: ${this.certPath}`);
        }
        
        console.log('✅ MLEService initialized with certificate:', this.certPath);
    }

    /**
     * Extract public key from certificate
     * @returns {crypto.KeyObject} Public key object
     */
    getPublicKeyFromCertificate() {
        try {
            const certPem = fs.readFileSync(this.certPath, 'utf8');
            const publicKey = crypto.createPublicKey(certPem);
            return publicKey;
        } catch (error) {
            console.error('Error extracting public key from certificate:', error);
            throw new Error('Failed to extract public key from certificate');
        }
    }

    /**
     * Encrypt payload using JWE with RSA-OAEP-256 and A128GCM
     * @param {Object|string} payload - The payload to encrypt
     * @returns {Promise<string>} Encrypted JWE string
     */
    async encryptPayload(payload) {
        try {
            // Convert payload to JSON string if it's an object
            const jsonPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
            
            // Get public key from certificate
            const publicKey = this.getPublicKeyFromCertificate();
            
            // Current timestamp in milliseconds (as shown in the sample)
            const iat = Date.now();
            
            console.log('🔐 Encrypting payload with MLE...');
            console.log('  Algorithm: RSA-OAEP-256');
            console.log('  Encryption: A128GCM');
            console.log('  Key ID:', this.keyId);
            console.log('  IAT:', iat);
            
            // Create JWE using jose library
            const jwe = await new jose.CompactEncrypt(
                new TextEncoder().encode(jsonPayload)
            )
                .setProtectedHeader({
                    alg: 'RSA-OAEP-256',
                    typ: 'JOSE',
                    enc: 'A128GCM',
                    iat: iat,
                    kid: this.keyId
                })
                .encrypt(publicKey);
            
            console.log('✅ Payload encrypted successfully');
            console.log('  JWE length:', jwe.length);
            console.log('  JWE preview:', jwe.substring(0, 100) + '...');
            
            return jwe;
        } catch (error) {
            console.error('❌ Error encrypting payload:', error);
            throw new Error(`Failed to encrypt payload: ${error.message}`);
        }
    }

    /**
     * Create encrypted request body for VPP PAR API
     * @param {Object} parRequest - The PAR request payload
     * @returns {Promise<Object>} Encrypted request body with encData field
     */
    async createEncryptedRequest(parRequest) {
        try {
            console.log('📦 Creating encrypted request for PAR API...');
            console.log('  Original payload size:', JSON.stringify(parRequest).length, 'bytes');
            
            // Encrypt the payload
            const encryptedJWE = await this.encryptPayload(parRequest);
            
            // Create the request body with encData field as per Visa API spec
            const encryptedRequest = {
                encData: encryptedJWE
            };
            
            console.log('✅ Encrypted request created');
            console.log('  Encrypted payload size:', encryptedJWE.length, 'bytes');
            
            return encryptedRequest;
        } catch (error) {
            console.error('❌ Error creating encrypted request:', error);
            throw new Error(`Failed to create encrypted request: ${error.message}`);
        }
    }

    /**
     * Decrypt JWE response (if needed for response decryption)
     * Note: This requires the private key, which should be kept secure
     * @param {string} encryptedJwe - The encrypted JWE string
     * @param {string} privateKeyPath - Path to private key
     * @returns {Promise<Object>} Decrypted payload
     */
    async decryptResponse(encryptedJwe, privateKeyPath) {
        try {
            if (!fs.existsSync(privateKeyPath)) {
                throw new Error(`Private key not found at: ${privateKeyPath}`);
            }
            
            const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
            const privateKey = crypto.createPrivateKey(privateKeyPem);
            
            const { plaintext } = await jose.compactDecrypt(encryptedJwe, privateKey);
            const decryptedPayload = new TextDecoder().decode(plaintext);
            
            return JSON.parse(decryptedPayload);
        } catch (error) {
            console.error('Error decrypting response:', error);
            throw new Error(`Failed to decrypt response: ${error.message}`);
        }
    }

    /**
     * Validate certificate and key configuration
     * @returns {Object} Validation result
     */
    validateConfiguration() {
        const issues = [];
        
        if (!fs.existsSync(this.certPath)) {
            issues.push(`Server certificate not found at: ${this.certPath}`);
        }
        
        if (!this.keyId) {
            issues.push('Key ID not configured');
        }
        
        try {
            this.getPublicKeyFromCertificate();
        } catch (error) {
            issues.push(`Failed to load public key: ${error.message}`);
        }
        
        return {
            valid: issues.length === 0,
            issues,
            certPath: this.certPath,
            keyId: this.keyId
        };
    }
}

module.exports = MLEService;

// END GENAI
