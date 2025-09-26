// Network utilities with clean logging and no hard-coded values
import { BASE_URL, API_TIMEOUT } from '../assets/Constants';
import { getUserFromToken, getToken, getAccessToken, getRefreshToken, clearAllTokens } from './auth';
import { logger } from './logger';

// Helper to handle responses
const handleResponse = async (res) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'API error' }));
    throw new Error(error.detail || error.message || 'API error');
  }
  return res.json();
};

// Enhanced fetch with timeout and logging
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    logger.apiRequest(options.method || 'GET', url, options.body);
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    logger.apiResponse(options.method || 'GET', url, response.status);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// User signup with comprehensive health profile
export const signup = async (userData) => {
  const payload = {
    // Account credentials
    email_id: userData.email,
    password: userData.password,
    
    // Personal information
    user_name: `${userData.firstName} ${userData.lastName}`,
    mobile_num: userData.phone || '',
    dob: userData.dateOfBirth || '',
    gender: userData.gender || '',
    address: userData.address || '',
    city: userData.city || '',
    
    // Health profile
    height: userData.height || '',
    weight: userData.weight || '',
    blood_group: userData.bloodType || '',
    diabetics: userData.diabetics || '',
    bp: userData.bp || '',
    allergies: userData.allergies || '',
    medications: userData.medications || '',
    medical_conditions: userData.medicalConditions || [],
    
    // Emergency contact
    emergency_contact_name: userData.emergencyContactName || '',
    emergency_contact_phone: userData.emergencyContactPhone || '',
    emergency_contact_relation: userData.emergencyContactRelation || '',
    
    // User preferences
    allow_notifications: userData.allowNotifications || false,
    agree_to_terms: userData.agreeToTerms || false,
    agree_to_privacy: userData.agreeToPrivacy || false
  };

  logger.debug('Signup payload prepared', { email: userData.email, name: payload.user_name });

  try {
    const res = await fetchWithTimeout(`${BASE_URL}user/signup-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      logger.error('Signup failed', { status: res.status, error: errorText });
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || errorData.detail || `Server error: ${res.status}`);
      } catch (parseError) {
        throw new Error(`Server error: ${res.status} - ${errorText}`);
      }
    }

    logger.success('User signup successful');
    return handleResponse(res);
    
  } catch (error) {
    logger.error('Signup request failed', error.message);
    throw error;
  }
};

// User login
export const login = async (email, password) => {
  try {
    logger.auth('Attempting login', { email });
    
    const res = await fetchWithTimeout(`${BASE_URL}user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await handleResponse(res);
    logger.auth('Login successful');
    return result;
  } catch (error) {
    logger.error('Login failed', error.message);
    throw error;
  }
};

// User logout
export const logout = async () => {
  try {
    logger.auth('Starting logout process');
    
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    
    if (!accessToken || !refreshToken) {
      logger.warn('No tokens found, proceeding with client-side logout');
      clearAllTokens();
      return { success: true, message: 'Logged out locally' };
    }

    const response = await fetchWithTimeout(`${BASE_URL}user/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      }),
    });

    if (response.ok) {
      logger.auth('Server logout successful');
      clearAllTokens();
      return handleResponse(response);
    } else {
      logger.warn('Server logout failed, but clearing local session');
      clearAllTokens();
      return { success: true, message: 'Local logout completed despite server error' };
    }
    
  } catch (error) {
    logger.error('Logout request failed', error.message);
    clearAllTokens(); // Always clear tokens
    return { success: true, message: 'Local logout completed despite server error' };
  }
};

// Get user profile
export const getUserProfile = async () => {
  try {
    const token = getAccessToken();
    if (!token) throw new Error('No access token available');

    const res = await fetchWithTimeout(`${BASE_URL}user/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(res);
  } catch (error) {
    logger.error('Failed to get user profile', error.message);
    throw error;
  }
};

// Get presigned URL for file upload
export const getPresignedUrl = async (filename, fileType = null) => {
  try {
    const userData = getUserFromToken();
    const accessToken = getAccessToken();
    
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
    }

    logger.upload('Requesting presigned URL', { filename, fileType });

    const res = await fetchWithTimeout(`${BASE_URL}upload/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Failed to get upload URL: ${res.status}`);
    }
    
    const data = await res.json();
    logger.success('Presigned URL received');
    
    return {
      ...data,
      ref_id: data.ref_id || data.reference_id || data.upload_id,
      userData: userData
    };
  } catch (error) {
    logger.error('Error getting presigned URL', error.message);
    throw error;
  }
};

// Upload file to blob storage
export const uploadToBlob = async (file, signedUrl, onProgress = null) => {
  try {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          logger.upload('Blob upload successful');
          resolve({
            success: true,
            status: xhr.status,
            url: signedUrl.split('?')[0]
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
    logger.error('Error uploading to blob', error.message);
    throw error;
  }
};

// Continue with more functions...

