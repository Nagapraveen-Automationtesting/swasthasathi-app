import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/auth';
import { signup } from '../../utils/network';
import './Signup.scss';

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form data
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    
    // Health Profile
    height: '',
    weight: '',
    bloodType: '',
    allergies: '',
    medications: '',
    medicalConditions: [],
    diabetics: '', // Yes/No/Pre-diabetic
    bp: '', // Blood pressure reading
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    
    // Account Setup
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
    allowNotifications: true
  });

  const [passwordStrength, setPasswordStrength] = useState('');

  const steps = [
    { id: 1, label: 'Personal Info', icon: '👤' },
    { id: 2, label: 'Health Profile', icon: '🏥' },
    { id: 3, label: 'Account Setup', icon: '🔐' }
  ];

  const medicalConditions = [
    'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease',
    'Arthritis', 'Cancer History', 'Mental Health', 'Kidney Disease',
    'Liver Disease', 'Thyroid Issues', 'Osteoporosis', 'None of the above'
  ];

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
  const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
  const relations = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other'];
  const diabeticsOptions = ['No', 'Yes', 'Pre-diabetic', 'Type 1', 'Type 2', 'Gestational'];

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Update password strength
    if (field === 'password') {
      updatePasswordStrength(value);
    }
  };

  // Handle medical conditions
  const handleConditionChange = (condition) => {
    const isSelected = formData.medicalConditions.includes(condition);
    
    if (condition === 'None of the above') {
      setFormData(prev => ({
        ...prev,
        medicalConditions: isSelected ? [] : ['None of the above']
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        medicalConditions: isSelected
          ? prev.medicalConditions.filter(c => c !== condition && c !== 'None of the above')
          : [...prev.medicalConditions.filter(c => c !== 'None of the above'), condition]
      }));
    }
  };

  // Password strength calculator
  const updatePasswordStrength = (password) => {
    let strength = 0;
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    Object.values(requirements).forEach(met => met && strength++);

    if (strength <= 2) setPasswordStrength('weak');
    else if (strength === 3) setPasswordStrength('fair');
    else if (strength === 4) setPasswordStrength('good');
    else setPasswordStrength('strong');
  };

  // Validation functions
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!validateEmail(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
    }

    if (step === 2) {
      if (!formData.emergencyContactName.trim()) newErrors.emergencyContactName = 'Emergency contact name is required';
      if (!formData.emergencyContactPhone.trim()) newErrors.emergencyContactPhone = 'Emergency contact phone is required';
      if (!formData.emergencyContactRelation) newErrors.emergencyContactRelation = 'Emergency contact relation is required';
    }

    if (step === 3) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms and conditions';
      if (!formData.agreeToPrivacy) newErrors.agreeToPrivacy = 'You must agree to the privacy policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;

    setIsLoading(true);
    
    try {
      // ✅ ACTUAL API CALL TO CREATE ACCOUNT WITH FULL HEALTH PROFILE
      const result = await signup(formData);
      
      // If signup successful, auto-login the user
      if (result) {
        // Extract access token if provided
        const accessToken = result.access_token || result.token;
        
        if (accessToken) {
          // Use the login function from AuthContext with the token
          await login({ email: formData.email }, accessToken);
          
          // Show success first, then navigate
          setShowSuccess(true);
          
          // Navigate to home after a short delay to show success message
          setTimeout(() => {
            navigate('/');
          }, 3000);
        } else {
          // No token returned, just show success screen for email verification
          setShowSuccess(true);
        }
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        submit: error.message || 'Failed to create account. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Floating icons effect
  const floatingIcons = ['🏥', '💊', '❤️', '🔬', '📊', '🩺'];

  // Password requirements check
  const getPasswordRequirements = () => {
    const password = formData.password;
    return [
      { text: 'At least 8 characters', met: password.length >= 8 },
      { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { text: 'One lowercase letter', met: /[a-z]/.test(password) },
      { text: 'One number', met: /\d/.test(password) },
      { text: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) }
    ];
  };

  if (showSuccess) {
    return (
      <div className="signup-container">
        <div className="signup-content">
          <div className="signup-card">
            <div className="success-screen">
              <div className="success-icon">🎉</div>
              <h2 className="success-title">Welcome to JHH Analytics!</h2>
              <p className="success-message">
                Your account has been created successfully. We've sent a verification email to{' '}
                <strong>{formData.email}</strong>. Please check your inbox and verify your account.
              </p>
              <div className="success-actions">
                <Link to="/login" className="btn btn-primary">
                  Sign In Now
                </Link>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowSuccess(false)}
                >
                  Back to Form
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-container">
      {/* Floating Elements */}
      <div className="floating-elements">
        {floatingIcons.map((icon, index) => (
          <div key={index} className="floating-icon">{icon}</div>
        ))}
      </div>

      <div className="signup-content">
        <div className="signup-card">
          {/* Left Side - Branding */}
          <div className="signup-left">
            <div className="brand-content">
              <div className="welcome-badge">
                🚀 Join the Future of Healthcare
              </div>
              
              <h1 className="brand-title">JHH Analytics</h1>
              <p className="brand-subtitle">
                Create your personal health profile and unlock AI-powered insights 
                for better healthcare management.
              </p>
              
              <div className="health-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">🤖</span>
                  <span className="benefit-text">AI-Powered Health Analysis</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">📊</span>
                  <span className="benefit-text">Personalized Health Reports</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">👨‍⚕️</span>
                  <span className="benefit-text">Expert Doctor Network</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">🔒</span>
                  <span className="benefit-text">Secure & Private</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">📱</span>
                  <span className="benefit-text">24/7 Health Monitoring</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="signup-right">
            {/* Progress Indicator */}
            <div className="progress-container">
              <div className="progress-steps">
                {steps.map((step) => (
                  <div key={step.id} className="step">
                    <div className={`step-icon ${
                      currentStep > step.id ? 'completed' : 
                      currentStep === step.id ? 'active' : 'pending'
                    }`}>
                      {currentStep > step.id ? '✓' : step.icon}
                    </div>
                    <div className={`step-label ${
                      currentStep > step.id ? 'completed' : 
                      currentStep === step.id ? 'active' : ''
                    }`}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form className="signup-form" onSubmit={handleSubmit}>
              {/* Step 1: Personal Information */}
              <div className={`form-step ${currentStep === 1 ? 'active' : ''}`}>
                <div className="form-header">
                  <h2 className="form-title">Personal Information</h2>
                  <p className="form-subtitle">Let's start with some basic information about you</p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      First Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-input ${errors.firstName ? 'error' : ''}`}
                      placeholder="Enter your first name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                    />
                    {errors.firstName && <div className="form-error">{errors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Last Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-input ${errors.lastName ? 'error' : ''}`}
                      placeholder="Enter your last name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                    />
                    {errors.lastName && <div className="form-error">{errors.lastName}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email Address <span className="required">*</span>
                  </label>
                  <div className="input-icon">
                    <input
                      type="email"
                      className={`form-input ${errors.email ? 'error' : ''}`}
                      placeholder="Enter your email address"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                    <span className="icon">📧</span>
                  </div>
                  {errors.email && <div className="form-error">{errors.email}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Phone Number <span className="required">*</span>
                    </label>
                    <div className="input-icon">
                      <input
                        type="tel"
                        className={`form-input ${errors.phone ? 'error' : ''}`}
                        placeholder="Enter your phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                      <span className="icon">📱</span>
                    </div>
                    {errors.phone && <div className="form-error">{errors.phone}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Date of Birth <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                    {errors.dateOfBirth && <div className="form-error">{errors.dateOfBirth}</div>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Gender <span className="required">*</span>
                  </label>
                  <select
                    className={`form-select ${errors.gender ? 'error' : ''}`}
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Select your gender</option>
                    {genders.map(gender => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                  {errors.gender && <div className="form-error">{errors.gender}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
              </div>

              {/* Step 2: Health Profile */}
              <div className={`form-step ${currentStep === 2 ? 'active' : ''}`}>
                <div className="form-header">
                  <h2 className="form-title">Health Profile</h2>
                  <p className="form-subtitle">Help us understand your health better (optional)</p>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Height (cm)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g., 175"
                      value={formData.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (kg)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g., 70"
                      value={formData.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Type</label>
                    <select
                      className="form-select"
                      value={formData.bloodType}
                      onChange={(e) => handleInputChange('bloodType', e.target.value)}
                    >
                      <option value="">Select blood type</option>
                      {bloodTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Diabetics Status</label>
                    <select
                      className="form-select"
                      value={formData.diabetics}
                      onChange={(e) => handleInputChange('diabetics', e.target.value)}
                    >
                      <option value="">Select diabetes status</option>
                      {diabeticsOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Pressure</label>
                    <div className="input-icon">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., 120/80"
                        value={formData.bp}
                        onChange={(e) => handleInputChange('bp', e.target.value)}
                      />
                      <span className="icon">🩺</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Known Allergies</label>
                  <textarea
                    className="form-textarea"
                    placeholder="List any known allergies (food, medication, environmental, etc.)"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current Medications</label>
                  <textarea
                    className="form-textarea"
                    placeholder="List any medications you're currently taking"
                    value={formData.medications}
                    onChange={(e) => handleInputChange('medications', e.target.value)}
                  />
                </div>

                <div className="form-group health-conditions">
                  <label className="form-label">Medical Conditions</label>
                  <div className="condition-grid">
                    {medicalConditions.map(condition => (
                      <div
                        key={condition}
                        className={`condition-checkbox ${
                          formData.medicalConditions.includes(condition) ? 'selected' : ''
                        }`}
                        onClick={() => handleConditionChange(condition)}
                      >
                        <input
                          type="checkbox"
                          checked={formData.medicalConditions.includes(condition)}
                          onChange={() => {}} // Handled by onClick
                        />
                        <span className="condition-label">{condition}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                  <h3 className="form-title" style={{ fontSize: '1.2rem' }}>Emergency Contact</h3>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Emergency Contact Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.emergencyContactName ? 'error' : ''}`}
                    placeholder="Full name of emergency contact"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                  />
                  {errors.emergencyContactName && <div className="form-error">{errors.emergencyContactName}</div>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      Emergency Contact Phone <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      className={`form-input ${errors.emergencyContactPhone ? 'error' : ''}`}
                      placeholder="Phone number"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    />
                    {errors.emergencyContactPhone && <div className="form-error">{errors.emergencyContactPhone}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Relationship <span className="required">*</span>
                    </label>
                    <select
                      className={`form-select ${errors.emergencyContactRelation ? 'error' : ''}`}
                      value={formData.emergencyContactRelation}
                      onChange={(e) => handleInputChange('emergencyContactRelation', e.target.value)}
                    >
                      <option value="">Select relationship</option>
                      {relations.map(relation => (
                        <option key={relation} value={relation}>{relation}</option>
                      ))}
                    </select>
                    {errors.emergencyContactRelation && <div className="form-error">{errors.emergencyContactRelation}</div>}
                  </div>
                </div>
              </div>

              {/* Step 3: Account Setup */}
              <div className={`form-step ${currentStep === 3 ? 'active' : ''}`}>
                <div className="form-header">
                  <h2 className="form-title">Account Setup</h2>
                  <p className="form-subtitle">Create a secure password and review our policies</p>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="input-icon">
                    <input
                      type="password"
                      className={`form-input ${errors.password ? 'error' : ''}`}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                    />
                    <span className="icon">🔒</span>
                  </div>
                  {errors.password && <div className="form-error">{errors.password}</div>}
                  
                  {formData.password && (
                    <div className="password-strength">
                      <div className="strength-bar">
                        <div className={`strength-fill ${passwordStrength}`}></div>
                      </div>
                      <div className={`strength-text ${passwordStrength}`}>
                        Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                      </div>
                      <div className="strength-requirements">
                        {getPasswordRequirements().map((req, index) => (
                          <div key={index} className={`requirement ${req.met ? 'met' : ''}`}>
                            {req.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <div className="input-icon">
                    <input
                      type="password"
                      className={`form-input ${errors.confirmPassword ? 'error' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'success' : ''}`}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    />
                    <span className="icon">🔒</span>
                  </div>
                  {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <div className="form-success">Passwords match!</div>
                  )}
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        style={{ marginRight: '0.5rem', accentColor: '#2563eb' }}
                        checked={formData.agreeToTerms}
                        onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                      />
                      I agree to the <a href="#" style={{ color: '#2563eb' }}>Terms and Conditions</a> <span className="required">*</span>
                    </label>
                    {errors.agreeToTerms && <div className="form-error">{errors.agreeToTerms}</div>}
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        style={{ marginRight: '0.5rem', accentColor: '#2563eb' }}
                        checked={formData.agreeToPrivacy}
                        onChange={(e) => handleInputChange('agreeToPrivacy', e.target.checked)}
                      />
                      I agree to the <a href="#" style={{ color: '#2563eb' }}>Privacy Policy</a> <span className="required">*</span>
                    </label>
                    {errors.agreeToPrivacy && <div className="form-error">{errors.agreeToPrivacy}</div>}
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        style={{ marginRight: '0.5rem', accentColor: '#2563eb' }}
                        checked={formData.allowNotifications}
                        onChange={(e) => handleInputChange('allowNotifications', e.target.checked)}
                      />
                      I would like to receive health tips and updates
                    </label>
                  </div>
                </div>

                {errors.submit && (
                  <div className="form-error" style={{ textAlign: 'center', marginTop: '1rem' }}>
                    {errors.submit}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                {currentStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={prevStep}
                    disabled={isLoading}
                  >
                    Previous
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={nextStep}
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={isLoading || !formData.agreeToTerms || !formData.agreeToPrivacy}
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                )}
              </div>
            </form>

            <div className="login-link">
              Already have an account? <Link to="/login">Sign in here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
