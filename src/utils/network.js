import { BASE_URL } from '../assets/Constants';
import { BlobServiceClient } from '@azure/storage-blob';
import { getUserFromToken, getToken, getAccessToken, getRefreshToken, clearAllTokens } from './auth';

// Helper to handle responses
const handleResponse = async (res) => {
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'API error');
  }
  return res.json();
};

// 🔐 Signup
// ❌ OLD: Only email/password
// export const signup = async (email, password) => {

// ✅ NEW: Accept full user data object  
export const signup = async (userData) => {
  // 🔄 TRY JSON FIRST (Most backends prefer this)
  const payload = {
    // 🔐 Account credentials
    email_id: userData.email,
    password: userData.password,
    
    // 👤 Personal information
    user_name: userData.firstName + " " + userData.lastName,
    mobile_num: userData.phone || '',
    dob: userData.dateOfBirth || '',
    gender: userData.gender || '',
    address: userData.address || '',
    city: userData.city || '',
    
    // 🏥 Health profile
    height: userData.height || '',
    weight: userData.weight || '',
    blood_group: userData.bloodType || '',
    diabetics: userData.diabetics || '',
    bp: userData.bp || '',
    allergies: userData.allergies || '',
    medications: userData.medications || '',
    
    // 📋 Medical conditions (keep as array)
    medical_conditions: userData.medicalConditions || [],
    
    // 🚨 Emergency contact
    emergency_contact_name: userData.emergencyContactName || '',
    emergency_contact_phone: userData.emergencyContactPhone || '',
    emergency_contact_relation: userData.emergencyContactRelation || '',
    
    // ⚙️ User preferences
    allow_notifications: userData.allowNotifications || false,
    agree_to_terms: userData.agreeToTerms || false,
    agree_to_privacy: userData.agreeToPrivacy || false
  };

  console.log('📤 Sending JSON signup payload:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`${BASE_URL}user/signup-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',  // ✅ EXPLICIT JSON Content-Type
      },
      body: JSON.stringify(payload),
    });

    // ✅ ENHANCED ERROR HANDLING
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ Signup failed (${res.status}):`, errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('📋 Error details:', errorData);
        throw new Error(errorData.message || errorData.detail || `Server error: ${res.status}`);
      } catch (parseError) {
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }
    }

    return handleResponse(res);
    
  } catch (error) {
    console.error('🚨 Signup request failed:', error);
    throw error;
  }
};

// 📝 FALLBACK: FormData version (if backend needs multipart/form-data)
export const signupFormData = async (userData) => {
  const formData = new FormData();
  
  // 🔐 Account credentials
  formData.append('email_id', userData.email);
  formData.append('password', userData.password);
  
  // 👤 Personal information
  if (userData.firstName) formData.append('user_name', userData.firstName+" "+userData.lastName);
  if (userData.phone) formData.append('mobile_num', userData.phone);
  if (userData.dateOfBirth) formData.append('dob', userData.dateOfBirth);
  if (userData.gender) formData.append('gender', userData.gender);
  if (userData.address) formData.append('address', userData.address);
  if (userData.city) formData.append('city', userData.city);
  
  // 🏥 Health profile
  if (userData.height) formData.append('height', userData.height);
  if (userData.weight) formData.append('weight', userData.weight);
  if (userData.bloodType) formData.append('blood_group', userData.bloodType);
  if (userData.diabetics) formData.append('diabetics', userData.diabetics);
  if (userData.bp) formData.append('bp', userData.bp);
  if (userData.allergies) formData.append('allergies', userData.allergies);
  if (userData.medications) formData.append('medications', userData.medications);
  
  // 📋 Medical conditions (array to JSON string)
  if (userData.medicalConditions && userData.medicalConditions.length > 0) {
    formData.append('medical_conditions', userData.medicalConditions);
  }
  
  // 🚨 Emergency contact
  if (userData.emergencyContactName) formData.append('emergency_contact_name', userData.emergencyContactName);
  if (userData.emergencyContactPhone) formData.append('emergency_contact_phone', userData.emergencyContactPhone);
  if (userData.emergencyContactRelation) formData.append('emergency_contact_relation', userData.emergencyContactRelation);
  
  // ⚙️ User preferences
  formData.append('allow_notifications', userData.allowNotifications || false);
  formData.append('agree_to_terms', userData.agreeToTerms || false);
  formData.append('agree_to_privacy', userData.agreeToPrivacy || false);
  
  console.log('📤 Sending FormData payload:');
  // FormData debugging
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value);
  }

  try {
    const res = await fetch(`${BASE_URL}user/signup-form`, {
      method: 'POST',
      // ❌ NO Content-Type header - browser sets multipart/form-data automatically
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ FormData signup failed (${res.status}):`, errorText);
      throw new Error(`Server error: ${res.status} - ${errorText}`);
    }

    return handleResponse(res);
    
  } catch (error) {
    console.error('🚨 FormData signup request failed:', error);
    throw error;
  }
};


export const login = async (email, password) => {


  const res = await fetch(`${BASE_URL}user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(res);
};

// 🚪 Logout Service - Matches exact curl format
export const logout = async () => {
  try {
    console.log('🚪 Attempting logout...');
    
    // Get both access_token and refresh_token
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    
    if (!accessToken || !refreshToken) {
      console.log('⚠️ No tokens found, proceeding with client-side logout');
      clearAllTokens(); // Clear any remaining tokens
      return { success: true, message: 'Logged out locally' };
    }

    console.log('📤 Calling logout service with tokens...');

    // Call backend logout endpoint - exact format from curl
    const response = await fetch(`${BASE_URL}user/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // Access token in header
      },
      body: JSON.stringify({
        refresh_token: refreshToken // Refresh token in body
      }),
    });

    if (response.ok) {
      console.log('✅ Server logout successful');
      clearAllTokens(); // Clear all tokens after successful logout
      return handleResponse(response);
    } else {
      // Even if server logout fails, we should still clear local data
      console.warn('⚠️ Server logout failed, but clearing local session');
      const errorText = await response.text();
      console.error(`❌ Logout failed (${response.status}):`, errorText);
      
      // Check for specific backend database errors
      if (errorText.includes('$set') || errorText.includes('Document can\'t have $ prefixed field names')) {
        console.error('🔧 Backend MongoDB Error: The server has a database configuration issue');
        console.log('💡 This is a backend issue that needs to be fixed by the development team');
        console.log('🔄 User session will still be cleared locally for security');
      }
      
      clearAllTokens(); // Clear tokens even if server call fails
      return { success: true, message: 'Local logout completed despite server error' };
    }
    
  } catch (error) {
    console.error('❌ Logout request failed:', error);
    // Still proceed with local logout even if server call fails
    clearAllTokens(); // Always clear tokens
    return { success: true, message: 'Local logout completed despite server error' };
  }
};


export const uploadFile = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('token', token);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(res);
};

// 🧾 Get User Info (optional)
export const getUserProfile = async (token) => {
  const res = await fetch(`${BASE_URL}/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(res);
};

// File validation utilities
export const validateFile = (file) => {
  const errors = [];
  
  // Check if file exists
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png'
  ];
  
  const allowedExtensions = ['pdf', 'jpeg', 'jpg', 'png'];
  const fileExtension = file.name.split('.').pop().toLowerCase();
  
  // Validate file type
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    errors.push('File type not supported. Please upload PDF, JPEG, JPG, or PNG files only.');
  }
  
  // Validate file size (3MB = 3 * 1024 * 1024 bytes)
  const maxSize = 3 * 1024 * 1024; // 3MB
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum allowed size is 3MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
  }
  
  // Validate file name
  if (file.name.length > 255) {
    errors.push('File name is too long. Please use a shorter file name.');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: fileExtension,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    }
  };
};

// Get file type category
export const getFileCategory = (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'pdf') return 'document';
  if (['jpeg', 'jpg', 'png'].includes(extension)) return 'image';
  return 'unknown';
};

// Enhanced presigned URL function with JWT user data
export const getPresignedUrl = async (filename, fileType = null) => {
  try {
    // Extract user data from JWT token
    const userData = getUserFromToken();
    const accessToken = getAccessToken();
    
    // Check if we have an access token
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }
    
    const formData = new FormData();
    formData.append('filename', filename);
    if (fileType) {
      formData.append('content_type', fileType);
    }
    
    // Add user data from JWT token
    if (userData) {
      if (userData.userId) formData.append('userId', userData.userId);
      if (userData.userName) formData.append('userName', userData.userName);
      if (userData.mobileNo) formData.append('mobile_no', userData.mobileNo);
    } else {
      console.warn('No user data found in JWT token for upload request');
    }

    console.log('🔐 Making authenticated upload request with access token...');

    const res = await fetch(`${BASE_URL}upload/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // 🔑 ADD AUTHENTICATION HEADER
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get upload URL: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    console.log("Presigned URL response:", data);
    
    // Extract ref_id from response for later use
    const refId = data.ref_id || data.reference_id || data.upload_id;
    if (refId) {
      console.log("Upload reference ID:", refId);
    }
    
    return {
      ...data,
      ref_id: refId,
      userData: userData // Pass user data along for use in status confirmation
    };
  } catch (error) {
    console.error('Error getting presigned URL:', error);
    throw error;
  }
};

// Upload file to blob storage using signed URL
export const uploadToBlob = async (file, signedUrl, onProgress = null) => {
  try {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            status: xhr.status,
            url: signedUrl.split('?')[0] // Remove query params to get clean URL
          });
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });
      
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  } catch (error) {
    console.error('Error uploading to blob:', error);
    throw error;
  }
};

// Send upload confirmation to backend with user data and ref_id
export const confirmUploadStatus = async (filename, fileUrl, status = 'completed', refId = null, userData = null) => {
  try {
    // Get user data from JWT if not provided
    const userInfo = userData || getUserFromToken();
    const accessToken = getAccessToken();
    
    // Check if we have an access token
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }
    
    const payload = {
      filename: filename,
      file_url: fileUrl,
      status: status,
      upload_timestamp: new Date().toISOString()
    };
    
    // Add ref_id if provided
    if (refId) {
      payload.ref_id = refId;
    }
    
    // Add user data from JWT token
    if (userInfo) {
      if (userInfo.userId) payload.userId = userInfo.userId;
      
    }
    
    console.log("📤 Upload status payload:", payload);
    console.log('🔐 Making authenticated upload status request...');
    
    const res = await fetch(`${BASE_URL}upload/upload-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`, // 🔑 ADD AUTHENTICATION HEADER
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to confirm upload status: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    console.log("Upload status confirmation:", data);
    return data;
  } catch (error) {
    console.error('Error confirming upload status:', error);
    throw error;
  }
};

// Backend proxy upload (CORS-free alternative)
export const uploadFileViaBackend = async (file, onProgress = null) => {
  try {
    // Step 1: Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join('. '));
    }
    
    // Step 2: Get access token
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }
    
    // Step 3: Prepare form data
    onProgress?.(10);
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('📤 Uploading file via backend proxy (CORS-free)...');
    
    // Step 4: Upload via backend (no CORS issues)
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = 10 + (e.loaded / e.total) * 90; // 10% to 100%
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log('✅ Backend upload successful:', result);
            resolve({
              success: true,
              message: 'File uploaded successfully via backend',
              fileUrl: result.file_url || result.url,
              fileName: file.name,
              fileSize: validation.fileInfo.sizeInMB + 'MB',
              refId: result.ref_id || result.upload_id
            });
          } catch (parseError) {
            reject(new Error('Invalid server response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.message || `Upload failed: ${xhr.status}`));
          } catch (parseError) {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });
      
      xhr.open('POST', `${BASE_URL}upload/direct`);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
    });
    
  } catch (error) {
    console.error('Backend upload failed:', error);
    throw error;
  }
};

// Complete upload workflow with ref_id tracking (Direct blob upload)
export const uploadFileComplete = async (file, onProgress = null) => {
  let refId = null;
  let userData = null;
  
  try {
    // Step 1: Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.errors.join('. '));
    }
    
    // Step 2: Get presigned URL with user data
    onProgress?.(10);
    const presignedData = await getPresignedUrl(file.name, file.type);
    const signedUrl = presignedData.sas_token || presignedData.upload_url;
    refId = presignedData.ref_id;
    userData = presignedData.userData;
    
    if (!signedUrl) {
      throw new Error('No upload URL received from server');
    }
    
    console.log("Upload process started with ref_id:", refId);
    
    // Step 3: Upload to blob storage
    onProgress?.(20);
    const uploadResult = await uploadToBlob(file, signedUrl, (progress) => {
      // Map blob upload progress to overall progress (20% to 90%)
      const overallProgress = 20 + (progress * 0.7);
      onProgress?.(overallProgress);
    });
    
    // Step 4: Confirm upload status with backend including ref_id and user data
    onProgress?.(95);
    await confirmUploadStatus(file.name, uploadResult.url, 'completed', refId, userData);
    
    onProgress?.(100);
    
    return {
      success: true,
      message: 'File uploaded successfully',
      fileUrl: uploadResult.url,
      fileName: file.name,
      fileSize: validation.fileInfo.sizeInMB + 'MB',
      refId: refId
    };
    
  } catch (error) {
    console.error('Complete upload workflow failed:', error);
    
    // If CORS error, suggest using backend proxy
    if (error.message.includes('CORS') || error.message.includes('blocked by CORS policy') || error.message.includes('network error')) {
      console.log('💡 CORS error detected. Consider using uploadFileViaBackend() instead.');
      console.log('💡 Or configure Azure Blob Storage CORS settings.');
      console.log('💡 See AZURE_BLOB_CORS_FIX.md for solutions.');
    }
    
    // Try to send failed status to backend with ref_id and user data
    try {
      await confirmUploadStatus(file.name, '', 'failed', refId, userData);
    } catch (statusError) {
      console.error('Failed to send failure status:', statusError);
    }
    
    throw error;
  }
};
