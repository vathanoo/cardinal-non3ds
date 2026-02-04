<!-- START GENAI -->
# VPP Merchant Implementation - Sequence Diagrams

## 1. Passkey Registration Flow

```mermaid
sequenceDiagram
    participant User as User/Browser
    participant Merchant as Merchant App
    participant Server as Merchant Server
    participant VPP as VPP Service
    participant FIDO as FIDO2 Authenticator

    User->>Merchant: Enter email & card number
    Merchant->>Server: POST /api/auth/login
    Server->>Server: Validate credentials
    Server->>Merchant: JWT token + user session
    Merchant->>Merchant: Store session in localStorage
    
    User->>Merchant: Click "Register Passkey"
    Merchant->>Server: POST /api/vpp/initialize
    Server->>VPP: Create initialization command
    VPP->>Merchant: Return server_state & init URL
    
    Merchant->>VPP: Open VPP authorization URL
    User->>VPP: Authenticate with 3DS challenge
    VPP->>Merchant: Return server_state token
    
    Merchant->>Server: POST /api/vpp/pushed-authorization-request
    Note over Server: Flow Type: 'registration'<br/>Prompt: 'create'
    Server->>Server: Generate PKCE parameters
    Server->>Server: Create authorization details<br/>(credential binding)
    Server->>VPP: POST /vpp/v1/passkeys/oauth2/<br/>authorization/request/pushed
    VPP->>VPP: Validate request & generate JWT
    VPP->>Merchant: Return authorization endpoint & JWT
    
    Merchant->>User: Display VPP iframe/popup
    User->>FIDO: Initiate FIDO2 registration
    FIDO->>FIDO: Create public/private key pair
    FIDO->>FIDO: Store credentials on device
    FIDO->>User: Prompt for biometric/PIN
    User->>FIDO: Provide biometric/PIN
    FIDO->>VPP: Send attestation response
    
    VPP->>VPP: Validate attestation
    VPP->>VPP: Bind credential to account
    VPP->>Merchant: Confirm binding success
    
    Merchant->>User: Display confirmation
    Note over User: Passkey successfully registered!
```

## 2. Payment Authentication Flow

```mermaid
sequenceDiagram
    participant User as User/Browser
    participant Merchant as Merchant App
    participant Server as Merchant Server
    participant VPP as VPP Service
    participant FIDO as FIDO2 Authenticator

    User->>Merchant: Enter email & card number
    Merchant->>Server: POST /api/auth/login
    Server->>Merchant: JWT token + user session
    Merchant->>Merchant: Store session in localStorage
    
    User->>Merchant: Click "Make Payment"
    Merchant->>Merchant: Display payment form
    User->>Merchant: Enter amount, currency, merchant name
    User->>Merchant: Click "Authenticate Payment"
    
    Merchant->>Server: POST /api/vpp/initialize
    Server->>VPP: Create initialization command
    VPP->>Merchant: Return server_state & init URL
    
    Merchant->>VPP: Open VPP authorization URL
    User->>VPP: Authenticate with existing credential
    VPP->>Merchant: Return server_state token
    
    Merchant->>Server: POST /api/vpp/pushed-authorization-request
    Note over Server: Flow Type: 'authentication'<br/>Prompt: 'login'<br/>Include payment amount & currency
    Server->>Server: Generate PKCE parameters
    Server->>Server: Create authorization details<br/>(payment transaction)
    Server->>VPP: POST /vpp/v1/passkeys/oauth2/<br/>authorization/request/pushed
    
    alt Passkey Exists
        VPP->>Merchant: Return authorization endpoint & JWT
        Merchant->>User: Display VPP iframe for authentication
        User->>FIDO: Initiate FIDO2 authentication
        FIDO->>User: Prompt for biometric/PIN
        User->>FIDO: Provide biometric/PIN
        FIDO->>VPP: Send assertion response
        VPP->>VPP: Validate assertion & signature
        VPP->>VPP: Approve payment
        VPP->>Merchant: Return authorization code
        Merchant->>User: Display success
        Note over User: Payment authenticated successfully!
    else No Passkey Found
        VPP->>Merchant: Return error: notfound_amr_values
        Merchant->>User: Display fallback option
        Note over User: No passkey registered.<br/>Must complete 3DS first.
    end
```

## 3. Complete VPP Session Lifecycle

```mermaid
sequenceDiagram
    participant User as User
    participant Client as Client (Browser)
    participant Auth as Auth Service
    participant VPP as VPP Service
    participant VDC as Visa VDC API

    User->>Client: 1. Login with credentials
    Client->>Auth: POST /api/auth/login
    Auth->>Auth: Validate email & card
    Auth->>Client: Return JWT token
    Client->>Client: Store token + session
    
    User->>Client: 2. Select flow (register/pay)
    Client->>VPP: POST /api/vpp/initialize
    VPP->>VPP: Generate correlation ID
    VPP->>VPP: Create init command
    VPP->>Client: Return server_state & URL
    Client->>VPP: 3. Open VPP initialization URL
    
    VPP->>VPP: Device profiling
    VPP->>VPP: FIDO eligibility check
    VPP->>Client: Provide server_state token
    
    Client->>VPP: 4. Create PAR request
    VPP->>VPP: Generate PKCE challenge
    VPP->>VPP: Build authorization details
    VPP->>VDC: POST /vpp/v1/passkeys/oauth2/authorization/request/pushed
    VDC->>VDC: Validate request & client assertion
    VDC->>VPP: Return request_uri & expires_in
    VPP->>Client: Return authorization endpoint
    
    Client->>Client: 5. Display VPP iframe/popup
    User->>Client: 6. Authenticate with FIDO2
    Client->>VDC: Send FIDO2 attestation/assertion
    VDC->>VDC: Validate credentials
    VDC->>Client: Return authorization code
    
    Client->>VPP: 7. Exchange code for token
    VPP->>VPP: Verify code & code_verifier (PKCE)
    VPP->>VDC: Exchange code for access token
    VDC->>VPP: Return access token
    
    VPP->>VPP: 8. Complete flow
    VPP->>Client: Transaction/binding complete
    Client->>User: 9. Display confirmation
```

## 4. Error Handling Flow - No Passkey Scenario

```mermaid
sequenceDiagram
    participant User as User
    participant Client as Client
    participant Server as Server
    participant VPP as VPP API

    User->>Client: Attempt payment authentication
    Client->>Server: POST /api/vpp/initialize
    Server->>VPP: Create session
    VPP->>Client: Return server_state
    
    Client->>Server: POST /api/vpp/pushed-authorization-request
    Note over Server: Flow: 'authentication'
    Server->>VPP: Request PAR with login prompt
    
    VPP->>VPP: Check for registered passkey
    
    alt No Passkey Registered
        VPP->>Server: Error: notfound_amr_values
        Server->>Server: Identify as registration-required error
        Server->>Client: Return 400 with error details
        Note over Client: requiresFallback: true<br/>fallbackFlow: '3DS'
        Client->>User: Display message:<br/>"No passkey registered.<br/>Complete 3DS first."
        User->>Client: Click "Register Passkey"
        Client->>Server: POST /api/vpp/initialize<br/>(new registration flow)
    end
```

## 5. Data Flow - Authorization Details Structure

```mermaid
graph TD
    A["User Initiates Flow"] -->|registration| B["Create Credential Binding Details"]
    A -->|payment| C["Create Payment Transaction Details"]
    
    B --> D["Authorization Details<br/>Type: credential_binding"]
    D --> E["Payer Info<br/>Account: PAN"]
    D --> F["Payee Info<br/>Name & Origin"]
    D --> G["Details<br/>Label & Amount"]
    D --> H["Preferences<br/>Email Notification"]
    D --> I["Confinements<br/>Origin & Device"]
    D --> J["Trust Chain<br/>Anchor & Surrogate Auth"]
    
    C --> K["Authorization Details<br/>Type: payment_transaction"]
    K --> L["Payer Info<br/>Account: PAN"]
    K --> M["Payee Info<br/>Name & Origin"]
    K --> N["Details<br/>Amount & Currency"]
    K --> O["Confinements<br/>Origin & Device"]
    
    J --> P["Anchor Authentication<br/>CRD/3DS Protocol"]
    J --> Q["Surrogate Authentication<br/>FIDO2/pop#fido2"]
```

## 6. JWT Token Lifecycle

```mermaid
sequenceDiagram
    participant Client as Client
    participant Auth as Auth Service
    participant Server as Server

    Client->>Auth: POST /api/auth/login
    Auth->>Auth: Create JWT payload
    Note over Auth: iss: server<br/>sub: userId<br/>iat: now<br/>exp: now + 900s
    Auth->>Auth: Sign with HS256 + secret
    Auth->>Client: Return JWT token
    Client->>Client: Store in localStorage
    
    loop During Session
        Client->>Client: Include in Authorization header
        Client->>Server: GET /api/auth/profile
        Note over Client,Server: Header: Authorization: Bearer JWT
        Server->>Server: Extract token from header
        Server->>Server: Verify signature & expiration
        Server->>Server: Decode payload
        alt Token Valid
            Server->>Client: Return user profile
        else Token Expired/Invalid
            Server->>Client: Error: 401 Unauthorized
            Client->>Client: Clear localStorage
        end
    end
```

<!-- END GENAI -->
