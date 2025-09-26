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

// Confirm upload status
export const confirmUploadStatus = async (filename, fileUrl, status = 'completed', refId = null, userData = null) => {
  try {
    const userInfo = userData || getUserFromToken();
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }
    
    const payload = {
      filename: filename,
      file_url: fileUrl,
      status: status,
      upload_timestamp: new Date().toISOString()
    };
    
    if (refId) payload.ref_id = refId;
    if (userInfo?.userId) payload.userId = userInfo.userId;
    
    logger.upload('Confirming upload status', { filename, status });
    
    const res = await fetchWithTimeout(`${BASE_URL}upload/upload-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      throw new Error(`Failed to confirm upload status: ${res.status}`);
    }
    
    const data = await res.json();
    logger.success('Upload status confirmed');
    return data;
  } catch (error) {
    logger.error('Error confirming upload status', error.message);
    throw error;
  }
};

// Backend proxy upload (CORS-free alternative)
export const uploadFileViaBackend = async (file, onProgress = null) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    logger.upload('Uploading file via backend proxy', { filename: file.name, size: file.size });
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = 10 + (e.loaded / e.total) * 90;
          onProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            logger.success('Backend upload successful');
            resolve({
              success: true,
              message: 'File uploaded successfully via backend',
              fileUrl: result.file_url || result.url,
              fileName: file.name,
              fileSize: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
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
    logger.error('Backend upload failed', error.message);
    throw error;
  }
};

// Get user's documents
export const getUserFiles = async (page = 1, limit = 100) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    const res = await fetchWithTimeout(`${BASE_URL}reports/get_documents?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch user documents: ${res.status}`);
    }

    const data = await res.json();
    logger.info('User documents fetched', { count: data.documents?.length || 0 });
    return data;
  } catch (error) {
    logger.error('Error fetching user documents', error.message);
    throw error;
  }
};

// Download file from blob storage
export const downloadFileFromBlob = async (fileUrl, fileName) => {
  try {
    logger.info('Downloading file', { fileName });
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    logger.success('File downloaded successfully');
    return { success: true, message: 'File downloaded successfully' };
  } catch (error) {
    logger.error('Error downloading file', error.message);
    throw error;
  }
};

// Get document content and metadata
export const getDocumentContent = async (documentId) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }

    const res = await fetchWithTimeout(`${BASE_URL}reports/get_document/${documentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get document content: ${res.status}`);
    }

    const data = await res.json();
    logger.info('Document content received');
    return data;
  } catch (error) {
    logger.error('Error getting document content', error.message);
    throw error;
  }
};

// Get extracted vitals/parameters from document
export const getDocumentVitals = async (documentId) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }

    const res = await fetchWithTimeout(`${BASE_URL}reports/get_vitals/${documentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get document vitals: ${res.status}`);
    }

    const data = await res.json();
    logger.info('Document vitals received');
    return data;
  } catch (error) {
    logger.error('Error getting document vitals', error.message);
    throw error;
  }
};

// Get PDF data through backend proxy
export const getPDFDataViaProxy = async (documentId) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }

    const res = await fetchWithTimeout(`${BASE_URL}reports/get_pdf_data/${documentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get PDF data: ${res.status}`);
    }

    const pdfBlob = await res.arrayBuffer();
    logger.info('PDF data received via proxy', { size: pdfBlob.byteLength });
    return pdfBlob;
  } catch (error) {
    logger.error('Error getting PDF data via proxy', error.message);
    throw error;
  }
};

// Get signed URL for document viewing
export const getSignedUrl = async (blobPath) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }

    const res = await fetchWithTimeout(`${BASE_URL}reports/get-signed-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blob_path: blobPath
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to get signed URL: ${res.status}`);
    }

    const data = await res.json();
    
    if (!data.success || !data.signed_url) {
      throw new Error(data.message || 'No signed URL in response');
    }
    
    logger.success('Signed URL received');
    return {
      signedUrl: data.signed_url,
      expiresIn: data.expires_in,
      message: data.message
    };
  } catch (error) {
    logger.error('Error getting signed URL', error.message);
    throw error;
  }
};

// Delete user file
export const deleteUserFile = async (fileId) => {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token found. Please login again.');
    }

    const res = await fetchWithTimeout(`${BASE_URL}files/delete/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to delete file: ${res.status}`);
    }

    const data = await res.json();
    logger.success('File deleted successfully');
    return data;
  } catch (error) {
    logger.error('Error deleting file', error.message);
    throw error;
  }
};

// Complete upload workflow
export const uploadFileComplete = async (file, onProgress = null) => {
  let refId = null;
  let userData = null;
  
  try {
    // Get presigned URL with user data
    onProgress?.(10);
    const presignedData = await getPresignedUrl(file.name, file.type);
    const signedUrl = presignedData.sas_token || presignedData.upload_url;
    refId = presignedData.ref_id;
    userData = presignedData.userData;
    
    if (!signedUrl) {
      throw new Error('No upload URL received from server');
    }
    
    logger.info('Upload process started', { refId });
    
    // Upload to blob storage
    onProgress?.(20);
    const uploadResult = await uploadToBlob(file, signedUrl, (progress) => {
      const overallProgress = 20 + (progress * 0.7);
      onProgress?.(overallProgress);
    });
    
    // Confirm upload status
    onProgress?.(95);
    await confirmUploadStatus(file.name, uploadResult.url, 'completed', refId, userData);
    
    onProgress?.(100);
    
    return {
      success: true,
      message: 'File uploaded successfully',
      fileUrl: uploadResult.url,
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + 'MB',
      refId: refId
    };
    
  } catch (error) {
    logger.error('Complete upload workflow failed', error.message);
    
    // Try to send failed status to backend
    try {
      await confirmUploadStatus(file.name, '', 'failed', refId, userData);
    } catch (statusError) {
      logger.error('Failed to send failure status', statusError.message);
    }
    
    throw error;
  }
};
