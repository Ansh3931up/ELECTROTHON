/**
 * Utility functions for Cloudinary integration
 */
import axios from 'axios';

// Create an upload preset in your Cloudinary dashboard and use it here
// This must be an "unsigned" preset for direct browser uploads
// IMPORTANT: You must create this preset in your Cloudinary dashboard and set its signing mode to "unsigned"
// const CLOUDINARY_UPLOAD_PRESET = "ml_default";
// const CLOUDINARY_CLOUD_NAME = "dyk154dvi";

const CLOUDINARY_UPLOAD_PRESET = "uploadImage";
const CLOUDINARY_CLOUD_NAME = "du9foikdt";
const CLOUDINARY_FOLDER = "user_faces";

/**
 * Upload a single base64 image to Cloudinary using axios approach
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} fileName - Optional file name
 * @returns {Promise<object>} Cloudinary response or null on error
 */
export const uploadImageToCloudinary = async (base64Image, fileName = "face.jpg") => {
  if (!base64Image) return null;
  
  try {
    console.log(`Starting upload to Cloudinary for ${fileName}`);
    
    // Convert base64 to blob for FormData
    const blob = await fetch(base64Image).then(res => res.blob());
    
    // Create FormData object for upload
    const data = new FormData();
    data.append("file", blob, fileName);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    data.append("folder", CLOUDINARY_FOLDER);
    
    console.log("Sending upload request to Cloudinary API...");
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      data
    );
    
    console.log('Image uploaded to Cloudinary:', response.data.secure_url);
    return response.data;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error.response?.data?.message || error.message);
    return null;
  }
};

/**
 * Upload multiple base64 images to Cloudinary in sequence
 * @param {Array<string>} base64Images - Array of base64 encoded images
 * @returns {Promise<Object>} Results of the upload operation
 */
export const uploadMultipleImagesToCloudinary = async (base64Images) => {
  if (!base64Images || !base64Images.length) {
    return {
      results: [],
      hasErrors: false,
      count: 0,
      totalAttempted: 0
    };
  }
  
  console.log(`Starting upload of ${base64Images.length} images to Cloudinary...`);
  const results = [];
  let hasErrors = false;
  
  for (let i = 0; i < base64Images.length; i++) {
    try {
      console.log(`Processing image ${i+1}/${base64Images.length}...`);
      
      // Skip empty or invalid images
      if (!base64Images[i] || base64Images[i].length < 100) {
        console.warn(`Image ${i+1} is empty or too small, skipping`);
        continue;
      }
      
      const result = await uploadImageToCloudinary(
        base64Images[i],
        `face_${i+1}.jpg`
      );
      
      if (result) {
        console.log(`Image ${i+1} uploaded successfully: ${result.secure_url}`);
        results.push({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height
        });
      } else {
        console.error(`Image ${i+1} upload failed`);
        hasErrors = true;
      }
    } catch (error) {
      console.error(`Error uploading image ${i+1}:`, error);
      hasErrors = true;
    }
  }
  
  console.log(`Upload completed: ${results.length}/${base64Images.length} images successfully uploaded`);
  return {
    results,
    hasErrors,
    count: results.length,
    totalAttempted: base64Images.length
  };
};

/**
 * Upload a file directly to Cloudinary - using the example provided by the user
 * @param {File} file - The file to upload
 * @returns {Promise<string>} The URL of the uploaded file
 */
export const uploadFileToCloudinary = async (file) => {
  try {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    data.append("cloud_name", CLOUDINARY_CLOUD_NAME);
    
    // Log the payload details before sending
    console.log("Cloudinary upload payload:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadPreset: CLOUDINARY_UPLOAD_PRESET,
      cloudName: CLOUDINARY_CLOUD_NAME
    });
    
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      data
    );
    
    // Log the response
    console.log("Cloudinary upload response:", {
      url: response.data.url,
      secureUrl: response.data.secure_url,
      publicId: response.data.public_id
    });
    
    return response.data.url;
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error.response?.data || error);
    throw error;
  }
};

/**
 * Get Cloudinary configuration for direct component integration
 */
export const getCloudinaryConfig = () => {
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    folder: CLOUDINARY_FOLDER
  };
}; 