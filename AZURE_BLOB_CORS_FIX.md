# Azure Blob Storage CORS Configuration Fix

## 🚨 Problem
```
Access to XMLHttpRequest at 'https://blobsynctest.blob.core.windows.net/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## 🎯 Solution: Configure Azure Blob Storage CORS

### Method 1: Azure Portal (GUI)

1. **Navigate to Storage Account**
   - Go to Azure Portal → Storage Accounts
   - Select your storage account (`blobsynctest`)

2. **Configure CORS Settings**
   - In left menu: Settings → Resource sharing (CORS)
   - Click on "Blob service" tab

3. **Add CORS Rules**
   ```
   Allowed origins: http://localhost:5173,http://localhost:3000,https://your-production-domain.com
   Allowed methods: GET,PUT,POST,DELETE,OPTIONS
   Allowed headers: *
   Exposed headers: *
   Max age: 3600
   ```

### Method 2: Azure CLI

```bash
# Configure CORS for development and production
az storage cors add \
    --account-name blobsynctest \
    --services b \
    --methods GET PUT POST DELETE OPTIONS \
    --origins "http://localhost:5173" "http://localhost:3000" "https://your-production-domain.com" \
    --allowed-headers "*" \
    --exposed-headers "*" \
    --max-age 3600
```

### Method 3: Azure Storage SDK (Backend)

```python
from azure.storage.blob import BlobServiceClient

# In your backend service
blob_service_client = BlobServiceClient.from_connection_string(connection_string)

cors_rule = {
    'allowed_origins': [
        'http://localhost:5173',
        'http://localhost:3000', 
        'https://your-production-domain.com'
    ],
    'allowed_methods': ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
    'allowed_headers': ['*'],
    'exposed_headers': ['*'],
    'max_age_in_seconds': 3600
}

blob_service_client.set_service_properties(cors=[cors_rule])
```

## 🎯 Alternative: Backend Proxy Upload (More Secure)

Instead of direct frontend → blob uploads, route through backend:

### Backend Endpoint
```python
@app.post("/upload/direct")
async def upload_file_direct(file: UploadFile):
    # Backend uploads to blob storage
    blob_client = blob_service_client.get_blob_client(
        container="cost-optimization", 
        blob=file.filename
    )
    
    # Upload file content
    blob_client.upload_blob(file.file.read(), overwrite=True)
    
    return {"file_url": blob_client.url, "status": "uploaded"}
```

### Frontend Change
```javascript
// Instead of: presigned URL → direct blob upload
// Use: direct backend upload

export const uploadFileViaBackend = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress(percentComplete);
      }
    });
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    
    xhr.open('POST', `${BASE_URL}upload/direct`);
    xhr.setRequestHeader('Authorization', `Bearer ${getAccessToken()}`);
    xhr.send(formData);
  });
};
```

## 🔧 Quick Development Fix

For immediate testing, temporarily disable CORS in browser:

```bash
# Chrome with disabled security (DEV ONLY!)
google-chrome --disable-web-security --disable-features=VizDisplayCompositor --user-data-dir=/tmp/chrome_dev
```

⚠️ **WARNING**: Only for development testing, never for production!

## ✅ Recommended Approach

1. **Short-term**: Configure Azure Blob CORS for localhost
2. **Production**: Add production domain to CORS rules
3. **Long-term**: Consider backend proxy upload for better security

