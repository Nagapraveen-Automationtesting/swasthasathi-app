import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getDocumentContent, getDocumentVitals, getPDFDataViaProxy, getSignedUrl } from '../utils/network';
import { PDFJS_WORKER_URL, PDFJS_CMAP_URL } from '../assets/Constants';
import { logger } from '../utils/logger';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import './DocumentViewer.scss';

// Configure PDF.js worker for Vite
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  logger.info('PDF.js worker configured', { workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc });
  
  // Test worker loading
  const testWorker = () => {
    try {
      const testScript = document.createElement('script');
      testScript.src = pdfjsLib.GlobalWorkerOptions.workerSrc;
      testScript.onload = () => logger.success('PDF.js worker loaded successfully');
      testScript.onerror = () => logger.error('PDF.js worker failed to load');
      document.head.appendChild(testScript);
      setTimeout(() => document.head.removeChild(testScript), 1000);
    } catch (e) {
      logger.error('Worker test failed', e.message);
    }
  };
  
  // Test worker after a short delay
  setTimeout(testWorker, 1000);
}

export default function DocumentViewer({ documentId, documentData, onClose, documentName }) {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('document');
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [fileType, setFileType] = useState('');
  const [vitalsExtractionAvailable, setVitalsExtractionAvailable] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (documentData) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeViewer();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [documentData]);

  // Also add a separate effect to retry when canvas becomes available
  useEffect(() => {
    if (documentData && canvasRef.current && !loading) {
      logger.debug('Canvas now available, retrying initialization');
      initializeViewer();
    }
  }, [canvasRef.current]);

  const initializeViewer = async () => {
    try {
      logger.debug('Initializing document viewer with data', {
        hasDocumentData: !!documentData,
        availableUrls: {
          file_url: !!documentData.file_url,
          url: !!documentData.url,
          document_url: !!documentData.document_url,
          blob_url: !!documentData.blob_url
        }
      });

      // Validate document data
      if (!documentData) {
        throw new Error('No document data provided');
      }

      // Don't set loading here - let the canvas render first
      setError(null);

      // Use the file_url from the document data to render directly
      logger.debug('About to call renderDocumentToCanvas');
      await renderDocumentToCanvas(documentData);
      logger.debug('renderDocumentToCanvas call completed');

      // Try to fetch vitals if document ID is available and vitals are extracted
      if (documentId) {
        // Check if vital extraction is available for this document
        const vitalsExtracted = documentData?.vital_extracted || documentData?.vitals_extracted || false;
        
        logger.debug('Checking vitals extraction status', { 
          documentId, 
          vitalsExtracted,
          documentData: !!documentData 
        });
        
        if (vitalsExtracted) {
          try {
            logger.info('Fetching vitals for document', { documentId });
            const vitalsResponse = await getDocumentVitals(documentId);
            logger.debug('Raw vitals response received', vitalsResponse);
            
            // Handle vitals object structure: {'c-reactive_protein': {value: '4.8', unit: 'mg/dL', ...}}
            let extractedVitals = [];
            
            // Check different possible response formats
            const vitalsData = vitalsResponse.parameters || vitalsResponse.vitals_data || vitalsResponse.data || vitalsResponse;
            
            if (vitalsData && typeof vitalsData === 'object') {
              // Convert object structure to array
              extractedVitals = Object.keys(vitalsData).map(key => ({
                name: vitalsData[key].original_name || key.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: vitalsData[key].value,
                unit: vitalsData[key].unit,
                status: vitalsData[key].status,
                reference_range: vitalsData[key].reference_range,
                timestamp: vitalsData[key].timestamp,
                key: key
              }));
            }
            
            logger.success('Vitals data processed successfully', { count: extractedVitals.length });
            setVitals(extractedVitals);
            setVitalsExtractionAvailable(true);
          } catch (vitalsError) {
            logger.warn('Failed to fetch vitals for document', vitalsError.message);
            setVitals([]);
            setVitalsExtractionAvailable(true); // Still available, just failed to fetch
          }
        } else {
          logger.info('Vitals extraction not available for this document', { documentId });
          setVitals([]);
          setVitalsExtractionAvailable(false);
        }
      } else {
        logger.warn('No document ID provided, skipping vitals fetch');
        setVitals([]);
        setVitalsExtractionAvailable(false);
      }

    } catch (error) {
      logger.error('Error initializing document viewer', error.message);
      setError(error.message);
      toast.error(`Failed to load document: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderDocumentToCanvas = async (docData) => {
    console.log('🎨 =============== STARTING RENDER DOCUMENT TO CANVAS ===============');
    console.log('📄 Document data received:', docData);
    
    try {
      let canvas = canvasRef.current;
      console.log('📊 Canvas ref status:', !!canvas);
      
      if (!canvas) {
        console.error('❌ Canvas ref is null - will retry when canvas is ready');
        console.log('🔍 Debugging canvas availability:');
        console.log('  - canvasRef object:', canvasRef);
        console.log('  - canvasRef.current:', canvasRef.current);
        console.log('  - DOM canvas elements:', document.querySelectorAll('canvas').length);
        
        // Try to wait for canvas to be available
        let retryCount = 0;
        const maxRetries = 10;
        
        while (!canvasRef.current && retryCount < maxRetries) {
          console.log(`🔄 Waiting for canvas... (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 100));
          retryCount++;
        }
        
        canvas = canvasRef.current;
        console.log('📊 Canvas ref after retry:', !!canvas);
        
        if (!canvas) {
          console.error('❌ Canvas still not available after retries');
          return;
        }
      }

      const ctx = canvas.getContext('2d');
      console.log('🎨 Canvas context obtained:', !!ctx);
      console.log('📊 Canvas element details:', {
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight
      });
      
      // Check if we have a file URL (blob path from /get_documents response)
      const hasFileUrl = !!(docData.file_url || docData.url || docData.document_url || docData.blob_url);
      console.log('🔗 Has file URL:', hasFileUrl);
      
      if (hasFileUrl) {
        const fileUrl = docData.file_url || docData.url || docData.document_url || docData.blob_url;
        
        console.log('📄 Loading file from URL:', fileUrl);
        console.log('📄 File extension detected:', fileUrl.split('.').pop()?.toLowerCase());
        
        // Check if it's a PDF
        const isPDF = fileUrl.match(/\.pdf$/i);
        console.log('📋 Is PDF file:', !!isPDF);
        console.log('📋 PDF regex test result:', isPDF);
        
        // If it's an image, load and draw it
        const isImage = fileUrl.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i);
        console.log('🖼️ Is image file:', !!isImage);
        
        if (isImage) {
          setFileType('image');
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            console.log('✅ Image loaded successfully');
            // Set canvas size to match image aspect ratio
            const maxWidth = 800;
            const maxHeight = 600;
            const aspectRatio = img.width / img.height;
            
            let canvasWidth = maxWidth;
            let canvasHeight = maxWidth / aspectRatio;
            
            if (canvasHeight > maxHeight) {
              canvasHeight = maxHeight;
              canvasWidth = maxHeight * aspectRatio;
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // Clear canvas and draw image
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          };
          
          img.onerror = (error) => {
            console.error('❌ Failed to load image:', error);
            console.log('🔄 Trying to load as PDF or document...');
            drawPlaceholder(ctx, canvas, 'Image failed to load');
          };
          
          img.src = fileUrl;
        } else if (fileUrl.match(/\.pdf$/i)) {
          // For PDFs, render actual PDF content
          console.log('📄 ✅ PDF DETECTED! Starting PDF loading process...');
          console.log('📄 PDF URL being passed to loadPDF:', fileUrl);
          console.log('📄 Setting file type to PDF...');
          setFileType('pdf');
          
          console.log('📄 🚀 About to call loadPDF function...');
          await loadPDF(fileUrl, documentId, docData);
          console.log('📄 ✅ loadPDF function call completed');
        } else {
          // For other documents, show general placeholder
          console.log('📄 ❌ Not PDF or image - document detected, showing placeholder');
          console.log('📄 File URL:', fileUrl);
          console.log('📄 File extension:', fileUrl.split('.').pop()?.toLowerCase());
          setFileType('document');
          drawPlaceholder(ctx, canvas, 'Document preview not available');
        }
      } else {
        console.log('⚠️ No file URL found in document data');
        console.log('⚠️ Available keys in docData:', Object.keys(docData));
        drawPlaceholder(ctx, canvas, 'No file URL available');
      }
    } catch (error) {
      console.error('❌ =============== RENDER DOCUMENT TO CANVAS FAILED ===============');
      console.error('❌ Error in renderDocumentToCanvas:', error);
      console.error('❌ Error stack:', error.stack);
      drawPlaceholder(canvasRef.current?.getContext('2d'), canvasRef.current);
    }
    
    console.log('🎨 =============== RENDER DOCUMENT TO CANVAS COMPLETED ===============');
  };

  // 📄 Load PDF document using PDF.js
  const loadPDF = async (pdfUrl, docId = null, docData = null) => {
    console.log('🚀 =============== STARTING PDF LOAD ===============');
    console.log('📄 PDF URL:', pdfUrl);
    console.log('📄 PDF.js version check:', pdfjsLib.version);
    console.log('📄 Worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    try {
      // Don't set loading here since canvas needs to be visible
      setError(null);
      
      // Skip URL accessibility test for now (will fail due to CORS)
      console.log('🔍 Skipping URL accessibility test due to expected CORS issues');
      console.log('📄 PDF URL for reference:', pdfUrl);
      
      // Method 1: Try signed URL first (recommended approach)
      if (docData && (docData.file_url || docData.url || docData.document_url || docData.blob_url)) {
        const blobPath = docData.file_url || docData.url || docData.document_url || docData.blob_url;
        try {
          console.log('🔗 Attempting PDF load via signed URL...');
          console.log('📄 Original blob path:', blobPath);
          
          // Extract just the blob path without the full URL
          let extractedBlobPath = blobPath;
          if (blobPath.includes('.blob.core.windows.net/')) {
            // Extract path after container name
            const urlParts = blobPath.split('/');
            const containerIndex = urlParts.findIndex(part => part.includes('.blob.core.windows.net'));
            if (containerIndex !== -1 && urlParts.length > containerIndex + 2) {
              extractedBlobPath = urlParts.slice(containerIndex + 2).join('/').split('?')[0];
            }
          }
          
          console.log('📄 Extracted blob path:', extractedBlobPath);
          
          const signedUrlData = await getSignedUrl(extractedBlobPath);
          console.log('✅ Signed URL received, expires in:', signedUrlData.expiresIn, 'seconds');
          
          let loadingTask = pdfjsLib.getDocument({
            url: signedUrlData.signedUrl,
            cMapUrl: PDFJS_CMAP_URL,
            cMapPacked: true,
            disableAutoFetch: false,
            disableStream: false,
            withCredentials: false
          });
          
          console.log('📄 Signed URL loading task created...');
          const pdf = await loadingTask.promise;
          console.log('✅ Signed URL method successful! Pages:', pdf.numPages);
          
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          await renderPDFPage(pdf, 1);
          return;
          
        } catch (signedUrlError) {
          console.log('❌ Signed URL method failed:', signedUrlError.message);
          console.log('🔄 Trying backend proxy method...');
        }
      }

      // Method 2: Try backend proxy (bypasses CORS)
      if (docId || documentId) {
        const useDocId = docId || documentId;
        try {
          console.log('📄 Attempting PDF load via backend proxy...');
          const pdfData = await getPDFDataViaProxy(useDocId);
          
          let loadingTask = pdfjsLib.getDocument({
            data: pdfData,
            cMapUrl: PDFJS_CMAP_URL,
            cMapPacked: true
          });
          
          console.log('📄 Backend proxy loading task created...');
          const pdf = await loadingTask.promise;
          console.log('✅ Backend proxy method successful! Pages:', pdf.numPages);
          
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          await renderPDFPage(pdf, 1);
          return;
          
        } catch (proxyError) {
          console.log('❌ Backend proxy method failed:', proxyError.message);
          console.log('🔄 Trying direct URL method...');
        }
      }

      // Method 3: Try direct URL loading (requires CORS)
      console.log('📄 Attempting direct URL loading with PDF.js...');
      let loadingTask;
      
      try {
        loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: PDFJS_CMAP_URL,
          cMapPacked: true,
          disableAutoFetch: false,
          disableStream: false,
          httpHeaders: {
            'Accept': 'application/pdf',
            'Cache-Control': 'no-cache'
          },
          withCredentials: false
        });
        
        console.log('📄 Direct URL loading task created...');
        const pdf = await loadingTask.promise;
        console.log('✅ Direct URL method successful! Pages:', pdf.numPages);
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        await renderPDFPage(pdf, 1);
        return;
        
      } catch (directError) {
        console.log('❌ Direct URL method failed:', directError.message);
        console.log('🔄 Trying fetch + data method...');
      }
      
      // Method 4: Manual fetch (last resort, likely to fail with CORS)
      console.log('📄 Fetching PDF data manually (last resort)...');
      const response = await fetch(pdfUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF data: ${response.status} ${response.statusText}`);
      }
      
      const pdfData = await response.arrayBuffer();
      console.log('✅ PDF data fetched, size:', pdfData.byteLength, 'bytes');
      
      console.log('📄 Loading PDF from fetched data...');
      loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        cMapUrl: PDFJS_CMAP_URL,
        cMapPacked: true
      });
      
      const pdf = await loadingTask.promise;
      console.log('✅ Manual fetch method successful! Pages:', pdf.numPages);
      
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      await renderPDFPage(pdf, 1);
      
    } catch (error) {
      console.error('❌ =============== PDF LOAD FAILED ===============');
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ ================================================');
      
      setLoading(false);
      setError(error.message);
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        drawPlaceholder(ctx, canvas, `PDF Load Failed: ${error.message}`);
      }
      toast.error(`PDF loading failed: ${error.message}`);
    }
  };

  // 🎨 Render specific PDF page to canvas
  const renderPDFPage = async (pdf, pageNumber) => {
    console.log(`🎨 =============== RENDERING PAGE ${pageNumber} ===============`);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error('❌ Canvas ref is null');
        return;
      }

      console.log('📊 Canvas element:', canvas);
      console.log('📊 Canvas dimensions before:', { width: canvas.width, height: canvas.height });

      const ctx = canvas.getContext('2d');
      console.log('🎨 Canvas context obtained:', !!ctx);
      
      console.log('📄 Getting page', pageNumber, 'from PDF...');
      const page = await pdf.getPage(pageNumber);
      console.log('✅ Page obtained, calculating viewport...');
      
      // Calculate viewport
      const viewport = page.getViewport({ scale });
      console.log('📐 Viewport calculated:', {
        width: viewport.width,
        height: viewport.height,
        scale: scale
      });
      
      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      console.log('📊 Canvas dimensions set:', { width: canvas.width, height: canvas.height });
      
      // Apply CSS styling for scrollable display - remove max constraints
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.style.display = 'block';
      
      console.log('🎨 Canvas styling applied for scrollable view:', {
        cssWidth: canvas.style.width,
        cssHeight: canvas.style.height,
        actualScale: scale
      });
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('🧹 Canvas cleared');
      
      // Render page
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };
      
      console.log('🚀 Starting page render...');
      const renderPromise = page.render(renderContext);
      await renderPromise.promise;
      
      console.log(`✅ =============== PAGE ${pageNumber} RENDERED SUCCESSFULLY ===============`);
      
    } catch (error) {
      console.error(`❌ =============== PAGE ${pageNumber} RENDER FAILED ===============`);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        drawPlaceholder(ctx, canvas, `Failed to render page ${pageNumber}: ${error.message}`);
      }
    }
  };

  // 📄 PDF Navigation functions
  const goToNextPage = async () => {
    if (pdfDoc && currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      await renderPDFPage(pdfDoc, newPage);
    }
  };

  const goToPreviousPage = async () => {
    if (pdfDoc && currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      await renderPDFPage(pdfDoc, newPage);
    }
  };

  const zoomIn = async () => {
    if (pdfDoc) {
      const newScale = Math.min(scale + 0.25, 3.0);
      setScale(newScale);
      await renderPDFPage(pdfDoc, currentPage);
    }
  };

  const zoomOut = async () => {
    if (pdfDoc) {
      const newScale = Math.max(scale - 0.25, 0.5);
      setScale(newScale);
      await renderPDFPage(pdfDoc, currentPage);
    }
  };

  const drawPlaceholder = (ctx, canvas, message = 'Document preview not available') => {
    if (!ctx || !canvas) return;
    
    canvas.width = 800;
    canvas.height = 600;
    
    // Draw placeholder background
    ctx.fillStyle = '#f7fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Draw document icon
    ctx.fillStyle = '#a0aec0';
    ctx.font = '64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📄', canvas.width / 2, canvas.height / 2 - 50);
    
    // Draw document name
    ctx.fillStyle = '#4a5568';
    ctx.font = '18px Arial';
    ctx.fillText(documentName || 'Document Preview', canvas.width / 2, canvas.height / 2 + 20);
    
    // Draw message
    ctx.fillStyle = '#718096';
    ctx.font = '14px Arial';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 50);
  };

  const drawPDFPlaceholder = (ctx, canvas, pdfUrl) => {
    if (!ctx || !canvas) return;
    
    canvas.width = 800;
    canvas.height = 600;
    
    // Draw PDF placeholder background
    ctx.fillStyle = '#fef5e7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#f6ad55';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Draw PDF icon
    ctx.fillStyle = '#d69e2e';
    ctx.font = '64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📄', canvas.width / 2, canvas.height / 2 - 70);
    
    // Draw PDF label
    ctx.fillStyle = '#1a202c';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('PDF Document', canvas.width / 2, canvas.height / 2 - 20);
    
    // Draw document name
    ctx.fillStyle = '#4a5568';
    ctx.font = '16px Arial';
    ctx.fillText(documentName || 'Document.pdf', canvas.width / 2, canvas.height / 2 + 10);
    
    // Draw instruction
    ctx.fillStyle = '#718096';
    ctx.font = '14px Arial';
    ctx.fillText('Click "Open in New Tab" to view PDF', canvas.width / 2, canvas.height / 2 + 40);
    
    // Add click handler for PDF opening
    canvas.style.cursor = 'pointer';
    canvas.onclick = () => {
      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
        toast.success('📄 PDF opened in new tab');
      }
    };
  };

  const formatVitalValue = (vital) => {
    if (!vital) return '';
    
    // Handle new vital structure
    if (vital.value !== undefined) {
      const value = vital.value;
      const unit = vital.unit || '';
      return `${value} ${unit}`.trim();
    }
    
    // Fallback for other formats
    if (typeof vital === 'object') {
      return `${vital.result || vital.val || ''} ${vital.units || ''}`.trim();
    }
    
    return vital.toString();
  };

  const getVitalStatus = (vital) => {
    if (!vital || !vital.status) return 'normal';
    
    const status = vital.status.toLowerCase();
    if (status === 'abnormal' || status.includes('high') || status.includes('elevated')) return 'high';
    if (status.includes('low') || status.includes('below')) return 'low';
    if (status === 'normal' || status.includes('within')) return 'normal';
    return 'normal';
  };

  return (
    <div className="document-viewer-overlay">
      <div className="document-viewer-modal">
        {/* Header */}
        <div className="viewer-header">
          <div className="header-left">
            <button className="back-btn" onClick={onClose}>
              ←
            </button>
            <div className="document-info">
              <h2>Smart Upload</h2>
              <div className="document-details">
                <div className="document-icon">📄</div>
                <div className="document-meta">
                  <h3>{documentName || 'Document'}</h3>
                  <p>{vitals.length} Parameters</p>
                  <p>{new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</p>
                </div>
              </div>
            </div>
          </div>
          
          <button className="edit-btn">
            ✏️ Edit
          </button>
        </div>

        {/* Content */}
        <div className="viewer-content">
          {error ? (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Failed to load document</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={initializeViewer}>
                🔄 Try Again
              </button>
            </div>
          ) : (
            <div className="content-layout">
              {/* Document Canvas */}
              <div className="document-canvas-container">
                <div className="document-title">
                  <h3>{documentName || 'Document'}</h3>
                </div>
                
                {/* Loading overlay for canvas area */}
                {loading && (
                  <div className="canvas-loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading document...</p>
                  </div>
                )}
                
                <div className="canvas-wrapper">
                  <canvas 
                    ref={canvasRef}
                    className="document-canvas"
                    style={{ opacity: loading ? 0.3 : 1 }}
                  />
                  
                  {/* Enhanced controls for PDF and images */}
                  <div className="canvas-controls">
                    {fileType === 'pdf' && (
                      <>
                        {/* PDF Navigation */}
                        <div className="pdf-navigation">
                          <button 
                            className="canvas-btn"
                            onClick={goToPreviousPage}
                            disabled={currentPage <= 1}
                            title="Previous page"
                          >
                            ◀
                          </button>
                          <span className="page-info">
                            {currentPage} / {totalPages}
                          </span>
                          <button 
                            className="canvas-btn"
                            onClick={goToNextPage}
                            disabled={currentPage >= totalPages}
                            title="Next page"
                          >
                            ▶
                          </button>
                        </div>
                        
                        {/* PDF Zoom */}
                        <div className="zoom-controls">
                          <button 
                            className="canvas-btn"
                            onClick={zoomOut}
                            disabled={scale <= 0.5}
                            title="Zoom out"
                          >
                            ➖
                          </button>
                          <span className="zoom-info">
                            {Math.round(scale * 100)}%
                          </span>
                          <button 
                            className="canvas-btn"
                            onClick={zoomIn}
                            disabled={scale >= 3.0}
                            title="Zoom in"
                          >
                            ➕
                          </button>
                        </div>
                      </>
                    )}
                    
                    {/* Basic zoom for images */}
                    {fileType === 'image' && (
                      <div className="zoom-controls">
                        <button className="canvas-btn">➖</button>
                        <button className="canvas-btn">➕</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Extracted Parameters */}
              <div className="parameters-container">
                <div className="parameters-header">
                  <h3>Parameter</h3>
                  <h3>Value</h3>
                </div>
                
                <div className="parameters-list">
                  {vitals.length > 0 ? (
                    vitals.map((vital, index) => (
                      <div key={vital.key || index} className={`parameter-row ${getVitalStatus(vital)}`}>
                        <div className="parameter-info">
                          <div className="parameter-name">
                            {vital.name || vital.parameter || vital.test_name || `Parameter ${index + 1}`}
                          </div>
                          {vital.reference_range && (
                            <div className="parameter-reference">
                              Ref: {vital.reference_range}
                            </div>
                          )}
                        </div>
                        <div className="parameter-value">
                          <div className="value-main">
                            {formatVitalValue(vital)}
                          </div>
                          <div className="value-status">
                            {vital.status}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-parameters">
                      {vitalsExtractionAvailable ? (
                        <>
                          <p>No extracted parameters available</p>
                          <small>Parameters will appear here once the document is processed</small>
                        </>
                      ) : (
                        <>
                          <p>Vitals extraction not available for this report.</p>
                          <small>This document does not support automated parameter extraction</small>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
