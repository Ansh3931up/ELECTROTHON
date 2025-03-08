import * as faceapi from 'face-api.js';

export const verifyFace = async (studentDescriptor, storedDescriptor) => {
  try {
    if (!studentDescriptor || !storedDescriptor) {
      return { 
        isMatch: false, 
        error: 'Face descriptor missing' 
      };
    }

    // Convert descriptors to Float32Array if they're not already
    const descriptor1 = new Float32Array(studentDescriptor);
    const descriptor2 = new Float32Array(storedDescriptor);

    // Calculate Euclidean distance between descriptors
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    const threshold = 0.6; // Adjust this threshold based on your needs
    
    return {
      isMatch: distance < threshold,
      confidence: 1 - distance,
      distance
    };
  } catch (error) {
    console.error('Face verification error:', error);
    return { 
      isMatch: false, 
      error: error.message 
    };
  }
};

// Function to generate descriptor from image (used during registration)
export const generateFaceDescriptor = async (image) => {
  try {
    // Load face recognition models if not already loaded
    await faceapi.nets.faceRecognitionNet.loadFromDisk('server\mlModels\face_recognition');
    await faceapi.nets.faceLandmark68Net.loadFromDisk('server\mlModels\face_landmark_68');
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('server\mlModels\ssd_mobilenetv1');

    const detection = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error('No face detected in image');
    }

    // Convert descriptor to array for storage
    return Array.from(detection.descriptor);
  } catch (error) {
    console.error('Error generating face descriptor:', error);
    throw error;
  }
};
