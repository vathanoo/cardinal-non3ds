// START GENAI
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const AuthService = require('../services/AuthService');

const authService = new AuthService();

/**
 * POST /api/auth/login
 * Simple authentication endpoint for demo purposes
 */
router.post('/login', async (req, res) => {
    try {
        const { email, cardNumber } = req.body;

        // Validate input
        if (!email || !cardNumber) {
            return res.status(400).json({
                success: false,
                error: 'Email and card number are required'
            });
        }

        // In a real implementation, validate credentials against your user database
        // For demo purposes, we'll create a session token
        const sessionId = uuidv4();
        const userId = uuidv4();

        // Create JWT token for session management
        const token = jwt.sign(
            {
                userId,
                sessionId,
                email,
                cardNumber: cardNumber.replace(/\d(?=\d{4})/g, '*'), // Mask card number
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (parseInt(process.env.SESSION_TIMEOUT) || 900)
            },
            process.env.JWT_SECRET || 'demo-secret'
        );

        res.json({
            success: true,
            token,
            user: {
                userId,
                email,
                maskedCardNumber: cardNumber.replace(/\d(?=\d{4})/g, '*')
            },
            message: 'Authentication successful'
        });

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            details: error.message
        });
    }
});

/**
 * POST /api/auth/validate-token
 * Validate JWT token
 */
router.post('/validate-token', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');

        res.json({
            success: true,
            valid: true,
            user: {
                userId: decoded.userId,
                email: decoded.email,
                maskedCardNumber: decoded.cardNumber
            }
        });

    } catch (error) {
        console.error('Token validation error:', error);
        res.status(401).json({
            success: false,
            valid: false,
            error: 'Invalid or expired token'
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', (req, res) => {
    try {
        // In a real implementation, you would invalidate the session in your database
        // For demo purposes, we'll just return success
        
        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            details: error.message
        });
    }
});

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No valid authorization header found'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
        
        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

/**
 * GET /api/auth/profile
 * Get user profile (protected route)
 */
router.get('/profile', verifyToken, (req, res) => {
    try {
        res.json({
            success: true,
            user: {
                userId: req.user.userId,
                email: req.user.email,
                maskedCardNumber: req.user.cardNumber,
                sessionId: req.user.sessionId
            }
        });

    } catch (error) {
        console.error('Profile retrieval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve profile'
        });
    }
});

module.exports = router;

// END GENAI
