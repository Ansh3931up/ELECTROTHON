import axios from 'axios';

const MSG91_API_KEY = process.env.MSG91_API_KEY || "443352AYV7wsDOm9F67ccd267P1";
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || "Ansh3931";
const MSG91_TEMPLATE_ID = "67ccd4b5d6fc0515ca634833_v1.1"; // Using v1.1 of the template
const MSG91_BASE_URL = "https://api.msg91.com/api/v5";

console.log("=== MSG91 Configuration ===");
console.log("API Key:", MSG91_API_KEY ? "Set" : "Missing");
console.log("Sender ID:", MSG91_SENDER_ID);
console.log("Template ID:", MSG91_TEMPLATE_ID);
console.log("========================");

// Function to format phone number for MSG91
const formatPhoneNumber = (phoneNumber) => {
    // Remove any non-digit characters except '+'
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If number starts with '+', remove it
    if (cleaned.startsWith('+')) {
        return cleaned.substring(1);
    }
    
    // If number starts with '0', remove it
    if (cleaned.startsWith('0')) {
        return cleaned.substring(1);
    }

    // Add 91 prefix if not present for Indian numbers
    if (!cleaned.startsWith('91')) {
        return '91' + cleaned;
    }
    
    return cleaned;
};

const sendSMS = async (to, message) => {
    console.log("=== SMS Service: Sending SMS ===");
    console.log("Original Phone Number:", to);
    
    try {
        // Format the phone number
        const formattedNumber = formatPhoneNumber(to);
        console.log("Formatted Phone Number:", formattedNumber);
        console.log("Message Length:", message.length);
        console.log("Message Preview:", message.substring(0, 50) + (message.length > 50 ? "..." : ""));

        // Extract frequency data from the message
        const frequencyData = message.split('FREQ_DATA:')[1];

        // Prepare request data
        const requestData = {
            "flow_id": MSG91_TEMPLATE_ID,
            "sender": MSG91_SENDER_ID,
            "mobiles": formattedNumber,
            "frequency": frequencyData
        };

        console.log("Creating MSG91 request...");
        console.log("Request Data:", JSON.stringify(requestData, null, 2));

        const response = await axios({
            method: 'POST',
            url: `${MSG91_BASE_URL}/flow/`,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authkey': MSG91_API_KEY
            },
            data: requestData
        });
        
        console.log("MSG91 Full Response:", JSON.stringify(response.data, null, 2));

        // Check for specific error cases
        if (response.data.type === 'error') {
            throw new Error(`MSG91 Error: ${response.data.message}`);
        }

        if (response.data.type === 'success') {
            console.log("SMS sent successfully!");
            return { 
                success: true, 
                messageId: response.data.request_id || response.data.message
            };
        } else {
            const errorMsg = response.data.message || 'Unknown error occurred';
            console.log("SMS failed with MSG91 error:", errorMsg);
            return { 
                success: false, 
                error: errorMsg
            };
        }
    } catch (error) {
        console.error("SMS Service Detailed Error:", {
            name: error.name,
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data ? JSON.stringify(error.response.data, null, 2) : undefined,
            config: {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers,
                data: error.config?.data
            }
        });

        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
        }

        // Check for common MSG91 errors
        if (errorMessage.includes('template')) {
            errorMessage = 'Template not approved yet. Please wait for MSG91 approval or check template ID.';
        } else if (errorMessage.includes('DLT')) {
            errorMessage = 'DLT registration required. Please complete DLT registration first.';
        } else if (error.response?.status === 401) {
            errorMessage = 'Invalid authentication. Please check your MSG91 API key.';
        } else if (error.response?.status === 403) {
            errorMessage = 'IP not whitelisted. Please add your IP address in MSG91 dashboard.';
        }

        return { 
            success: false, 
            error: errorMessage
        };
    } finally {
        console.log("=== SMS Service: Operation Complete ===");
    }
};

export { sendSMS }; 