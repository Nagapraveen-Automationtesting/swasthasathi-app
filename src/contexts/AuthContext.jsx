import { createContext, useContext, useState, useEffect } from 'react';
import { logout as logoutService } from '../utils/network';
import { getUserFromToken, getAccessToken } from '../utils/auth';
import { logger } from '../utils/logger';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      
      // If userName is not in stored data, try to extract from token
      if (!userData.userName) {
        const accessToken = getAccessToken();
        if (accessToken) {
          const tokenUserData = getUserFromToken(accessToken);
          if (tokenUserData?.userName) {
            userData.userName = tokenUserData.userName;
            userData.userId = tokenUserData.userId;
            // Update stored data with extracted info
            localStorage.setItem('user', JSON.stringify(userData));
            logger.debug('Enhanced user data with token information');
          }
        }
      }
      
      setUser(userData);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      logger.auth('Starting logout process');
      
      // Call backend logout service (includes token invalidation)
      const result = await logoutService();
      logger.auth('Logout service completed', result);
      
      // Clear local state and storage (tokens already cleared in service)
      setUser(null);
      localStorage.removeItem('user');
      
      logger.success('Local logout completed');
      
    } catch (error) {
      logger.error('Logout error', error.message);
      // Still clear local data even if server call fails
      setUser(null);
      localStorage.removeItem('user');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggingOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
