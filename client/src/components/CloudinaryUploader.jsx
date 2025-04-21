import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * CloudinaryUploader component for direct browser-to-Cloudinary uploads
 * No server involvement needed - uses Cloudinary's unsigned upload preset
 */
const CloudinaryUploader = ({ 
  onUploadSuccess, 
  onUploadError, 
  uploadPreset = "ml_default", 
  cloudName = "dyk154dvi",
  folder = "user_uploads",
  multiple = false,
  maxFiles = 10,
  maxFileSize = 10000000, // 10MB
  acceptedFileTypes = "image/*"
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileUrls, setFileUrls] = useState([]);

  // Function to upload a single file
  const uploadFile = useCallback(async (file) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a FormData instance
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('cloud_name', cloudName);
      formData.append('folder', folder);
      
      // Use the Cloudinary upload API directly
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
        // Track upload progress
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('File uploaded successfully to Cloudinary:', data.secure_url);
      
      setFileUrls(prev => [...prev, data.secure_url]);
      
      return data;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      if (onUploadError) onUploadError(error.message || 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [cloudName, uploadPreset, folder, onUploadError]);

  // Function to upload multiple files
  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return [];
    
    try {
      const uploadPromises = [];
      const filesToUpload = Array.from(files).slice(0, maxFiles);
      
      for (const file of filesToUpload) {
        // Check file size
        if (file.size > maxFileSize) {
          throw new Error(`File ${file.name} exceeds maximum size of ${maxFileSize/1000000}MB`);
        }
        
        uploadPromises.push(uploadFile(file));
      }
      
      const results = await Promise.all(uploadPromises);
      if (onUploadSuccess) onUploadSuccess(results.filter(Boolean));
      return results.filter(Boolean);
    } catch (error) {
      console.error('Error in batch upload:', error);
      if (onUploadError) onUploadError(error.message);
      return [];
    }
  }, [uploadFile, maxFiles, maxFileSize, onUploadSuccess, onUploadError]);

  // Function to handle file input change
  const handleFileChange = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    await uploadFiles(files);
  }, [uploadFiles]);

  // Function to handle drag and drop
  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files) {
      await uploadFiles(event.dataTransfer.files);
    }
  }, [uploadFiles]);

  // Function to handle drag over
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Upload base64 images (useful for images from canvas or webcam)
  const uploadBase64 = useCallback(async (base64Data, fileName = 'image.jpg') => {
    if (!base64Data) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Remove data URL prefix if present
      const data = base64Data.includes('base64,') 
        ? base64Data.split('base64,')[1] 
        : base64Data;
      
      // Create a FormData instance
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${data}`);
      formData.append('upload_preset', uploadPreset);
      formData.append('cloud_name', cloudName);
      formData.append('folder', folder);
      formData.append('filename_override', fileName);
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Base64 image uploaded successfully:', result.secure_url);
      
      setFileUrls(prev => [...prev, result.secure_url]);
      if (onUploadSuccess) onUploadSuccess([result]);
      
      return result;
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      if (onUploadError) onUploadError(error.message || 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [cloudName, uploadPreset, folder, onUploadSuccess, onUploadError]);

  // Batch upload multiple base64 images
  const uploadMultipleBase64 = useCallback(async (base64Array) => {
    if (!base64Array || !base64Array.length) return [];
    
    try {
      const results = [];
      for (let i = 0; i < base64Array.length; i++) {
        const result = await uploadBase64(
          base64Array[i], 
          `image_${i+1}.jpg`
        );
        if (result) results.push(result);
      }
      return results;
    } catch (error) {
      console.error('Error in batch base64 upload:', error);
      if (onUploadError) onUploadError(error.message);
      return [];
    }
  }, [uploadBase64, onUploadError]);

  return {
    uploadFile,
    uploadFiles,
    uploadBase64,
    uploadMultipleBase64,
    isUploading,
    uploadProgress,
    fileUrls,
    render: (
      <div 
        className="cloudinary-uploader"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          onChange={handleFileChange}
          accept={acceptedFileTypes}
          multiple={multiple}
          disabled={isUploading}
          className="cloudinary-uploader-input"
        />
        {isUploading && (
          <div className="upload-progress">
            <div 
              className="progress-bar" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
            <span>{uploadProgress}%</span>
          </div>
        )}
      </div>
    )
  };
};

CloudinaryUploader.propTypes = {
  onUploadSuccess: PropTypes.func,
  onUploadError: PropTypes.func,
  uploadPreset: PropTypes.string,
  cloudName: PropTypes.string,
  folder: PropTypes.string,
  multiple: PropTypes.bool,
  maxFiles: PropTypes.number,
  maxFileSize: PropTypes.number,
  acceptedFileTypes: PropTypes.string
};

export default CloudinaryUploader; 