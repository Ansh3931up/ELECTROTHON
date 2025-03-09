import CryptoJS from 'crypto-js';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import axios from 'axios';

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || 'your-default-secret-key';
const API_URL = import.meta.env.VITE_API_URL || 'https://electrothon.onrender.com';

export const getOfflineMode = () => {
  return localStorage.getItem('appMode') === 'offline';
};

export const setOfflineMode = (isOffline) => {
  localStorage.setItem('appMode', isOffline ? 'offline' : 'online');
};

export const encryptData = (data) => {
  return CryptoJS.AES.encrypt(data.toString(), SECRET_KEY).toString();
};

export const decryptData = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const sendFrequencySMS = async (frequency, phoneNumber) => {
  try {
    const encryptedFreq = encryptData(frequency);
    const smsContent = `FREQ_DATA:${encryptedFreq}`;
    
    const response = await axios.post(`${API_URL}/api/sms/send`, {
      phoneNumber,
      message: smsContent
    });
    
    if (response.data.success) {
      // Store the sent frequency for later sync
      storeOfflineFrequency(frequency);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

export const storeOfflineFrequency = (frequency) => {
  const offlineData = {
    frequency,
    timestamp: Date.now()
  };
  localStorage.setItem('offlineFrequency', JSON.stringify(offlineData));
};

export const getStoredOfflineFrequency = () => {
  const data = localStorage.getItem('offlineFrequency');
  return data ? JSON.parse(data) : null;
};

export const clearOfflineFrequency = () => {
  localStorage.removeItem('offlineFrequency');
};

export const setupNetworkListener = (onOnline) => {
  Network.addListener('networkStatusChange', (status) => {
    if (status.connected) {
      onOnline();
    }
  });
};

export const checkNetworkStatus = async () => {
  const status = await Network.getStatus();
  return status.connected;
}; 