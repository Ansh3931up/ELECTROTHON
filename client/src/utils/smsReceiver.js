import { Capacitor } from '@capacitor/core';
import { decryptData } from './offlineMode';

class SMSReceiver {
    constructor() {
        this.listeners = new Set();
        this.isListening = false;
    }

    // Start listening for SMS
    async startListening() {
        if (!Capacitor.isNative) {
            console.warn('SMS reception is only available on native devices');
            return false;
        }

        if (this.isListening) {
            return true;
        }

        try {
            // Request SMS read permission if needed
            const permissionStatus = await this.requestSMSPermission();
            if (!permissionStatus) {
                throw new Error('SMS permission denied');
            }

            // Set up SMS content observer
            window.cordova?.exec(
                (message) => this.handleIncomingSMS(message),
                (error) => console.error('SMS Reception Error:', error),
                'SMSReceiver',
                'startReception',
                []
            );

            this.isListening = true;
            return true;
        } catch (error) {
            console.error('Error starting SMS reception:', error);
            return false;
        }
    }

    // Stop listening for SMS
    stopListening() {
        if (!this.isListening) return;

        window.cordova?.exec(
            () => {
                this.isListening = false;
                console.log('SMS reception stopped');
            },
            (error) => console.error('Error stopping SMS reception:', error),
            'SMSReceiver',
            'stopReception',
            []
        );
    }

    // Handle incoming SMS
    handleIncomingSMS(message) {
        if (message && message.body && message.body.startsWith('FREQ_DATA:')) {
            try {
                const encryptedData = message.body.split('FREQ_DATA:')[1];
                const frequency = decryptData(encryptedData);
                
                // Notify all listeners
                this.listeners.forEach(listener => {
                    listener({
                        success: true,
                        frequency: Number(frequency),
                        timestamp: Date.now()
                    });
                });
            } catch (error) {
                console.error('Error processing frequency SMS:', error);
                this.listeners.forEach(listener => {
                    listener({
                        success: false,
                        error: 'Failed to process frequency data'
                    });
                });
            }
        }
    }

    // Add a listener for incoming frequency data
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Request SMS permission
    async requestSMSPermission() {
        if (!Capacitor.isNative) return false;

        try {
            const result = await window.cordova?.exec(
                null,
                null,
                'SMSReceiver',
                'requestPermission',
                []
            );
            return result === true;
        } catch (error) {
            console.error('Error requesting SMS permission:', error);
            return false;
        }
    }
}

export const smsReceiver = new SMSReceiver(); 