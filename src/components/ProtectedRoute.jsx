import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccessToken, getRefreshToken } from '../utils/auth';
import { logger } from '../utils/logger';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = getAccessToken();
        const refreshToken = getRefreshToken();
        
        logger.auth('Checking authentication status', {
          hasUser: !!user,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });
        
        // Check if we have both user data AND valid tokens
        if (user && accessToken && refreshToken) {
          logger.auth('Authentication valid');
          setIsAuthenticated(true);
        } else {
          logger.warn('Authentication invalid - missing data', {
            missingUser: !user,
            missingAccessToken: !accessToken,
            missingRefreshToken: !refreshToken
          });
          
          // Clear any incomplete auth state
          if (!user || !accessToken || !refreshToken) {
            logger.auth('Clearing incomplete auth state');
            await logout();
          }
          
          setIsAuthenticated(false);
        }
      } catch (error) {
        logger.error('Auth check error', error.message);
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [user, logout]);

  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    logger.auth('Redirecting to login - authentication required');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return children;
}
