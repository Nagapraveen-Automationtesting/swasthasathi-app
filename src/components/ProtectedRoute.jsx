import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAccessToken, getRefreshToken } from '../utils/auth';
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
        
        console.log('🔐 Checking authentication...');
        console.log('User:', !!user);
        console.log('Access Token:', !!accessToken);
        console.log('Refresh Token:', !!refreshToken);
        
        // Check if we have both user data AND valid tokens
        if (user && accessToken && refreshToken) {
          console.log('✅ Authentication valid');
          setIsAuthenticated(true);
        } else {
          console.log('❌ Authentication invalid - missing data');
          console.log('Missing:', {
            user: !user,
            accessToken: !accessToken,
            refreshToken: !refreshToken
          });
          
          // Clear any incomplete auth state
          if (!user || !accessToken || !refreshToken) {
            console.log('🧹 Clearing incomplete auth state...');
            await logout();
          }
          
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
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
    console.log('🚪 Redirecting to login...');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return children;
}
