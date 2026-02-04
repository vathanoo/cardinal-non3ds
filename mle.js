// START GENAI
import * as jose from "jose";
import * as crypto from "crypto";
 
// ==================== ALDAR CONFIGURATION ====================
 
/** from the p12
* Aldar Properties Public Key for MLE encryption
*/
export const ALDAR_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqkq4//dOuBmdO8siWC+m
3zh03C3q1EEHpSwYAlp+pf4xSPYuPKZJc9MUWuoveYKfI8nS8vaY+v9otwdnCzXX
r7AjEil/D3xZaExIiUq0KLWKAjZ22M0wZL72/7kxnkPxLMDbrjoIixJN+IoDODTj
Hccgz2chEgBCf1hriLv7tr20EZI6HFrCxZr36SS+eCR73Vj0+DVRBWj0QqRB5bfF
LwnhB4fHs2bK00CV+hhHkA0vAvHl7GHMdgo8HSuvmMbnC69zEHYmDW2kecenFaA/
kl++B9CTqdnmfhQumigcDkRuSGg0ximL1CkdB+LrhY74lta4yP6OKnCSvPY9zijD
rwIDAQAB
-----END PUBLIC KEY-----`;
 
 
//New Key
// export const ALDAR_PUBLIC_KEY = `-----BEGIN CERTIFICATE-----
// MIICajCCAdOgAwIBAgIWMTc2NTcxOTI0OTM0MTAzMjQ3MjY3MDANBgkqhkiG9w0B
// AQsFADAeMRwwGgYDVQQDDBNDeWJlclNvdXJjZUNlcnRBdXRoMB4XDTI1MTIxNDEz
// MzQwOVoXDTI4MTIxNDEzMzQwOVowPzEcMBoGA1UEAwwTYWxkYXJfcHJvcGVydGll
// czAwMTEfMB0GA1UEBRMWMTc2NTcxOTI0OTM0MTAzMjQ3MjY3MDCCASIwDQYJKoZI
// hvcNAQEBBQADggEPADCCAQoCggEBAOOiJG/lyK0Wt+fw3hCtUf0GLE5xN9GfCpLy
// QEaVdMFkAHeNzQ6XuBhuuBixwHJr4DtApJBz+70B29xQ48HlXAzSu964Fr3OQYT1
// mNyJviImta0IoJ3MePO5ZTgP64N6Fcj2WCqgNJJqCHiwEXd+j0+DYZmCDI/zmLXO
// 3WYyFDBvcpLDrZZNyGLdU6Lv2Nc+oLhG3DM8I3h67q1vfZ5pDd6r/LSysC35+44F
// qBLUMA4ni1LlQiL/PbNThXqvS8o2xkphVKS+qrFKytUQZ580hbF10ymqp8dL0Ph2
// MdjqO1xkszUivc5rqvkGhJC7jejggcVrtWwi9ZZLTIcnIY2338ECAwEAATANBgkq
// hkiG9w0BAQsFAAOBgQAB1FSYhHbj1IazwmE5bQ7x77mBD2U4WmCwycyQwEppOe56
// msJc/Q+W401bih8xNzb9euTHcbFoH+EOBnhOIOGsUsGB6PKad4jXh2Ycnl3ezcUz
// j1DG/3TMKftqJvGdm5MTsKiByNtjPTwvzdfDFlratVtsFIAz2gs2OMH9s6P/rg==
// -----END CERTIFICATE-----`;
 
/**
* Aldar Properties Private Key for MLE decryption and JWT signing
*/
// export const ALDAR_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
// MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCqSrj/9064GZ07
// yyJYL6bfOHTcLerUQQelLBgCWn6l/jFI9i48pklz0xRa6i95gp8jydLy9pj6/2i3
// B2cLNdevsCMSKX8PfFloTEiJSrQotYoCNnbYzTBkvvb/uTGeQ/EswNuuOgiLEk34
// igM4NOMdxyDPZyESAEJ/WGuIu/u2vbQRkjocWsLFmvfpJL54JHvdWPT4NVEFaPRC
// pEHlt8UvCeEHh8ezZsrTQJX6GEeQDS8C8eXsYcx2CjwdK6+YxucLr3MQdiYNbaR5
// x6cVoD+SX74H0JOp2eZ+FC6aKBwORG5IaDTGKYvUKR0H4uuFjviW1rjI/o4qcJK8
// 9j3OKMOvAgMBAAECggEAAQdqjsFjzGD7Pj0/++Bt1bN1oU71uEqcTTcy/fCmC0K5
// 8YLrTJqEnxqLaPE5UDal14WErMsoqXuZmmGFEeBFaV5bF+UAS4uozqSHW60D4asX
// JmRF25GB1VoCDBGGZzpp3qdbrHXVT2HQ7suGsXRAWxG09Qvee0ldHX/fRng8USJZ
// wWXOUOqeYuYpR9sOMu2M9AiMKKPru4VLwBlXfJZ0nuz8FpHkchb8DKn5kqKWV99u
// N+rmXO5/tHdSP2cqNKH3NInrYemkOmhZ3ouAPqE79QAj5AD/hHZyPnHbqT7NnqDP
// lHw8EhfspbAj2ZhHmdSnz0fRO9vxP0czZBp/bUNmwQKBgQD2UBNIxJ3GoII3wwY7
// S1vUQ8qn9dJbYxkdXYjvSBURmglez+W6Jv9q2u9ujo0ClaNrEf5mhJFRFUXlZogp
// 879Aur2qk7pKGc6KkwnNvveRhaGEcaVJpQIvbzUOHr18oMpVqbYcc1kRu9FAMCzX
// nggW4F76I1FDaU6K70Dgq/i5GQKBgQCw/UERMu6RJL4hG472QaHxkNP+qmp537Uo
// vZziLTAkd4UGYk/xHZSJkijrjQ6ECMgXHDAVfoeql7MRuE+8FBxw+uJRpXISORCz
// LkKCoLFZ24yEe7xoGtiNG7wmO8NGlUeJj0zjGe28SPcxDe4xkgcdOpZxR9NdW/6w
// VYm1NQvUBwKBgQC2+Q0aRVSfNKUHH00FxxlUOXfWBXpagOcrNUx/1CAyjybe07ln
// 64hZrIGosyR1Awv+gcNmDJyWiyL9IomMAJHWV+KFUHBWk40my8vAl1f5Njeh13pd
// lsJk0kurTZKdfiRQNl4eDGHiFo9/C0qEcdS4ibyEPLAlT5kVBF5Bh/6gIQKBgAGz
// jYqSyMRQbBt5XlhzrRDbaY5LKRbe1aj8maN697mCBJ9ZFpekxybDZu1Mv9T5GKNQ
// PA4Y10kGiEwlT27papSTdNWAF6ahMc3nJfCHhuzsNV+YqOj/SRGiMJ7VeD0XdkaW
// QBD20Ng8g1PPZHjJhJP9WjDgleGR3tLnH5nEVsbFAoGAM5c1AAOfQgL1dgmcdrkG
// RW1kRmTBvJCstaqxMAvaBCltVIZYKokNE2D+W1i7iOrveOl0lkWIHRonlgG1N9q3
// ZmVNr/jVkoGUWMfdV7cfMUp2VXbm6a5aUWjpukNncNvAKIg6jVa3RXhrC7K7jyy5
// I1CXXgW/5T2HlowPYTO+k9o=
// -----END PRIVATE KEY-----`;
 
//New Key
// export const ALDAR_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
// MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDjoiRv5citFrfn
// 8N4QrVH9BixOcTfRnwqS8kBGlXTBZAB3jc0Ol7gYbrgYscBya+A7QKSQc/u9Advc
// UOPB5VwM0rveuBa9zkGE9Zjcib4iJrWtCKCdzHjzuWU4D+uDehXI9lgqoDSSagh4
// sBF3fo9Pg2GZggyP85i1zt1mMhQwb3KSw62WTchi3VOi79jXPqC4RtwzPCN4eu6t
// b32eaQ3eq/y0srAt+fuOBagS1DAOJ4tS5UIi/z2zU4V6r0vKNsZKYVSkvqqxSsrV
// EGefNIWxddMpqqfHS9D4djHY6jtcZLM1Ir3Oa6r5BoSQu43o4IHFa7VsIvWWS0yH
// JyGNt9/BAgMBAAECggEAU/0+fn8FNUA9qPnJpdOdfcNqU6MYmmKZLzDtIF4Cz1xL
// g9ExSOIYDgPEL3BedplxCcvHLHlu+AUYj0jVUHSFK0ISCZJY6b2RlTJdLXoxSj6I
// KAkX4kFQm3TbcP0Gw+Mm6JhkXY3w99jhuU4Vk8aBsC/kshQ2+GJEBUkHja6Knne+
// ZKjSxymiHXNTWmQAJRG77cdGqkt1YMpWpmbQbz6bqNTNONCh1i2ZQome154Y4Ogu
// FdVOMTiPWk1eKXB1qoj0tqUlObSQpcWO+z7ICixPg4gNQGK1o8XTDVK33exWuT4l
// 6CHvmi2OcR2FMIDlSNTM1wyMmESPe0utsfxN0Ipw5QKBgQDy8TrdChdjXOf8KgGA
// YBjYSDHDwGA1r2FIyBKuitBFLcGBXcvNMWIyatG+E5fSii4utp8aFWUH6NammFAQ
// gj9IUg9Lm+OpSZ125SSSRb+ZsNdf8EvGCj3gyBmjEveNQnPg3FEtFkpBAljqvOUh
// m36YmIkATrV7Mi2bpGgF+LIfYwKBgQDv3kTM3RdqJXs0HYq1EVBv8p2jwTCQOiY4
// c71k6/21i6KFyDmNYjYTQ9feQPLonaLLGuCz4NrAfYuyp5DyOLRedQ5QECxXH3kF
// X9u05rvzw6S4REk7QW1b8KcItJrFVVAfZ8z2fTv9qfH6W5+QevfrRetW6lLKlnnO
// mI3WuiBniwKBgHrM0us+GZphMOY2uXGRoZ1ZyMXg7QDV+L/YWhEeG66MNV7V8Zlz
// 1+YSNpj0wG5s6HE2YG/H1rzLxgyJuxbNL3239QFL+CTvEAg0RWsmlHX0fLmC9lpR
// fPutScAzayxdJcPIucOnm7sGm7lz6AI33iL2H3InVvbB42nkDazPDAJvAoGAbHri
// NKBcwYWX9ZbSr1bYQPjBcFijpOaXeHpnkifkQuGWq9hEpvtep1HMY9iNwsPf5ukN
// 7GvpoppkvnRn6hPZBsr7oRvfYbt7GQIkM+kR4Yl+ilNfpyvM0ILCl/5N7KbLqJhi
// KquyoOLl66raPBZQ3xds+o7YyIRLLDL0GsNsekcCgYAw4zaNkCwMpcATEXpR/k9O
// 3xxYqO7hVufMQtVRgKmsOxo6NdPoPzv+c46R/76eXGftAPz/fkziyfKMbmKCOzTv
// oPnvHCAdCAjfe8BIbAUDNeT0vdxWZW7EatuAcSumRBOOAg5SDQsM3aYV1L+sR083
// BiezeABdeBSGZ5EV2vud3Q==
// -----END PRIVATE KEY-----`;
 
/**
* Aldar Properties Serial Number for key identification
*/
export const ALDAR_SERIAL_NUMBER = "1765355878733022471073"; //KID
 
/**
* Aldar Properties CyberSource API Configuration
*/
export const ALDAR_CONFIG = {
  merchantId: "aldar_properties001",
  keyId: "40a3cada-31e6-49f7-a8de-896256631d33",
  sharedSecret: "+/qA7Sbzj+vLFpkCFZIRr4t3ZMxQNUPiRu2DGHg27ac=",
};
 
// ==================== MLE FUNCTIONS ====================
 
/**
* Encrypt JSON payload to JWE using public key
* @param {object|string} payload - The payload to encrypt
* @param {string} publicKeyPem - The public key in PEM format
* @param {string} [kid] - Key identifier
* @returns {Promise<string>} Encrypted JWE string
*/
export async function encryptPayload(payload, publicKeyPem, kid) {
  const jsonPayload =
    typeof payload === "string" ? payload : JSON.stringify(payload);
  const publicKey = crypto.createPublicKey(publicKeyPem);
 
  const jwe = await new jose.CompactEncrypt(
    new TextEncoder().encode(jsonPayload)
  )
    .setProtectedHeader({
      alg: "RSA-OAEP",
      "v-c-merchant-id": "aldar_properties001",
      enc: "A256GCM",
      // cty: "JWT",
      cty: "application/json",
      kid: kid,
      iat: Math.floor(Date.now() / 1000),
    })
    .encrypt(publicKey);
 
  return jwe;
}
 
/**
* Decrypt JWE using private key
* @param {string} encryptedJwe - The encrypted JWE string
* @param {string} privateKeyPem - The private key in PEM format
* @returns {Promise<string>} Decrypted payload as string
*/
export async function decryptPayload(encryptedJwe, privateKeyPem) {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
 
  const { plaintext } = await jose.compactDecrypt(encryptedJwe, privateKey);
 
  return new TextDecoder().decode(plaintext);
}
 
/**
* Simple encrypt payload using Aldar configuration
* @param {object|string} payload - The payload to encrypt
* @returns {Promise<string>} Encrypted JWE string
*/
export async function simpleEncryptPayload(payload) {
  return encryptPayload(payload, ALDAR_PUBLIC_KEY, ALDAR_SERIAL_NUMBER);
}
 
/**
* Simple decrypt payload using Aldar configuration
* @param {string} encryptedJwe - The encrypted JWE string
* @returns {Promise<string>} Decrypted payload as string
*/
export async function simpleDecryptPayload(encryptedJwe) {
  return decryptPayload(encryptedJwe, ALDAR_PRIVATE_KEY);
}
 
/**
* Calculate SHA-256 hash and return Base64 encoded
* @param {string} data - Data to hash
* @returns {string} Base64 encoded hash
*/
export function sha256Base64(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data, "utf8");
  return hash.digest("base64");
}
 
/**
* Sign payload as JWS using private key
* @param {object} payload - JWT payload object
* @param {string} privateKeyPem - The private key in PEM format
* @param {string} kid - Key identifier
* @returns {Promise<string>} Signed JWT string
*/
export async function signPayload(payload, privateKeyPem, kid) {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
 
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
      kid: kid,
    })
    .sign(privateKey);
 
  return jwt;
}
 
/**
* Verify and decode JWS using public key
* @param {string} jwt - JWT string to verify
* @param {string} publicKeyPem - The public key in PEM format
* @returns {Promise<object>} Decoded JWT payload
*/
export async function verifyAndDecodeJWT(jwt, publicKeyPem) {
  const publicKey = crypto.createPublicKey(publicKeyPem);
 
  const { payload } = await jose.jwtVerify(jwt, publicKey);
  return payload;
}
 
// ==================== TEST EXAMPLE ====================
 
async function testMLEEncryptionDecryption() {
  console.log("=".repeat(60));
  console.log("MLE Encryption/Decryption Test - Aldar Properties");
  console.log("=".repeat(60));
 
  console.log("\n1. Original Payment Request:");
  const originalPayload = {
    processingInformation: {
      actionList: ["TOKEN_CREATE"],
      actionTokenTypes: ["instrumentIdentifier"],
    },
    tokenInformation: {
      instrumentIdentifier: {
        type: "enrollable card",
        card: {
          number: "xxxxxxxxxxxxxxx",
          expirationMonth: "12",
          expirationYear: "2027",
        },
      },
    },
  };
  console.log(JSON.stringify(originalPayload, null, 2));
 
  // STEP 1: Encrypt the payload
  console.log("\n2. Encrypting payload with Aldar public key...");
  const encryptedJWE = await encryptPayload(
    originalPayload,
    ALDAR_PUBLIC_KEY,
    ALDAR_SERIAL_NUMBER
  );
  console.log("Encrypted JWE (truncated):");
  console.log(encryptedJWE);
 
  // STEP 2: Create HTTP body with encrypted request
  const httpBody = {
    encryptedRequest: encryptedJWE,
  };
  const httpBodyString = JSON.stringify(httpBody);
  console.log("\n3. HTTP Body with encrypted request:");
  console.log(httpBodyString.substring(0, 150) + "...");
 
  // STEP 3: Create JWT payload for signature
  const digest = sha256Base64(httpBodyString);
  const jwtPayload = {
    iat: Math.floor(Date.now() / 1000),
    "v-c-merchant-id": ALDAR_CONFIG.merchantId,
    digestAlgorithm: "SHA-256",
    digest: digest,
  };
  console.log("\n4. JWT Payload for signing:");
  console.log(JSON.stringify(jwtPayload, null, 2));
 
  // STEP 4: Sign the JWT
  console.log("\n5. Signing JWT with REST credentials...");
  const signedJWT = await signPayload(
    jwtPayload,
    ALDAR_PRIVATE_KEY,
    ALDAR_CONFIG.keyId
  );
  console.log("Signed JWT (truncated):");
  console.log(signedJWT);
 
  // STEP 5: Decrypt the payload (simulating response decryption)
  console.log("\n6. Decrypting payload with Aldar private key...");
  const decryptedPayload = await decryptPayload(
    encryptedJWE,
    ALDAR_PRIVATE_KEY
  );
  const parsedPayload = JSON.parse(decryptedPayload);
  console.log("Decrypted payload:");
  console.log(JSON.stringify(parsedPayload, null, 2));
 
  // STEP 6: Verify decryption matches original
  console.log("\n7. Verification:");
  const matches =
    JSON.stringify(originalPayload) === JSON.stringify(parsedPayload);
  console.log(
    `Decrypted payload matches original: ${matches ? "✓ SUCCESS" : "✗ FAILED"}`
  );
 
  // STEP 7: Show complete request structure
  console.log("\n8. Complete API Request Structure:");
  console.log("─".repeat(60));
  console.log("POST https://apitest.cybersource.com/pts/v2/payments");
  console.log("Headers:");
  console.log(`  Content-Type: application/json`);
  console.log(`  v-c-merchant-id: ${ALDAR_CONFIG.merchantId}`);
  console.log(`  Authorization: Bearer ${signedJWT.substring(0, 50)}...`);
  console.log("\nBody:");
  console.log(`  ${httpBodyString.substring(0, 100)}...`);
  console.log("─".repeat(60));
 
  console.log("\n" + "=".repeat(60));
  console.log("Test completed successfully!");
  console.log("=".repeat(60));
}
 
// Run the test
testMLEEncryptionDecryption().catch(console.error);
 
export { testMLEEncryptionDecryption };
 
// END GENAI
