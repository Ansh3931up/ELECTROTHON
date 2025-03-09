import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export const checkSMSPermissions = async () => {
  if (!Capacitor.isNative) {
    console.warn('SMS functionality is only available on native devices');
    return false;
  }

  try {
    // Request SMS permissions using Android's native API
    if (Capacitor.getPlatform() === 'android') {
      const granted = await window.androidSMSBridge?.requestSMSPermissions();
      return granted === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking SMS permissions:', error);
    return false;
  }
};

export const sendSMS = async (phoneNumber, message) => {
  if (!Capacitor.isNative) {
    console.warn('SMS functionality is only available on native devices');
    return false;
  }

  try {
    if (Capacitor.getPlatform() === 'android') {
      const sent = await window.androidSMSBridge?.sendSMS(phoneNumber, message);
      return sent === true;
    }
    return false;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

export const setupSMSListener = (onSMSReceived) => {
  if (!Capacitor.isNative) {
    console.warn('SMS functionality is only available on native devices');
    return;
  }

  try {
    if (Capacitor.getPlatform() === 'android') {
      window.androidSMSBridge?.setupSMSListener((message) => {
        if (message && message.startsWith('FREQ_DATA:')) {
          onSMSReceived(message);
        }
      });
    }
  } catch (error) {
    console.error('Error setting up SMS listener:', error);
  }
};

export const removeSMSListener = () => {
  if (!Capacitor.isNative) return;

  try {
    if (Capacitor.getPlatform() === 'android') {
      window.androidSMSBridge?.removeSMSListener();
    }
  } catch (error) {
    console.error('Error removing SMS listener:', error);
  }
}; 