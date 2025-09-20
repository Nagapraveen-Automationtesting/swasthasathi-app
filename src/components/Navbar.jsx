import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import jhhLogoImage from '../assets/images/logo.png';
import './Navbar.scss';

export default function Navbar() {
  const { user, logout, isLoggingOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const hideNavbar = ['/login', '/signup'].includes(location.pathname);

  if (hideNavbar) return null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoClick = () => {
    navigate('/');
    setIsDropdownOpen(false);
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    // Navigate to profile page (you can implement this later)
    console.log('Navigate to profile');
  };

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <nav className="navbar">
      {/* Left side - Logo */}
      <div className="navbar-left">
        <div className="logo-container" onClick={handleLogoClick}>
          <img src={jhhLogoImage} alt="JHH Analytics" className="navbar-logo" />
          <span className="brand-name">JHH Analytics</span>
        </div>
      </div>

      {/* Center - Navigation items (optional) */}
      <div className="navbar-center">
        {/* Add navigation items here if needed */}
      </div>

      {/* Right side - User profile dropdown */}
      <div className="navbar-right">
        <div className="user-profile-container" ref={dropdownRef}>
          <button 
            className={`user-profile-btn ${isDropdownOpen ? 'active' : ''}`}
            onClick={toggleDropdown}
            disabled={isLoggingOut}
          >
            <div className="user-avatar">
              {getUserInitials()}
            </div>
            {/* <div className="user-info">
              <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
              <span className="user-role">Administrator</span>
            </div> */}
            <div className={`dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`}>
              ▼
            </div>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <div className="user-avatar-large">
                  {getUserInitials()}
                </div>
                <div className="user-details">
                  <div className="user-name-large">{user?.email?.split('@')[0] || 'User'}</div>
                  <div className="user-email">{user?.email}</div>
                </div>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-items">
                <button className="dropdown-item" onClick={handleProfileClick}>
                  <span className="dropdown-icon">👤</span>
                  <span>My Profile</span>
                </button>
                
                <button className="dropdown-item" onClick={() => {setIsDropdownOpen(false); navigate('/reports');}}>
                  <span className="dropdown-icon">📊</span>
                  <span>Reports</span>
                </button>
                
                <button className="dropdown-item">
                  <span className="dropdown-icon">⚙️</span>
                  <span>Settings</span>
                </button>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-items">
                <button 
                  className="dropdown-item logout-item" 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <span className="dropdown-icon">
                    {isLoggingOut ? '🔄' : '🚪'}
                  </span>
                  <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

