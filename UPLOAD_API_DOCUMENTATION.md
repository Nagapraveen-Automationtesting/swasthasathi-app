# File Upload API Documentation

## Overview
The file upload functionality implements a complete workflow with validation, blob storage, and backend confirmation.

## API Endpoints

### 1. Get Presigned URL
**Endpoint:** `POST /upload/generate-upload-url`
**URL:** `http://10.161.194.164/peoplecostdashboard-service/upload/generate-upload-url`

**Request:**
```javascript
FormData:
- filename: string (required)
- content_type: string (optional)
- userId: string (from JWT token)
- userName: string (from JWT token)  
- mobile_no: string (from JWT token)
```

**Response:**
```json
{
  "sas_token": "https://...", // Signed URL for blob upload
  "upload_url": "https://...", // Alternative field name
  "ref_id": "uuid-reference-id", // Upload reference ID
  "expires_at": "2023-12-31T23:59:59Z"
}
```

### 2. Upload Status Confirmation
**Endpoint:** `POST /upload/upload-status`
**URL:** `http://10.161.194.164/peoplecostdashboard-service/upload/upload-status`

**Request:**
```json
{
  "filename": "document.pdf",
  "file_url": "https://storage.blob.core.windows.net/...",
  "status": "completed|failed",
  "upload_timestamp": "2023-12-31T12:00:00.000Z",
  "ref_id": "uuid-reference-id",
  "userId": "user-id-from-jwt",
  "mobile_no": "mobile-number-from-jwt"
}
```

**Response:**
```json
{
  "message": "Upload status recorded successfully",
  "file_id": "uuid-here",
  "status": "confirmed"
}
```

## File Validation Rules

### Supported File Types
- **PDF:** `application/pdf`
- **Images:** `image/jpeg`, `image/jpg`, `image/png`

### File Size Limits
- **Maximum:** 3MB (3,145,728 bytes)
- **Validation:** Client-side and server-side recommended

### File Name Constraints
- **Maximum length:** 255 characters
- **Special characters:** Handled by encoding

## Upload Workflow

### Step 1: Client Validation
```javascript
const validation = validateFile(file);
if (!validation.valid) {
  throw new Error(validation.errors.join('. '));
}
```

### Step 2: Extract JWT User Data & Request Presigned URL
```javascript
// User data is automatically extracted from JWT token
const presignedData = await getPresignedUrl(file.name, file.type);
const signedUrl = presignedData.sas_token || presignedData.upload_url;
const refId = presignedData.ref_id;
const userData = presignedData.userData;
```

### Step 3: Upload to Blob Storage
```javascript
const uploadResult = await uploadToBlob(file, signedUrl, onProgress);
```

### Step 4: Confirm Upload Status with Reference ID
```javascript
await confirmUploadStatus(file.name, uploadResult.url, 'completed', refId, userData);
```

## Error Handling

### Client-Side Errors
- **File type not supported**
- **File size exceeds 3MB**
- **No file selected**
- **File name too long**

### Network Errors
- **Failed to get upload URL**
- **Upload failed with status: {status}**
- **Upload failed due to network error**
- **Failed to confirm upload status**

### Progress Tracking
The upload process provides progress updates:
- **0-10%:** File validation
- **10-20%:** Getting presigned URL
- **20-90%:** Uploading to blob storage
- **90-95%:** Confirming upload status
- **95-100%:** Complete

## JWT Token Integration

### User Data Extraction
The upload system automatically extracts user information from JWT tokens:
- **userId**: From `user_id`, `id`, or `sub` field
- **userName**: From `user_name`, `name`, `username`, or `email` field  
- **mobileNo**: From `mobile_no`, `mobile`, or `phone` field

### JWT Token Structure Expected
```json
{
  "user_id": "12345",
  "user_name": "John Doe",
  "mobile_no": "+1234567890",
  "email": "john@example.com",
  "exp": 1640995200,
  "iat": 1640908800
}
```

## Usage Example

```javascript
import { uploadFileComplete } from './utils/network';

const handleUpload = async (file) => {
  try {
    const result = await uploadFileComplete(file, (progress) => {
      console.log(`Upload progress: ${progress}%`);
    });
    
    console.log('Upload successful:', result);
    // Result contains: success, message, fileUrl, fileName, fileSize, refId
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

## Security Considerations

### File Validation
- Validate file type both by MIME type and extension
- Check file size limits
- Sanitize file names

### Upload Security
- Use signed URLs with expiration
- Implement server-side validation
- Monitor upload activity

### Error Handling
- Don't expose internal server errors
- Log security incidents
- Implement rate limiting

## Testing

### Valid Test Files
- `test.pdf` (< 3MB)
- `image.jpg` (< 3MB)
- `photo.png` (< 3MB)

### Invalid Test Cases
- File > 3MB
- `.txt` or other unsupported formats
- Files with very long names
- Corrupted files

## Backend Requirements

The backend should implement:
1. **Blob storage integration** (Azure/AWS/GCP)
2. **Signed URL generation** with expiration
3. **Upload status tracking** for audit trails
4. **File metadata storage** for future retrieval
5. **Security scanning** for uploaded files
