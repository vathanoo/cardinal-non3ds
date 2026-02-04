<!-- START GENAI -->
# MLE.js Testing Guide

## Overview

The `mle.js` file implements Message Level Encryption (MLE) for CyberSource API integration with Aldar Properties. It provides encryption, decryption, and JWT signing capabilities for secure payment processing.

---

## Prerequisites

### 1. Install Dependencies

```bash
npm install jose
```

The `jose` library is required for JWE (JSON Web Encryption) and JWS (JSON Web Signature) operations.

### 2. Verify Node.js Version

Ensure you're using Node.js version 14 or higher (for ES modules support):

```bash
node --version
```

---

## Testing Methods

### Method 1: Run the Built-in Test Function

The file includes a comprehensive test function that demonstrates the complete MLE workflow.

#### Step 1: Run the test

```bash
node mle.js
```

#### Expected Output:

```
============================================================
MLE Encryption/Decryption Test - Aldar Properties
============================================================

1. Original Payment Request:
{
  "processingInformation": {
    "actionList": ["TOKEN_CREATE"],
    "actionTokenTypes": ["instrumentIdentifier"]
  },
  "tokenInformation": {
    "instrumentIdentifier": {
      "type": "enrollable card",
      "card": {
        "number": "xxxxxxxxxxxxxxx",
        "expirationMonth": "12",
        "expirationYear": "2027"
      }
    }
  }
}

2. Encrypting payload with Aldar public key...
Encrypted JWE (truncated):
eyJhbGciOiJSU0EtT0FFUCIsInYtYy1tZXJjaGFudC1pZCI6ImFsZGFyX3Byb3BlcnRpZXMwMDEiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiYXBwbGljYXRpb24vanNvbiIsImtpZCI6IjE3NjUzNTU4Nzg3MzMwMjI0NzEwNzMiLCJpYXQiOjE3MzQyNDM5ODR9...

3. HTTP Body with encrypted request:
{"encryptedRequest":"eyJhbGciOiJSU0EtT0FFUCIsInYtYy1tZXJjaGFudC1pZCI6ImFsZGFyX3Byb3BlcnRpZXMwMDEiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiYXBwbGljYXRpb24vanNvbiIsImtpZCI6IjE3NjUzNTU4Nzg3MzMwMjI0NzEwNzMiLCJpYXQiOjE3MzQyNDM5ODR9...

4. JWT Payload for signing:
{
  "iat": 1734243984,
  "v-c-merchant-id": "aldar_properties001",
  "digestAlgorithm": "SHA-256",
  "digest": "base64_encoded_hash..."
}

5. Signing JWT with REST credentials...
Signed JWT (truncated):
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjQwYTNjYWRhLTMxZTYtNDlmNy1hOGRlLTg5NjI1NjYzMWQzMyJ9...

6. Decrypting payload with Aldar private key...
Decrypted payload:
{
  "processingInformation": {
    "actionList": ["TOKEN_CREATE"],
    "actionTokenTypes": ["instrumentIdentifier"]
  },
  "tokenInformation": {
    "instrumentIdentifier": {
      "type": "enrollable card",
      "card": {
        "number": "xxxxxxxxxxxxxxx",
        "expirationMonth": "12",
        "expirationYear": "2027"
      }
    }
  }
}

7. Verification:
Decrypted payload matches original: ✓ SUCCESS

8. Complete API Request Structure:
────────────────────────────────────────────────────────────
POST https://apitest.cybersource.com/pts/v2/payments
Headers:
  Content-Type: application/json
  v-c-merchant-id: aldar_properties001
  Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjQwYTNjYWRhLTMxZTYtNDlmNy1hOGRlLTg5NjI1NjYzMWQzMyJ9...

Body:
  {"encryptedRequest":"eyJhbGciOiJSU0EtT0FFUCIsInYtYy1tZXJjaGFudC1pZCI6ImFsZGFyX3Byb3BlcnRpZXMwMDEiLCJlbmMiOiJBMjU2R0NNIiwiY3R5IjoiYXBwbGljYXRpb24vanNvbiIsImtpZCI6IjE3NjUzNTU4Nzg3MzMwMjI0NzEwNzMiLCJpYXQiOjE3MzQyNDM5ODR9...
────────────────────────────────────────────────────────────

============================================================
Test completed successfully!
============================================================
```

---

### Method 2: Interactive Testing with Node REPL

Test individual functions interactively:

#### Step 1: Start Node REPL

```bash
node
```

#### Step 2: Import the module

```javascript
const mle = await import('./mle.js');
```

#### Step 3: Test encryption

```javascript
const payload = {
  processingInformation: {
    actionList: ["TOKEN_CREATE"]
  }
};

const encrypted = await mle.simpleEncryptPayload(payload);
console.log('Encrypted:', encrypted);
```

#### Step 4: Test decryption

```javascript
const decrypted = await mle.simpleDecryptPayload(encrypted);
console.log('Decrypted:', decrypted);
```

#### Step 5: Test JWT signing

```javascript
const jwtPayload = {
  iat: Math.floor(Date.now() / 1000),
  "v-c-merchant-id": "aldar_properties001",
  digestAlgorithm: "SHA-256",
  digest: "test_digest"
};

const signed = await mle.signPayload(
  jwtPayload,
  mle.ALDAR_PRIVATE_KEY,
  mle.ALDAR_CONFIG.keyId
);
console.log('Signed JWT:', signed);
```

---

### Method 3: Create a Custom Test Script

Create a new file `test-mle.js`:

```javascript
import {
  simpleEncryptPayload,
  simpleDecryptPayload,
  signPayload,
  sha256Base64,
  ALDAR_CONFIG,
  ALDAR_PRIVATE_KEY
} from './mle.js';

async function customTest() {
  console.log('🧪 Custom MLE Test\n');

  // Test 1: Encrypt a payment request
  console.log('Test 1: Encryption');
  const paymentRequest = {
    clientReferenceInformation: {
      code: "TEST_" + Date.now()
    },
    processingInformation: {
      actionList: ["TOKEN_CREATE"],
      actionTokenTypes: ["instrumentIdentifier"]
    },
    tokenInformation: {
      instrumentIdentifier: {
        type: "enrollable card",
        card: {
          number: "4111111111111111",
          expirationMonth: "12",
          expirationYear: "2027"
        }
      }
    }
  };

  const encrypted = await simpleEncryptPayload(paymentRequest);
  console.log('✓ Encrypted successfully');
  console.log('JWE length:', encrypted.length);

  // Test 2: Decrypt the payload
  console.log('\nTest 2: Decryption');
  const decrypted = await simpleDecryptPayload(encrypted);
  const parsed = JSON.parse(decrypted);
  console.log('✓ Decrypted successfully');
  console.log('Decrypted data:', JSON.stringify(parsed, null, 2));

  // Test 3: Create HTTP request with signature
  console.log('\nTest 3: Create Signed Request');
  const httpBody = { encryptedRequest: encrypted };
  const httpBodyString = JSON.stringify(httpBody);
  
  const digest = sha256Base64(httpBodyString);
  const jwtPayload = {
    iat: Math.floor(Date.now() / 1000),
    "v-c-merchant-id": ALDAR_CONFIG.merchantId,
    digestAlgorithm: "SHA-256",
    digest: digest
  };

  const signature = await signPayload(
    jwtPayload,
    ALDAR_PRIVATE_KEY,
    ALDAR_CONFIG.keyId
  );
  
  console.log('✓ Request signed successfully');
  console.log('Signature (first 50 chars):', signature.substring(0, 50) + '...');

  // Test 4: Verify round-trip
  console.log('\nTest 4: Round-trip Verification');
  const matches = JSON.stringify(paymentRequest) === JSON.stringify(parsed);
  console.log(matches ? '✓ Round-trip successful' : '✗ Round-trip failed');

  console.log('\n✅ All tests completed!');
}

customTest().catch(console.error);
```

Run the custom test:

```bash
node test-mle.js
```

---

## Function Reference

### Encryption Functions

#### `encryptPayload(payload, publicKeyPem, kid)`
Encrypts a payload using RSA-OAEP and AES-256-GCM.

**Parameters:**
- `payload` (object|string): Data to encrypt
- `publicKeyPem` (string): Public key in PEM format
- `kid` (string): Key identifier

**Returns:** Promise<string> - JWE encrypted string

**Example:**
```javascript
const encrypted = await encryptPayload(
  { data: "test" },
  ALDAR_PUBLIC_KEY,
  ALDAR_SERIAL_NUMBER
);
```

#### `simpleEncryptPayload(payload)`
Simplified encryption using Aldar configuration.

**Parameters:**
- `payload` (object|string): Data to encrypt

**Returns:** Promise<string> - JWE encrypted string

**Example:**
```javascript
const encrypted = await simpleEncryptPayload({ data: "test" });
```

### Decryption Functions

#### `decryptPayload(encryptedJwe, privateKeyPem)`
Decrypts a JWE string.

**Parameters:**
- `encryptedJwe` (string): JWE encrypted string
- `privateKeyPem` (string): Private key in PEM format

**Returns:** Promise<string> - Decrypted payload as string

**Example:**
```javascript
const decrypted = await decryptPayload(encrypted, ALDAR_PRIVATE_KEY);
const parsed = JSON.parse(decrypted);
```

#### `simpleDecryptPayload(encryptedJwe)`
Simplified decryption using Aldar configuration.

**Parameters:**
- `encryptedJwe` (string): JWE encrypted string

**Returns:** Promise<string> - Decrypted payload as string

**Example:**
```javascript
const decrypted = await simpleDecryptPayload(encrypted);
```

### Signing Functions

#### `signPayload(payload, privateKeyPem, kid)`
Signs a payload as JWT using RS256.

**Parameters:**
- `payload` (object): JWT payload
- `privateKeyPem` (string): Private key in PEM format
- `kid` (string): Key identifier

**Returns:** Promise<string> - Signed JWT string

**Example:**
```javascript
const jwt = await signPayload(
  { iat: Date.now(), data: "test" },
  ALDAR_PRIVATE_KEY,
  ALDAR_CONFIG.keyId
);
```

#### `verifyAndDecodeJWT(jwt, publicKeyPem)`
Verifies and decodes a JWT.

**Parameters:**
- `jwt` (string): JWT string to verify
- `publicKeyPem` (string): Public key in PEM format

**Returns:** Promise<object> - Decoded JWT payload

**Example:**
```javascript
const payload = await verifyAndDecodeJWT(jwt, ALDAR_PUBLIC_KEY);
```

### Utility Functions

#### `sha256Base64(data)`
Calculates SHA-256 hash and returns Base64 encoded string.

**Parameters:**
- `data` (string): Data to hash

**Returns:** string - Base64 encoded hash

**Example:**
```javascript
const hash = sha256Base64(JSON.stringify({ data: "test" }));
```

---

## Integration with CyberSource API

### Complete Request Example

```javascript
import {
  simpleEncryptPayload,
  signPayload,
  sha256Base64,
  ALDAR_CONFIG,
  ALDAR_PRIVATE_KEY
} from './mle.js';
import axios from 'axios';

async function makeCyberSourceRequest() {
  // 1. Create payment request
  const paymentRequest = {
    clientReferenceInformation: {
      code: "REF_" + Date.now()
    },
    processingInformation: {
      actionList: ["TOKEN_CREATE"],
      actionTokenTypes: ["instrumentIdentifier"]
    },
    tokenInformation: {
      instrumentIdentifier: {
        type: "enrollable card",
        card: {
          number: "4111111111111111",
          expirationMonth: "12",
          expirationYear: "2027"
        }
      }
    }
  };

  // 2. Encrypt the payload
  const encryptedJWE = await simpleEncryptPayload(paymentRequest);

  // 3. Create HTTP body
  const httpBody = { encryptedRequest: encryptedJWE };
  const httpBodyString = JSON.stringify(httpBody);

  // 4. Create JWT signature
  const digest = sha256Base64(httpBodyString);
  const jwtPayload = {
    iat: Math.floor(Date.now() / 1000),
    "v-c-merchant-id": ALDAR_CONFIG.merchantId,
    digestAlgorithm: "SHA-256",
    digest: digest
  };

  const signature = await signPayload(
    jwtPayload,
    ALDAR_PRIVATE_KEY,
    ALDAR_CONFIG.keyId
  );

  // 5. Make API request
  try {
    const response = await axios.post(
      'https://apitest.cybersource.com/pts/v2/payments',
      httpBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'v-c-merchant-id': ALDAR_CONFIG.merchantId,
          'Authorization': `Bearer ${signature}`
        }
      }
    );

    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

makeCyberSourceRequest().catch(console.error);
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module 'jose'"

**Solution:**
```bash
npm install jose
```

#### 2. "SyntaxError: Cannot use import statement outside a module"

**Solution:** Ensure your `package.json` has:
```json
{
  "type": "module"
}
```

Or rename the file to `.mjs`:
```bash
mv mle.js mle.mjs
node mle.mjs
```

#### 3. "Error: error:1C800064:Provider routines::bad decrypt"

**Cause:** Using wrong private key for decryption

**Solution:** Verify you're using the correct private key that corresponds to the public key used for encryption.

#### 4. Encryption/Decryption mismatch

**Solution:** Ensure the public and private keys are a matching pair:
```javascript
// Test key pair
const testPayload = { test: "data" };
const encrypted = await simpleEncryptPayload(testPayload);
const decrypted = await simpleDecryptPayload(encrypted);
console.log('Match:', JSON.stringify(testPayload) === decrypted);
```

---

## Security Best Practices

1. **Never commit private keys to version control**
   - Use environment variables
   - Use secure key management systems

2. **Rotate keys regularly**
   - Update `ALDAR_SERIAL_NUMBER` when rotating keys
   - Maintain key version history

3. **Validate all inputs**
   - Check payload structure before encryption
   - Validate decrypted data

4. **Use HTTPS only**
   - Never send encrypted payloads over HTTP
   - Verify SSL certificates

5. **Monitor key usage**
   - Log encryption/decryption operations
   - Alert on unusual patterns

---

## Performance Testing

### Benchmark encryption/decryption speed:

```javascript
import { simpleEncryptPayload, simpleDecryptPayload } from './mle.js';

async function benchmark() {
  const payload = { test: "data", timestamp: Date.now() };
  const iterations = 100;

  console.log(`Running ${iterations} iterations...\n`);

  // Encryption benchmark
  const encryptStart = Date.now();
  let encrypted;
  for (let i = 0; i < iterations; i++) {
    encrypted = await simpleEncryptPayload(payload);
  }
  const encryptTime = Date.now() - encryptStart;

  // Decryption benchmark
  const decryptStart = Date.now();
  for (let i = 0; i < iterations; i++) {
    await simpleDecryptPayload(encrypted);
  }
  const decryptTime = Date.now() - decryptStart;

  console.log(`Encryption: ${encryptTime}ms (${(encryptTime/iterations).toFixed(2)}ms avg)`);
  console.log(`Decryption: ${decryptTime}ms (${(decryptTime/iterations).toFixed(2)}ms avg)`);
  console.log(`Total: ${encryptTime + decryptTime}ms`);
}

benchmark().catch(console.error);
```

---

## Summary

The `mle.js` file provides a complete MLE implementation for CyberSource integration. To test:

1. **Quick test:** Run `node mle.js` to see the built-in test
2. **Interactive:** Use Node REPL to test individual functions
3. **Custom:** Create your own test script for specific scenarios
4. **Integration:** Use the provided functions in your application

All functions are well-documented and include error handling. The test function demonstrates the complete workflow from encryption to API request creation.

<!-- END GENAI -->
