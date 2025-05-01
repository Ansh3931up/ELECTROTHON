import { Camera } from '@capacitor/camera';

/**
 * Check if we're running in a Capacitor native app environment
 * @returns {boolean}
 */
const isNativeApp = () => {
  return typeof window !== 'undefined' && 
         window.Capacitor && 
         window.Capacitor.isNativePlatform();
};

/**
 * Check if camera permissions are already granted
 * @returns {Promise<boolean>} True if camera access is granted
 */
export const checkCameraPermission = async () => {
  try {
    // First check if running in a native environment
    if (isNativeApp()) {
      try {
        const permissionStatus = await Camera.checkPermissions();
        return permissionStatus.camera === 'granted';
      } catch (error) {
        console.error('Error checking Capacitor camera permission:', error);
        return false;
      }
    }
    
    // For web browsers, we need to check through the media devices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }
    
    try {
      // The simplest way to check permission is to try to access the camera
      // with minimal constraints and then immediately stop it
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      // If we get here, permission is granted
      // Make sure to release the camera immediately
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      return true;
    } catch (error) {
      console.log('Camera permission check failed:', error.name);
      // NotAllowedError means permission was denied
      // NotFoundError means no camera is available
      return false;
    }
  } catch (error) {
    console.error('Error in checkCameraPermission:', error);
    return false;
  }
};

/**
 * Request camera permissions specifically 
 * Works in both web browsers and mobile devices
 * @returns {Promise<{granted: boolean, stream?: MediaStream, error?: string}>}
 */
export const requestCameraPermission = async () => {
  try {
    // Check if the browser/device supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        granted: false,
        error: 'Your browser does not support camera access'
      };
    }

    // Try the standard browser API first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false
      });
      
      return {
        granted: true,
        stream
      };
    } catch (browserError) {
      console.error('Browser camera permission error:', browserError);
      
      // Only try Capacitor API if we're in a native app environment
      if (isNativeApp()) {
        try {
          const cameraStatus = await Camera.checkPermissions();
          if (cameraStatus.camera !== 'granted') {
            const requestResult = await Camera.requestPermissions();
            if (requestResult.camera === 'granted') {
              return {
                granted: true
              };
            }
          } else {
            return {
              granted: true
            };
          }
        } catch (capacitorError) {
          console.error('Capacitor camera permission error:', capacitorError);
        }
      }
      
      // If we get here, browser API failed (and possibly Capacitor too if in native)
      let errorMessage = 'Camera permission denied';
      
      // Provide more specific error messages based on error type
      if (browserError.name === 'NotAllowedError') {
        errorMessage = 'Camera access was denied. Please update your browser settings to allow camera access.';
      } else if (browserError.name === 'NotFoundError') {
        errorMessage = 'No camera found on your device.';
      } else if (browserError.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (browserError.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints cannot be satisfied.';
      } else if (browserError.name === 'SecurityError') {
        errorMessage = 'Camera access is blocked due to security restrictions.';
      } else if (browserError.name === 'TypeError') {
        errorMessage = 'Camera constraints are invalid.';
      }
      
      return {
        granted: false,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return {
      granted: false,
      error: error.message || 'Unknown error requesting camera'
    };
  }
};

/**
 * Get browser-specific camera permission instructions
 * @returns {Object} Browser-specific instructions
 */
export const getCameraPermissionInstructions = () => {
  const browser = detectBrowser();
  
  const instructions = {
    chrome: {
      desktop: [
        'Click the camera icon in the address bar',
        'Select "Allow" for camera access',
        'Refresh the page'
      ],
      mobile: [
        'Tap on the three dots menu',
        'Go to Settings > Site Settings > Camera',
        'Find this website and allow camera access',
        'Return to this page and refresh'
      ]
    },
    brave: {
      desktop: [
        'Click the shield icon in the address bar',
        'Make sure "Shields are down" or set to "Standard"',
        'Then click the camera icon in the address bar',
        'Select "Allow" for camera access',
        'Refresh the page'
      ],
      mobile: [
        'Tap on the three dots menu in Brave',
        'Go to Settings > Site Settings > Camera',
        'Find this website and allow camera access',
        'If still not working, tap the shield icon and set Shields to "Down"',
        'Return to this page and refresh'
      ]
    },
    firefox: {
      desktop: [
        'Click the camera icon in the address bar',
        'Select "Allow" for camera access',
        'Refresh the page'
      ],
      mobile: [
        'Tap on the three dots menu',
        'Go to Settings > Site permissions > Camera',
        'Find this website and allow camera access',
        'Return to this page and refresh'
      ]
    },
    safari: {
      desktop: [
        'Click Safari > Preferences > Websites > Camera',
        'Find this website and select "Allow"',
        'Refresh the page'
      ],
      mobile: [
        'Open Settings app',
        'Scroll down and tap Safari',
        'Tap Camera',
        'Select "Allow" for this website',
        'Return to this page and refresh'
      ]
    },
    edge: {
      desktop: [
        'Click the lock icon in the address bar',
        'Select "Site permissions"',
        'Enable camera access',
        'Refresh the page'
      ],
      mobile: [
        'Tap on the three dots menu',
        'Go to Settings > Site permissions > Camera',
        'Find this website and allow camera access',
        'Return to this page and refresh'
      ]
    },
    default: {
      desktop: [
        'Check your browser settings to allow camera access',
        'Look for privacy or permission settings',
        'Allow camera access for this website',
        'Refresh the page'
      ],
      mobile: [
        'Check your browser settings',
        'Look for privacy or site permissions',
        'Allow camera access for this website',
        'Return to this page and refresh'
      ]
    }
  };
  
  return instructions[browser] || instructions.default;
};

/**
 * Detect the current browser
 * @returns {string} Browser name (chrome, firefox, safari, edge, brave, or default)
 */
export const detectBrowser = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Check if Brave browser (Brave identifies itself in navigator)
  if (typeof navigator.brave !== 'undefined' && navigator.brave.isBrave && navigator.brave.isBrave.name === 'isBrave') {
    return 'brave';
  }
  
  // Alternative Brave detection since navigator.brave might not always be available
  const isBraveBrowser = (typeof navigator !== 'undefined') && 
                         (navigator.brave !== undefined) && 
                         (typeof navigator.brave.isBrave === 'function' || 
                          ('isBrave' in navigator.brave));
  
  if (isBraveBrowser) {
    return 'brave';
  }
  
  // Try another method for Brave
  if (userAgent.indexOf('chrome') > -1 && window.chrome && "brave" in window) {
    return 'brave';
  }
  
  // Standard browser detection
  if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('edge') === -1) {
    return 'chrome';
  } else if (userAgent.indexOf('firefox') > -1) {
    return 'firefox';
  } else if (userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1) {
    return 'safari';
  } else if (userAgent.indexOf('edge') > -1) {
    return 'edge';
  } else {
    return 'default';
  }
};

/**
 * Check if the device is mobile
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  return /android|ipad|iphone|ipod|webos|blackberry|windows phone/i.test(userAgent);
};

// Check if running in web browser
const isWeb = typeof window !== 'undefined' && window.navigator;

// Function to check device capabilities
export const checkDeviceCapabilities = async () => {
  if (!isWeb) return { hasMicrophone: false, hasCamera: false };

    try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMicrophone = devices.some(device => device.kind === 'audioinput');
    const hasCamera = devices.some(device => device.kind === 'videoinput');
    return { hasMicrophone, hasCamera };
  } catch (error) {
    console.error('Error checking device capabilities:', error);
    return { hasMicrophone: false, hasCamera: false };
    }
};

// Function to check and request permissions
export const checkAndRequestPermissions = async (userType) => {
  if (!isWeb) return false;

  try {
    // For web, we use the Permissions API if available
    if (navigator.permissions) {
      const micPermission = await navigator.permissions.query({ name: 'microphone' });
      const cameraPermission = await navigator.permissions.query({ name: 'camera' });

      // If either permission is denied, return false
      if (micPermission.state === 'denied' || cameraPermission.state === 'denied') {
        return false;
      }
    }

    // Request both permissions simultaneously
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true
    });

    // Clean up the stream after getting permissions
    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

// Function to check current permission status
export const checkPermissionStatus = async () => {
  if (!isWeb) return { microphone: 'denied', camera: 'denied' };

  try {
    if (navigator.permissions) {
      const [micPermission, cameraPermission] = await Promise.all([
        navigator.permissions.query({ name: 'microphone' }),
        navigator.permissions.query({ name: 'camera' })
      ]);

      return {
        microphone: micPermission.state,
        camera: cameraPermission.state
      };
    }

    // Fallback for browsers that don't support Permissions API
    return {
      microphone: 'prompt',
      camera: 'prompt'
    };
  } catch (error) {
    console.error('Error checking permission status:', error);
    return {
      microphone: 'denied',
      camera: 'denied'
    };
  }
}; 