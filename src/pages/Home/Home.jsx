import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import { uploadFileViaBackend } from '../../utils/network';
import { validateFile } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';
import './Home.scss';

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  
  // File upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'uploading', 'success', 'error', ''
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const getUserInitials = (user) => {
    if (user?.userName) {
      return user.userName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const tabs = [
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'healthcheck', label: 'Self Health Check', icon: '🏥' },
    { id: 'doctors', label: 'Doctors', icon: '👨‍⚕️' },
    { id: 'medicines', label: 'Medicines', icon: '💊' },
    { id: 'diagnostics', label: 'Diagnostics', icon: '🔬' },
    { id: 'healthfeed', label: 'Health Feed', icon: '📱' }
  ];

  // File upload handlers
  const handleFileSelect = (file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadStatus('error');
      setUploadMessage(validation.errors.join('. '));
      return;
    }
    
    setUploadFile(file);
    setUploadStatus('');
    setUploadMessage('');
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadStatus('error');
      setUploadMessage('Please select a file first');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('Preparing upload...');

    try {
      logger.upload('Starting file upload via backend service', { filename: uploadFile.name });
      const result = await uploadFileViaBackend(uploadFile, (progress) => {
        setUploadProgress(progress);
        setUploadMessage(`Uploading... ${Math.round(progress)}%`);
      });

      setUploadStatus('success');
      setUploadMessage(`✅ ${result.message} (${result.fileSize})`);
      setUploadFile(null);
      setUploadProgress(100);
      
      logger.success('File upload completed successfully');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      logger.error('File upload via backend service failed', error.message);
      setUploadStatus('error');
      setUploadMessage(`❌ Upload failed: ${error.message}`);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setUploadMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reports':
        return (
          <div className="tab-content-grid">
            {/* File Upload Card */}
            <div className="content-card upload-card">
              <div className="card-header">
                <div className="card-icon reports">📤</div>
                <div>
                  <div className="card-title">Upload Health Documents</div>
                  <div className="card-subtitle">PDF, JPEG, PNG up to 3MB</div>
                </div>
              </div>
              
              <div className="upload-section">
                {/* Drag & Drop Area */}
                <div 
                  className={`upload-dropzone ${isDragActive ? 'drag-active' : ''} ${uploadFile ? 'has-file' : ''}`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpeg,.jpg,.png"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                  
                  <div className="upload-content">
                    {uploadFile ? (
                      <div className="file-preview">
                        <div className="file-icon">
                          {uploadFile.type.includes('pdf') ? '📄' : '🖼️'}
                        </div>
                        <div className="file-info">
                          <div className="file-name">{uploadFile.name}</div>
                          <div className="file-size">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                        </div>
                        <button 
                          className="remove-file"
                          onClick={(e) => {
                            e.stopPropagation();
                            resetUpload();
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <div className="upload-icon">📁</div>
                        <div className="upload-text">
                          <div className="primary-text">
                            {isDragActive ? 'Drop your file here' : 'Click to upload or drag & drop'}
                          </div>
                          <div className="secondary-text">
                            PDF, JPEG, PNG files up to 3MB
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Progress */}
                {uploadStatus === 'uploading' && (
                  <div className="upload-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <div className="progress-text">{uploadMessage}</div>
                  </div>
                )}

                {/* Upload Status Messages */}
                {uploadMessage && uploadStatus !== 'uploading' && (
                  <div className={`upload-message ${uploadStatus}`}>
                    {uploadMessage}
                  </div>
                )}

                {/* Upload Actions */}
                <div className="upload-actions">
                  {uploadFile && uploadStatus !== 'uploading' && (
                    <button 
                      className="upload-button"
                      onClick={handleUpload}
                      disabled={uploadStatus === 'uploading'}
                    >
                      {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Document'}
                    </button>
                  )}
                  
                  {(uploadFile || uploadMessage) && uploadStatus !== 'uploading' && (
                    <button 
                      className="reset-button"
                      onClick={resetUpload}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <div className="card-icon reports">📊</div>
                <div>
                  <div className="card-title">Health Analytics</div>
                  <div className="card-subtitle">AI-powered insights</div>
                </div>
              </div>
              <div className="card-content">
                View comprehensive health reports generated by our advanced AI models, tracking your vital signs, symptoms, and health trends over time.
              </div>
              <div className="card-action">
                <Link to="/reports">
                  <button className="action-button">View Reports</button>
                </Link>
              </div>
            </div>
            

          </div>
        );

      case 'healthcheck':
        return (
          <div className="tab-content-grid">
            <div className="content-card">
              <div className="card-header">
                <div className="card-icon health">🏥</div>
                <div>
                  <div className="card-title">Quick Health Assessment</div>
                  <div className="card-subtitle">AI-powered evaluation</div>
                </div>
              </div>
              <div className="card-content">
                Take a comprehensive self-assessment using our AI model that analyzes your symptoms and provides initial health insights.
              </div>
              <div className="card-action">
                <button className="action-button">Start Assessment</button>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <div className="card-icon health">❤️</div>
                <div>
                  <div className="card-title">Vital Signs Monitoring</div>
                  <div className="card-subtitle">Real-time tracking</div>
                </div>
              </div>
              <div className="card-content">
                Monitor your heart rate, blood pressure, temperature, and other vital signs with our integrated health monitoring tools.
              </div>
              <div className="card-action">
                <button className="action-button">Check Vitals</button>
              </div>
            </div>
          </div>
        );

      case 'doctors':
        return (
          <div className="tab-content-grid">
            <div className="content-card">
              <div className="card-header">
                <div className="card-icon doctors">👨‍⚕️</div>
                <div>
                  <div className="card-title">Find Specialists</div>
                  <div className="card-subtitle">AI-matched recommendations</div>
                </div>
              </div>
              <div className="card-content">
                Connect with healthcare professionals matched to your specific needs using our AI-powered recommendation system.
              </div>
              <div className="card-action">
                <button className="action-button">Find Doctors</button>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <div className="card-icon doctors">📅</div>
                <div>
                  <div className="card-title">Appointment Scheduling</div>
                  <div className="card-subtitle">Smart scheduling</div>
                </div>
              </div>
              <div className="card-content">
                Book appointments with healthcare providers, manage your medical calendar, and receive automated reminders.
              </div>
              <div className="card-action">
                <button className="action-button">Schedule Visit</button>
              </div>
            </div>
          </div>
        );

      case 'medicines':
        return (
          <div className="tab-content-grid">
            <div className="content-card">
              <div className="card-header">
                <div className="card-icon medicines">💊</div>
                <div>
                  <div className="card-title">Medication Tracker</div>
                  <div className="card-subtitle">Smart reminders</div>
                </div>
              </div>
              <div className="card-content">
                Manage your medications with AI-powered reminders, drug interaction checks, and dosage optimization suggestions.
              </div>
              <div className="card-action">
                <button className="action-button">Manage Meds</button>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <div className="card-icon medicines">🔍</div>
                <div>
                  <div className="card-title">Drug Information</div>
                  <div className="card-subtitle">Comprehensive database</div>
                </div>
              </div>
              <div className="card-content">
                Access detailed information about medications, including side effects, interactions, and personalized recommendations.
              </div>
              <div className="card-action">
                <button className="action-button">Search Drugs</button>
              </div>
            </div>
          </div>
        );

      case 'diagnostics':
        return (
          <div className="tab-content-grid">
            <div className="content-card">
              <div className="card-header">
                <div className="card-icon diagnostics">🔬</div>
                <div>
                  <div className="card-title">Lab Results Analysis</div>
                  <div className="card-subtitle">AI interpretation</div>
                </div>
              </div>
              <div className="card-content">
                Upload and analyze your lab results with our AI system that provides easy-to-understand explanations and trend analysis.
              </div>
              <div className="card-action">
                <button className="action-button">Upload Results</button>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <div className="card-icon diagnostics">🎯</div>
                <div>
                  <div className="card-title">Diagnostic Tools</div>
                  <div className="card-subtitle">Advanced analysis</div>
                </div>
              </div>
              <div className="card-content">
                Access AI-powered diagnostic tools for symptom analysis, risk assessment, and personalized health recommendations.
              </div>
              <div className="card-action">
                <button className="action-button">Start Diagnosis</button>
              </div>
            </div>
          </div>
        );

      case 'healthfeed':
        return (
          <div className="tab-content-grid">
            <div className="content-card">
              <div className="card-header">
                <div className="card-icon feed">📱</div>
                <div>
                  <div className="card-title">Personalized Health News</div>
                  <div className="card-subtitle">Curated content</div>
                </div>
              </div>
              <div className="card-content">
                Stay updated with health news, research findings, and tips personalized to your health profile and interests.
              </div>
              <div className="card-action">
                <button className="action-button">View Feed</button>
              </div>
            </div>

            <div className="content-card">
              <div className="card-header">
                <div className="card-icon feed">💡</div>
                <div>
                  <div className="card-title">Health Tips & Insights</div>
                  <div className="card-subtitle">AI recommendations</div>
                </div>
              </div>
              <div className="card-content">
                Receive personalized health tips, wellness suggestions, and lifestyle recommendations based on your health data.
              </div>
              <div className="card-action">
                <button className="action-button">Get Tips</button>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🤖</span>
            AI-Powered Healthcare Platform
          </div>
          
          <h1 className="hero-title">
            Your Digital Health <span className="highlight">Companion</span>
          </h1>
          
          <p className="hero-subtitle">
            Revolutionizing healthcare with advanced AI model analysis. Track your health, 
            gain personalized insights, and make informed decisions about your wellness journey 
            with our comprehensive digital health platform.
          </p>

          <div className="hero-features">
            <div className="feature-item">
              <span className="feature-icon">🧠</span>
              <span className="feature-text">AI Health Analysis</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span className="feature-text">Smart Insights</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span className="feature-text">Secure & Private</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <main className="dashboard-content">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-header">
            <div className="welcome-text">
              <h2>Welcome back, {user?.userName || user?.email || 'User'}!</h2>
              <p>Here's your personalized health dashboard with AI-powered insights</p>
            </div>
            <div className="user-avatar">
              {getUserInitials(user)}
            </div>
          </div>

          <div className="health-summary">
            <div className="summary-card">
              <div className="summary-icon">❤️</div>
              <div className="summary-label">Health Score</div>
              <div className="summary-value">85%</div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">📈</div>
              <div className="summary-label">Trend</div>
              <div className="summary-value">Improving</div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">🎯</div>
              <div className="summary-label">Goals Met</div>
              <div className="summary-value">7/10</div>
            </div>
            <div className="summary-card">
              <div className="summary-icon">⚡</div>
              <div className="summary-label">AI Insights</div>
              <div className="summary-value">3 New</div>
            </div>
          </div>
        </section>

        {/* Health Features Tabs */}
        <section className="health-tabs">
          <div className="tabs-header">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span>{tab.label}</span>
            </button>
            ))}
          </div>

          <div className="tab-content">
            <div className={`tab-panel ${activeTab ? 'active' : ''}`}>
              {renderTabContent()}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
