import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { login } from '../../utils/network';
import { setAccessToken, setRefreshToken, setToken, getUserFromToken } from '../../utils/auth';
import { logger } from '../../utils/logger';
import { APP_NAME } from '../../assets/Constants';
import './Login.scss';
import jhhLogoImage from '../../assets/images/logo.png'

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login: setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      logger.auth('Login attempt', { email });
      const data = await login(email, password);
      
      logger.auth('Login response received');
      
      // Store all tokens properly
      if (data.access_token) {
        setAccessToken(data.access_token);
        setToken(data.access_token); // For backward compatibility
        logger.auth('Access token stored');
      }
      
      if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
        logger.auth('Refresh token stored');
      }
      
      // Extract user information from token
      const tokenUserData = getUserFromToken(data.access_token);
      
      // Store user data with tokens and user info from token
      const userData = { 
        email,
        userName: tokenUserData?.userName,
        userId: tokenUserData?.userId,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        ...data 
      };
      
      logger.debug('User data prepared for storage', { 
        email: userData.email, 
        userName: userData.userName,
        userId: userData.userId 
      });
      
      setUser(userData);
      logger.success('User logged in successfully');
      navigate('/');
    } catch (err) {
      logger.error('Login error', err.message);
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`login-container ${isLoading ? 'login-loading' : ''}`}>
      {/* Left Section - Healthcare Branding */}
      <div className="left-section">
        <div className="branding">
          <img src={jhhLogoImage} alt="JHH Analytics Logo" className="brand-logo"/>
          <h1 className="brand-title">{APP_NAME}</h1>
          <p className="brand-subtitle">
            Streamline your healthcare workforce management with intelligent cost tracking and analytics
          </p>
        </div>
        <div className="features">
          <div className="feature-item">
            <div className="feature-icon">📊</div>
            <span className="feature-text">Advanced Analytics</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">👥</div>
            <span className="feature-text">Team Management</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">💰</div>
            <span className="feature-text">Cost Optimization</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔒</div>
            <span className="feature-text">Secure & Compliant</span>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="right-section">
        <div className="login-form-container">
          <div className="login-header">
            <div className="login-icon">
              <span>🔐</span>
            </div>
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {errorMsg && (
              <div className="error-message">
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`form-input ${errorMsg ? 'error' : ''}`}
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input ${errorMsg ? 'error' : ''}`}
                required
                disabled={isLoading}
              />
            </div>

            <div className="forgot-password">
              <a href="#forgot">Forgot your password?</a>
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>

            <div className="signup-link">
              Don't have an account? <Link to="/signup">Sign up here</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
