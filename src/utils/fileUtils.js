// File utility functions with configurable validation
import { MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES } from '../assets/Constants';
import { logger } from './logger';

/**
 * Validates file based on configured constraints
 * @param {File} file - The file to validate
 * @returns {Object} Validation result with valid flag and errors array
 */
export const validateFile = (file) => {
  const errors = [];
  
  logger.debug('Validating file:', { name: file?.name, size: file?.size, type: file?.type });
  
  // Check if file exists
  if (!file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  // Get file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
    errors.push(`File type not supported. Please upload ${ALLOWED_FILE_TYPES.join(', ').toUpperCase()} files only.`);
  }
  
  // Validate file size
  const maxSizeBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`File size too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
  }
  
  // Validate file name length
  if (file.name.length > 255) {
    errors.push('File name is too long. Please use a shorter file name.');
  }
  
  const isValid = errors.length === 0;
  logger.debug('File validation result:', { valid: isValid, errors });
  
  return {
    valid: isValid,
    errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: fileExtension,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    }
  };
};

/**
 * Gets file category based on extension
 * @param {File} file - The file to categorize
 * @returns {string} File category
 */
export const getFileCategory = (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'document';
  if (['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) return 'image';
  return 'unknown';
};

/**
 * Gets file icon based on extension
 * @param {string} fileName - The file name
 * @returns {string} Emoji icon for the file type
 */
export const getFileIcon = (fileName) => {
  const extension = fileName?.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'pdf':
      return '📄';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
      return '🖼️';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📊';
    default:
      return '📁';
  }
};

/**
 * Formats file size in human readable format
 * @param {number|string} size - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (size) => {
  if (!size) return 'Unknown size';
  if (typeof size === 'string' && (size.includes('MB') || size.includes('KB'))) return size;
  
  const sizeNum = parseFloat(size);
  if (isNaN(sizeNum)) return 'Unknown size';
  
  if (sizeNum < 1024) {
    return `${sizeNum} B`;
  } else if (sizeNum < 1024 * 1024) {
    return `${(sizeNum / 1024).toFixed(1)} KB`;
  } else {
    return `${(sizeNum / (1024 * 1024)).toFixed(2)} MB`;
  }
};

/**
 * Formats date in human readable format
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown date';
  }
};

/**
 * Categorizes medical documents based on filename
 * @param {string} fileName - Name of the file
 * @returns {string} Medical document category
 */
export const getMedicalDocumentCategory = (fileName) => {
  const name = fileName.toLowerCase();
  
  if (name.includes('lab') || name.includes('blood') || name.includes('test') || name.includes('result')) {
    return 'lab';
  }
  if (name.includes('prescription') || name.includes('medicine') || name.includes('drug') || name.includes('rx')) {
    return 'prescriptions';
  }
  if (name.includes('xray') || name.includes('scan') || name.includes('mri') || name.includes('ultrasound') || name.includes('ct')) {
    return 'medical-images';
  }
  if (name.includes('ecg') || name.includes('ekg') || name.includes('heart') || name.includes('cardio')) {
    return 'ecg';
  }
  if (name.includes('bill') || name.includes('invoice') || name.includes('payment') || name.includes('receipt')) {
    return 'medical-bills';
  }
  if (name.includes('consultation') || name.includes('visit') || name.includes('appointment') || name.includes('doctor')) {
    return 'consultations';
  }
  if (name.includes('certificate') || name.includes('cert') || name.includes('report')) {
    return 'certificates';
  }
  if (name.includes('id') || name.includes('card') || name.includes('insurance')) {
    return 'health-ids';
  }
  
  return 'all';
};

