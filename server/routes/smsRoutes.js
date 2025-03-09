import express from 'express';
const router = express.Router();
import { sendSMS} from '../utils/smsService.js';

// Route to verify a phone number
router.post('/verify', async (req, res) => {
    console.log("=== Phone Verification Route Started ===");
    console.log("Request Body:", req.body);

    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            console.log("Error: Phone number is required");
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Format the phone number for US (trial account requirement)
        const cleaned = phoneNumber.replace(/\D/g, '');
        const formattedNumber = cleaned.length === 10 ? '+1' + cleaned : 
                              cleaned.startsWith('1') ? '+' + cleaned :
                              cleaned.startsWith('+1') ? cleaned :
                              null;

        if (!formattedNumber) {
            console.log("Error: Invalid phone number format");
            return res.status(400).json({
                success: false,
                message: 'For trial accounts, please use a US phone number (+1)'
            });
        }

        console.log("Initiating verification for:", formattedNumber);
        
        // Verify the number with Twilio
        const verificationResult = await verifyNumber(formattedNumber);
        
        if (verificationResult.success) {
            res.json({
                success: true,
                message: 'Phone number verified successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                message: verificationResult.error
            });
        }
    } catch (error) {
        console.error("Unexpected error in verification route:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify phone number'
        });
    } finally {
        console.log("=== Phone Verification Route Ended ===");
    }
});

// Route to send SMS
router.post('/send', async (req, res) => {
    console.log("=== SMS Route Started ===");
    console.log("Incoming Request Body:", req.body);
    
    try {
        const { phoneNumber, message } = req.body;
        console.log("Phone Number:", phoneNumber);
        console.log("Message Content:", message);

        if (!phoneNumber || !message) {
            console.log("Error: Missing required fields");
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }

        console.log("Attempting to send SMS...");
        const result = await sendSMS(phoneNumber, message);
        console.log("SMS Send Result:", result);

        if (result.success) {
            console.log("SMS sent successfully with messageId:", result.messageId);
            res.json({
                success: true,
                messageId: result.messageId
            });
        } else {
            console.log("SMS sending failed with error:", result.error);
            res.status(400).json({
                success: false,
                message: result.error
            });
        }
    } catch (error) {
        console.error('Unexpected error in SMS route:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send SMS'
        });
    } finally {
        console.log("=== SMS Route Ended ===");
    }
});

export default router; 