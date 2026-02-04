# START GENAI
#!/bin/bash

echo "🚀 Setting up Visa Payment Passkey (VPP) Merchant Demo..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 16+."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update with your VDC credentials if available."
fi

echo "📦 Installing dependencies..."

# Try to install dependencies with different methods
if npm install; then
    echo "✅ Dependencies installed successfully with npm"
elif yarn install; then
    echo "✅ Dependencies installed successfully with yarn"
else
    echo "⚠️  Package installation failed due to network/proxy issues"
    echo "   You can try:"
    echo "   1. Configure npm proxy settings if behind corporate firewall"
    echo "   2. Use yarn instead of npm"
    echo "   3. Install dependencies manually"
    echo ""
    echo "   The application may still work with Node.js built-in modules for basic functionality"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start the application:"
echo "  npm start    (or node server.js)"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3000"
echo ""
echo "Test with card number: 4111 1111 1111 1111"
echo ""
echo "📚 For more information, see README.md"

# END GENAI
