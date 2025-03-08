import { Camera } from '@capacitor/camera';

export const checkAndRequestPermissions = async () => {
  try {
    // First check if the browser/device supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices not supported');
    }

    // Request microphone permission explicitly first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
    } catch (micError) {
      console.error('Microphone permission error:', micError);
      throw new Error('Microphone permission denied');
    }

    // Then check camera permissions
    const cameraStatus = await Camera.checkPermissions();
    if (cameraStatus.camera !== 'granted') {
      const requestResult = await Camera.requestPermissions();
      if (requestResult.camera !== 'granted') {
        throw new Error('Camera permission denied');
      }
    }

    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return {
      granted: false,
      error: error.message
    };
  }
};

// Utility function to check if device has necessary hardware
export const checkDeviceCapabilities = async () => {
  try {
    // Check if device has microphone
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
    const hasCamera = devices.some(device => device.kind === 'videoinput');
    
    return {
      hasMicrophone,
      hasCamera
    };
  } catch (error) {
    console.error('Error checking device capabilities:', error);
    return {
      hasMicrophone: false,
      hasCamera: false
    };
  }
}; 