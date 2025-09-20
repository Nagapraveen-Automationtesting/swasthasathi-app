import { createContext, useContext, useState, useEffect } from 'react';
import { logout as logoutService } from '../utils/network';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      console.log('🚪 Starting logout process...');
      
      // Call backend logout service (includes token invalidation)
      const result = await logoutService();
      console.log('✅ Logout service result:', result);
      
      // Clear local state and storage (tokens already cleared in service)
      setUser(null);
      localStorage.removeItem('user');
      
      console.log('✅ Local logout completed');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
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
