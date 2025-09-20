export const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

export const hashPassword = (password) => {
  // Placeholder for real hashing
  return btoa(password);
};

// JWT Token Management Functions
export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// Access Token Functions
export const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

export const setAccessToken = (token) => {
  localStorage.setItem('access_token', token);
};

export const removeAccessToken = () => {
  localStorage.removeItem('access_token');
};

// Refresh Token Functions
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token');
};

export const setRefreshToken = (token) => {
  localStorage.setItem('refresh_token', token);
};

export const removeRefreshToken = () => {
  localStorage.removeItem('refresh_token');
};

// Clear all tokens
export const clearAllTokens = () => {
  removeToken();
  removeAccessToken();
  removeRefreshToken();
};

// Decode JWT token (without verification - for client-side token parsing)
export const decodeJWT = (token) => {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// Get user info from JWT token
export const getUserFromToken = (token = null) => {
  try {
    const currentToken = token || getToken();
    if (!currentToken) return null;
    
    const decoded = decodeJWT(currentToken);
    if (!decoded) return null;
    
    // Extract user information from token payload
    return {
      userId: decoded.user_id || decoded.id || decoded.sub,
      userName: decoded.user_name || decoded.name || decoded.username || decoded.email,
      email: decoded.email || decoded.sub || decoded.username,
      mobileNo: decoded.mobile_no || decoded.mobile || decoded.phone,
      exp: decoded.exp,
      iat: decoded.iat,
      ...decoded
    };
  } catch (error) {
    console.error('Error extracting user from token:', error);
    return null;
  }
};
