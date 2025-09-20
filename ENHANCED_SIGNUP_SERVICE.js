// 🚀 Enhanced Signup Service - Full Health Profile Support
// This shows how to modify the signup service to handle comprehensive data

import { BASE_URL } from '../assets/Constants';
import { handleResponse } from './network';

// ✅ ENHANCED VERSION - Accepts full form data object
export const enhancedSignup = async (userData) => {
  const formData = new FormData();
  
  // 🔐 Account credentials
  formData.append('email', userData.email);
  formData.append('password', userData.password);
  
  // 👤 Personal information
  formData.append('firstName', userData.firstName || '');
  formData.append('lastName', userData.lastName || '');
  formData.append('phone', userData.phone || '');
  formData.append('dateOfBirth', userData.dateOfBirth || '');
  formData.append('gender', userData.gender || '');
  
  // 🏥 Health profile
  formData.append('height', userData.height || '');
  formData.append('weight', userData.weight || '');
  formData.append('bloodType', userData.bloodType || '');
  formData.append('allergies', userData.allergies || '');
  formData.append('medications', userData.medications || '');
  
  // 📋 Medical conditions (array to JSON string)
  if (userData.medicalConditions && userData.medicalConditions.length > 0) {
    formData.append('medicalConditions', JSON.stringify(userData.medicalConditions));
  }
  
  // 🚨 Emergency contact
  formData.append('emergencyContactName', userData.emergencyContactName || '');
  formData.append('emergencyContactPhone', userData.emergencyContactPhone || '');
  formData.append('emergencyContactRelation', userData.emergencyContactRelation || '');
  
  // ⚙️ User preferences
  formData.append('allowNotifications', userData.allowNotifications || false);
  formData.append('agreeToTerms', userData.agreeToTerms || false);
  formData.append('agreeToPrivacy', userData.agreeToPrivacy || false);
  
  // 📊 Metadata
  formData.append('registrationSource', 'web_app');
  formData.append('timestamp', new Date().toISOString());
  formData.append('browserInfo', navigator.userAgent);

  console.log('📤 Sending comprehensive signup payload:');
  console.log('Email:', userData.email);
  console.log('Name:', `${userData.firstName} ${userData.lastName}`);
  console.log('Health conditions:', userData.medicalConditions);
  console.log('Emergency contact:', userData.emergencyContactName);

  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    body: formData,
  });

  return handleResponse(res);
};

// Alternative: JSON payload version
export const enhancedSignupJSON = async (userData) => {
  const payload = {
    // Account
    email: userData.email,
    password: userData.password,
    
    // Personal info
    personalInfo: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      gender: userData.gender
    },
    
    // Health profile
    healthProfile: {
      physicalMetrics: {
        height: userData.height,
        weight: userData.weight,
        bloodType: userData.bloodType
      },
      medicalHistory: {
        allergies: userData.allergies,
        medications: userData.medications,
        conditions: userData.medicalConditions || []
      }
    },
    
    // Emergency contact
    emergencyContact: {
      name: userData.emergencyContactName,
      phone: userData.emergencyContactPhone,
      relationship: userData.emergencyContactRelation
    },
    
    // Preferences
    preferences: {
      allowNotifications: userData.allowNotifications,
      agreeToTerms: userData.agreeToTerms,
      agreeToPrivacy: userData.agreeToPrivacy
    },
    
    // Metadata
    metadata: {
      registrationSource: 'web_app',
      timestamp: new Date().toISOString(),
      browserInfo: navigator.userAgent
    }
  };

  console.log('📤 Sending JSON signup payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
};

// 📝 Usage examples:

/*
// In Signup.jsx handleSubmit:
const result = await enhancedSignup(formData);

// Or with JSON:
const result = await enhancedSignupJSON(formData);

// Sample formData object:
const sampleFormData = {
  email: 'john.doe@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-123-4567',
  dateOfBirth: '1985-03-15',
  gender: 'Male',
  height: '175',
  weight: '70',
  bloodType: 'O+',
  allergies: 'Penicillin, Shellfish',
  medications: 'Lisinopril 10mg daily',
  medicalConditions: ['Hypertension', 'Diabetes'],
  emergencyContactName: 'Jane Doe',
  emergencyContactPhone: '+1-555-987-6543', 
  emergencyContactRelation: 'Spouse',
  allowNotifications: true,
  agreeToTerms: true,
  agreeToPrivacy: true
};
*/




