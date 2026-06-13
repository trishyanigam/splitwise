import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
  Grid,
  Divider,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { uploadCsvFile } from '../../services/importService.js';

export const UploadCsv = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // File & Upload States
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // 1. Validation Logic
  const validateFile = (selectedFile) => {
    setError(null);
    if (!selectedFile) return false;

    // Check extension
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext !== 'csv') {
      setError('Invalid file format. Only CSV (.csv) files are accepted.');
      return false;
    }

    // Check size limit (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum allowed size is 10 MB.');
      return false;
    }

    return true;
  };

  // 2. Event Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 3. Upload Submit
  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const response = await uploadCsvFile(file, (progressPercent) => {
        setUploadProgress(progressPercent);
      });

      if (response && response.success) {
        setSuccessData(response.session);
        setFile(null);
      } else {
        setError('Upload failed. Staging database records rejected the input file.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Error occurred during file upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploader = () => {
    setSuccessData(null);
    clearFile();
  };

  return (
    <Box>
      {/* Header section */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <IconButton
          onClick={() => navigate('/balances')}
          sx={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: 'text.primary'
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            CSV Bill Uploader
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload group expense logs in bulk to draft settlements in staging
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={8}>
          <Card 
            elevation={0}
            sx={{
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              p: { xs: 2, sm: 4 }
            }}
          >
            <CardContent>
              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
                  {error}
                </Alert>
              )}

              {/* Upload Success View */}
              {successData ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
                    CSV Uploaded and Staged!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    Your file rows have been safely loaded into the review sandbox.
                  </Typography>

                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.01)',
                      borderColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      maxWidth: 450,
                      mx: 'auto',
                      mb: 4,
                      textAlign: 'left'
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Session ID
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          #{successData.id}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Rows Staged
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {successData.totalRows} transactions
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Source File
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
                          {successData.originalFileName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                          Staging Status
                        </Typography>
                        <Chip 
                          label={successData.status} 
                          color="secondary" 
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>

                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => navigate(`/import/${successData.id}`)}
                      sx={{ fontWeight: 600 }}
                    >
                      Preview Staged Data
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={resetUploader}
                      sx={{ fontWeight: 600 }}
                    >
                      Upload Another File
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/balances')}
                      sx={{ fontWeight: 600 }}
                    >
                      Back to Dashboard
                    </Button>
                  </Box>
                </Box>
              ) : (
                /* Interactive Drag & Drop Area */
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    Select CSV File
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Please make sure your CSV contains columns for date, title, amount, currency, and payers.
                  </Typography>

                  <Box
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={!isUploading ? triggerFileSelect : undefined}
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragActive ? 'primary.main' : 'rgba(255, 255, 255, 0.12)',
                      borderRadius: '16px',
                      p: 5,
                      textAlign: 'center',
                      cursor: isUploading ? 'default' : 'pointer',
                      backgroundColor: isDragActive ? 'rgba(99, 102, 241, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      '&:hover': {
                        borderColor: isUploading ? 'rgba(255, 255, 255, 0.12)' : 'primary.main',
                        backgroundColor: isUploading ? 'rgba(255, 255, 255, 0.01)' : 'rgba(99, 102, 241, 0.01)'
                      }
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      disabled={isUploading}
                    />

                    {file ? (
                      <Box sx={{ py: 1 }}>
                        <InsertDriveFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, wordBreak: 'break-all', mb: 1 }}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {(file.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ py: 1 }}>
                        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                          Drag and drop your file here
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          or click to browse local files (max size: 10 MB)
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Progress panel */}
                  {isUploading && (
                    <Box sx={{ width: '100%', mt: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Staging CSV records...
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {uploadProgress}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={uploadProgress} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3
                          }
                        }}
                      />
                    </Box>
                  )}

                  {/* Action Buttons */}
                  {file && !isUploading && (
                    <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={clearFile}
                        sx={{ fontWeight: 600 }}
                      >
                        Clear File
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudUploadIcon />}
                        onClick={handleUpload}
                        sx={{ fontWeight: 600 }}
                      >
                        Upload & Stage CSV
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UploadCsv;
