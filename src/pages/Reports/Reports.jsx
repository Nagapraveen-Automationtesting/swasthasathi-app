import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  getUserFiles, 
  downloadFileFromBlob, 
  deleteUserFile,
  uploadFileViaBackend,
  getSignedUrl
} from '../../utils/network';
import {validateFile, getFileCategory} from '../../utils/fileUtils';
import { logger } from '../../utils/logger';
import DocumentViewer from '../../components/DocumentViewer';
import './Reports.scss';

export default function Reports() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  
  // File upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(''); // 'uploading', 'success', 'error', ''
  const [uploadMessage, setUploadMessage] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  
  // Medical report categories
  const categories = [
    { id: 'all', name: 'All Reports', icon: '📋', count: 0 },
    { id: 'lab', name: 'Lab Reports', icon: '🧪', count: 0 },
    { id: 'prescriptions', name: 'Prescriptions', icon: '💊', count: 0 },
    { id: 'medical-images', name: 'Medical Images', icon: '🖼️', count: 0 },
    { id: 'ecg', name: 'ECG Reports', icon: '📈', count: 0 },
    { id: 'medical-bills', name: 'Medical Bills', icon: '🧾', count: 0 },
    { id: 'consultations', name: 'Consultations', icon: '👩‍⚕️', count: 0 },
    { id: 'certificates', name: 'Certificate', icon: '📜', count: 0 },
    { id: 'health-ids', name: 'Health IDs', icon: '🆔', count: 0 }
  ];

  const [categoryCounts, setCategoryCounts] = useState(categories);

  // 📁 Fetch user files on component mount
  useEffect(() => {
    fetchUserFiles();
  }, []);

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
      
      // Show success toast
      toast.success(`📤 ${result.message} (${result.fileSize})`);
      logger.success('File upload completed successfully');
      
      // Refresh the file list
      await fetchUserFiles();
      
      setTimeout(() => {
        setShowUploadModal(false);
        resetUploadState();
      }, 2000);

    } catch (error) {
      logger.error('File upload via backend service failed', error.message);
      setUploadStatus('error');
      setUploadMessage(`❌ Upload failed: ${error.message}`);
      setUploadProgress(0);
      
      // Show error toast
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadProgress(0);
    setUploadStatus('');
    setUploadMessage('');
    setIsDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openUploadModal = () => {
    resetUploadState();
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    resetUploadState();
  };

  // 📊 Calculate category counts when files change
  useEffect(() => {
    calculateCategoryCounts();
  }, [files]);

  const fetchUserFiles = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Fetching user documents', { page });
      
      const response = await getUserFiles(page, 100); // Fetch up to 100 documents per page
      
      // Handle different possible response structures
      const userFiles = response.documents || response.files || response.data || response || [];
      const pagination = response.pagination || {};
      
      setFiles(userFiles);
      setCurrentPage(pagination.current_page || page);
      setTotalPages(pagination.total_pages || 1);
      setTotalDocuments(pagination.total_items || userFiles.length);
      
      toast.success(`✅ Loaded ${userFiles.length} documents`);
      logger.success('User documents fetched successfully', { count: userFiles.length });
    } catch (error) {
      logger.error('Failed to fetch documents', error.message);
      setError(error.message);
      toast.error(`Failed to load documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryCounts = () => {
    const counts = { ...categories.reduce((acc, cat) => ({ ...acc, [cat.id]: 0 }), {}) };
    counts.all = files.length;

    files.forEach(file => {
      const fileName = (file.filename || file.file_name || file.name || '').toLowerCase();
      
      // Categorize based on filename or metadata
      if (fileName.includes('lab') || fileName.includes('blood') || fileName.includes('test')) {
        counts.lab++;
      } else if (fileName.includes('prescription') || fileName.includes('medicine') || fileName.includes('drug')) {
        counts.prescriptions++;
      } else if (fileName.includes('xray') || fileName.includes('scan') || fileName.includes('mri') || fileName.includes('ultrasound')) {
        counts['medical-images']++;
      } else if (fileName.includes('ecg') || fileName.includes('ekg') || fileName.includes('heart')) {
        counts.ecg++;
      } else if (fileName.includes('bill') || fileName.includes('invoice') || fileName.includes('payment')) {
        counts['medical-bills']++;
      } else if (fileName.includes('consultation') || fileName.includes('visit') || fileName.includes('appointment')) {
        counts.consultations++;
      } else if (fileName.includes('certificate') || fileName.includes('cert')) {
        counts.certificates++;
      } else if (fileName.includes('id') || fileName.includes('card')) {
        counts['health-ids']++;
      }
    });

    const updatedCategories = categories.map(cat => ({
      ...cat,
      count: counts[cat.id]
    }));

    setCategoryCounts(updatedCategories);
  };

  const getFileTypeFromName = (fileName) => {
    const name = fileName.toLowerCase();
    if (name.includes('lab') || name.includes('blood') || name.includes('test')) return 'Lab Reports';
    if (name.includes('prescription')) return 'Prescriptions';
    if (name.includes('ecg') || name.includes('ekg')) return 'ECG Reports';
    if (name.includes('xray') || name.includes('scan')) return 'Medical Images';
    return 'Lab Reports'; // Default
  };

  const getFilteredFiles = () => {
    let filtered = files;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(file => {
        const fileName = (file.filename || file.file_name || file.name || '').toLowerCase();
        switch (selectedCategory) {
          case 'lab': return fileName.includes('lab') || fileName.includes('blood') || fileName.includes('test');
          case 'prescriptions': return fileName.includes('prescription') || fileName.includes('medicine');
          case 'medical-images': return fileName.includes('xray') || fileName.includes('scan') || fileName.includes('mri');
          case 'ecg': return fileName.includes('ecg') || fileName.includes('ekg') || fileName.includes('heart');
          case 'medical-bills': return fileName.includes('bill') || fileName.includes('invoice');
          case 'consultations': return fileName.includes('consultation') || fileName.includes('visit');
          case 'certificates': return fileName.includes('certificate') || fileName.includes('cert');
          case 'health-ids': return fileName.includes('id') || fileName.includes('card');
          default: return true;
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(file => 
        (file.filename || file.file_name || file.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort files
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.filename || a.file_name || '').localeCompare(b.filename || b.file_name || '');
        case 'size':
          const sizeA = parseFloat((a.file_size || a.size || '0').toString().match(/(\d+\.?\d*)/)?.[1] || 0);
          const sizeB = parseFloat((b.file_size || b.size || '0').toString().match(/(\d+\.?\d*)/)?.[1] || 0);
          return sizeB - sizeA;
        case 'date':
        default:
          const dateA = new Date(a.upload_timestamp || a.created_at || 0);
          const dateB = new Date(b.upload_timestamp || b.created_at || 0);
          return dateB - dateA;
      }
    });

    return filtered;
  };

  const handleViewFile = async (file) => {
    try {
      logger.info('Viewing document', { filename: file.filename || file.file_name });
      
      // Get document ID from different possible fields
      const documentId = file.document_id || file.file_id || file.id || file.ref_id;
      
      if (!documentId) {
        throw new Error('No document ID available for viewing');
      }

      // Get the original file URL
      const originalFileUrl = file.file_url || file.url || file.document_url || file.blob_url;
      
      if (!originalFileUrl) {
        throw new Error('No file URL available for viewing');
      }

      logger.debug('Original file URL', { url: originalFileUrl });

      // Extract blob path from the file URL
      let blobPath = originalFileUrl;
      
      // If it's a full Azure blob URL, extract the path after the container
      if (originalFileUrl.includes('.blob.core.windows.net/')) {
        try {
          const urlParts = originalFileUrl.split('/');
          const containerIndex = urlParts.findIndex(part => part.includes('.blob.core.windows.net'));
          if (containerIndex !== -1 && urlParts.length > containerIndex + 2) {
            // Extract path after container name, remove query parameters
            blobPath = urlParts.slice(containerIndex + 2).join('/').split('?')[0];
            logger.debug('Extracted blob path from Azure URL', { blobPath });
          }
        } catch (extractError) {
          logger.warn('Failed to extract blob path, using original URL', extractError.message);
          blobPath = originalFileUrl;
        }
      }

      // Get signed URL for secure viewing
      logger.info('Requesting signed URL for document viewing', { blobPath });
      
      try {
        const signedUrlData = await getSignedUrl(blobPath);
        logger.success('Signed URL received for document viewing');
        
        // Set selected document with signed URL
        setSelectedDocument({
          id: documentId,
          name: file.filename || file.file_name || file.name || 'Unnamed Document',
          file_url: signedUrlData.signedUrl, // Use signed URL instead of original URL
          signed_url: signedUrlData.signedUrl,
          expires_in: signedUrlData.expiresIn,
          original_url: originalFileUrl,
          blob_path: blobPath,
          ...file
        });
        
        setShowDocumentViewer(true);
        toast.success('📄 Document loaded successfully');
        
      } catch (signedUrlError) {
        logger.error('Failed to get signed URL, trying original URL', signedUrlError.message);
        
        // Fallback to original URL if signed URL fails
        setSelectedDocument({
          id: documentId,
          name: file.filename || file.file_name || file.name || 'Unnamed Document',
          file_url: originalFileUrl,
          original_url: originalFileUrl,
          blob_path: blobPath,
          fallback: true,
          ...file
        });
        
        setShowDocumentViewer(true);
        toast.warn('📄 Document loaded with fallback URL - some features may be limited');
      }
      
    } catch (error) {
      logger.error('Failed to view document', error.message);
      toast.error(`Failed to view document: ${error.message}`);
    }
  };

  const handleCloseViewer = () => {
    setShowDocumentViewer(false);
    setSelectedDocument(null);
  };

  const handleDownloadFile = async (file) => {
    try {
      logger.info('Downloading file', { filename: file.filename || file.file_name });
      
      const fileUrl = file.file_url || file.url;
      const fileName = file.filename || file.file_name || file.name || 'download';
      
      if (fileUrl) {
        await downloadFileFromBlob(fileUrl, fileName);
        toast.success('📥 File downloaded successfully');
        logger.success('File download completed');
      } else {
        throw new Error('No download URL available');
      }
    } catch (error) {
      logger.error('Failed to download file', error.message);
      toast.error(`Failed to download file: ${error.message}`);
    }
  };

  const handleDeleteFile = async (file) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${file.filename || file.file_name}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    try {
      logger.info('Deleting file', { filename: file.filename || file.file_name });
      
      const fileId = file.file_id || file.id || file.ref_id;
      if (!fileId) {
        throw new Error('No file ID available for deletion');
      }
      
      await deleteUserFile(fileId);
      
      // Remove file from local state
      setFiles(prevFiles => prevFiles.filter(f => 
        (f.file_id || f.id || f.ref_id) !== fileId
      ));
      
      toast.success('🗑️ File deleted successfully');
      logger.success('File deletion completed');
    } catch (error) {
      logger.error('Failed to delete file', error.message);
      toast.error(`Failed to delete file: ${error.message}`);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      default:
        return '📁';
    }
  };

  const formatFileSize = (size) => {
    if (!size) return 'Unknown size';
    if (typeof size === 'string' && size.includes('MB')) return size;
    
    const sizeNum = parseFloat(size);
    if (isNaN(sizeNum)) return 'Unknown size';
    
    if (sizeNum < 1) {
      return `${(sizeNum * 1024).toFixed(0)} KB`;
    }
    return `${sizeNum.toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
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

  const filteredFiles = getFilteredFiles();

  return (
    <div className="reports-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>My Reports</h1>
        </div>
        
        {categoryCounts.map((category) => (
          <button
            key={category.id}
            className={`category-item ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            <div className="category-icon">{category.icon}</div>
            <div className="category-content">
              <div className="category-text">{category.name}</div>
              <div className="category-count">{category.count} Files</div>
            </div>
            <div className="chevron">›</div>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header Section */}
        <div className="header-section">
          <div className="top-bar">
            <h1 className="page-title">My Reports</h1>
            <div className="header-actions">
              <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="action-btn">
                <span>🔧</span>
                <span>Shared Reports</span>
              </button>
              <button className="action-btn">
                <span>🔖</span>
                <span>Bookmark</span>
              </button>
              <button 
                className="action-btn primary"
                onClick={openUploadModal}
              >
                <span>➕</span>
                <span>Add Report</span>
              </button>
            </div>
          </div>

          <div className="content-header">
            <h2 className="content-title">
              All Reports 
              {totalDocuments > 0 && (
                <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: '#718096', marginLeft: '0.5rem' }}>
                  ({totalDocuments} total)
                </span>
              )}
            </h2>
            <div className="view-controls">
              <button className="sort-btn" onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}>
                <span>📊</span>
                <span>Sort</span>
              </button>
              <div className="view-toggle">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <span>⚏</span>
                  <span>Grid</span>
                </button>
                <button 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <span>☰</span>
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="tabs-section">
          <div className="tabs-container">
            <button 
              className={`tab-item ${activeTab === 'All' ? 'active' : ''}`}
              onClick={() => setActiveTab('All')}
            >
              All
            </button>
            <button 
              className={`tab-item ${activeTab === 'Uploads' ? 'active' : ''}`}
              onClick={() => setActiveTab('Uploads')}
            >
              Uploads
            </button>
          </div>
        </div>

        {/* Files Section */}
        <div className="files-section">
          {/* Loading State */}
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading your reports...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Oops! Something went wrong</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={() => fetchUserFiles(currentPage)}>
                🔄 Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredFiles.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No reports found</h3>
              <p>
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : 'Upload your first medical report to get started!'
                }
              </p>
              {(!searchTerm && selectedCategory === 'all' && totalDocuments === 0) && (
                <button 
                  className="upload-btn" 
                  onClick={openUploadModal}
                >
                  📤 Upload Your First Report
                </button>
              )}
            </div>
          )}

          {/* Files Grid */}
          {!loading && !error && filteredFiles.length > 0 && (
            <div className="files-grid">
              {filteredFiles.map((file, index) => (
                <div 
                  key={file.file_id || file.id || index} 
                  className="file-card"
                >
                  {/* File Thumbnail */}
                  <div className="file-thumbnail">
                    <div className="file-type-badge">
                      {getFileTypeFromName(file.filename || file.file_name || '')}
                    </div>
                    
                    {/* Placeholder for file preview */}
                    <div className="file-placeholder">
                      {getFileIcon(file.filename || file.file_name)}
                    </div>
                  </div>

                  {/* File Content */}
                  <div className="file-content">
                    <div className="file-header">
                      <div className="file-name">
                        {file.filename || file.file_name || file.name || 'Unnamed File'}
                      </div>
                      
                      <div className="file-actions-inline">
                        <button className="tag-btn">🏷️ Add Tags</button>
                        <span className="action-icon" onClick={() => handleViewFile(file)}>👁️</span>
                        <span className="action-icon" onClick={() => handleDownloadFile(file)}>📥</span>
                        <span className="action-icon" onClick={() => handleDeleteFile(file)}>🗑️</span>
                      </div>
                    </div>

                    <div className="file-meta">
                      <div className="file-owner">
                        {user?.userName || user?.email?.split('@')[0] || 'Me'}
                      </div>
                      <div className="file-date">
                        {formatDate(file.upload_timestamp || file.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Hover Overlay (for additional actions) */}
                  <div className="file-overlay">
                    <button 
                      className="overlay-btn view"
                      onClick={() => handleViewFile(file)}
                    >
                      👁️ View
                    </button>
                    <button 
                      className="overlay-btn download"
                      onClick={() => handleDownloadFile(file)}
                    >
                      📥 Download
                    </button>
                    <button 
                      className="overlay-btn delete"
                      onClick={() => handleDeleteFile(file)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
          </div>
              ))}
          </div>
          )}
          </div>
        </div>

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedDocument && (
        <DocumentViewer
          documentId={selectedDocument.id}
          documentData={selectedDocument}
          documentName={selectedDocument.name}
          onClose={handleCloseViewer}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="upload-modal-overlay">
          <div className="upload-modal">
            <div className="upload-modal-header">
              <h2>📤 Upload Medical Report</h2>
              <button className="close-btn" onClick={closeUploadModal}>
                ✕
              </button>
            </div>

            <div className="upload-modal-content">
              {/* File Drop Zone */}
              <div 
                className={`file-drop-zone ${isDragActive ? 'drag-active' : ''} ${uploadStatus === 'error' ? 'error' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
                
                {uploadFile ? (
                  <div className="file-selected">
                    <div className="file-icon">📄</div>
                    <div className="file-details">
                      <div className="file-name">{uploadFile.name}</div>
                      <div className="file-size">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>
                ) : (
                  <div className="drop-zone-content">
                    <div className="drop-icon">📁</div>
                    <h3>Drop your medical report here</h3>
                    <p>or click to browse files</p>
                    <small>Supports: PDF, JPG, PNG (Max 3MB)</small>
                  </div>
                )}
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
                  <div className="progress-text">
                    {uploadMessage} ({Math.round(uploadProgress)}%)
                  </div>
                </div>
              )}

              {/* Upload Message */}
              {uploadMessage && uploadStatus !== 'uploading' && (
                <div className={`upload-message ${uploadStatus}`}>
                  {uploadMessage}
                </div>
              )}

              {/* Upload Actions */}
              <div className="upload-actions">
                <button 
                  className="btn-secondary" 
                  onClick={closeUploadModal}
                  disabled={uploadStatus === 'uploading'}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleUpload}
                  disabled={!uploadFile || uploadStatus === 'uploading'}
                >
                  {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
