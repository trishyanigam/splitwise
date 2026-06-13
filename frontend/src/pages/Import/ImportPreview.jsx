import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DataGrid } from '@mui/x-data-grid';
import { getImportSessionDetails, getImportRecords } from '../../services/importService.js';
import ImportSummary from '../../components/ImportSummary.jsx';

export const ImportPreview = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Load States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data States
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionRes, recordsRes] = await Promise.all([
        getImportSessionDetails(sessionId),
        getImportRecords(sessionId)
      ]);

      if (sessionRes && sessionRes.success) {
        setSession(sessionRes.session);
      }
      if (recordsRes && recordsRes.success) {
        setRecords(recordsRes.records || []);
      }
    } catch (err) {
      console.error('Failed to retrieve preview details:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load staged file preview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !session) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/balances')}
          sx={{ mb: 3 }}
        >
          Back to Dashboard
        </Button>
        <Alert severity="error">{error || 'Staging session details missing.'}</Alert>
      </Box>
    );
  }

  // Define status chip coloring
  const getStatusColor = (statusVal) => {
    switch (statusVal) {
      case 'VALID':
        return 'success';
      case 'INVALID':
        return 'error';
      case 'REVIEW_REQUIRED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // 1. Dynamic Column Headers extraction from CSV records rawData
  const dynamicColumns = [];
  if (records.length > 0 && records[0].rawData) {
    const rawKeys = Object.keys(records[0].rawData);
    rawKeys.forEach((key) => {
      dynamicColumns.push({
        field: key,
        headerName: capitalize(key),
        flex: 1,
        minWidth: 120,
        sortable: true
      });
    });
  }

  // 2. Full Data Grid Columns Definition (Standard + Dynamic)
  const columns = [
    { 
      field: 'rowNumber', 
      headerName: 'Row #', 
      width: 90, 
      sortable: true,
      align: 'center',
      headerAlign: 'center'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      sortable: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={getStatusColor(params.value)} 
          sx={{ fontWeight: 800, fontSize: '10px' }}
        />
      )
    },
    ...dynamicColumns
  ];

  // 3. Grid Rows Normalization
  const rows = records.map((record) => ({
    id: record.id,
    rowNumber: record.rowNumber,
    status: record.status,
    ...record.rawData
  }));

  return (
    <Box>
      {/* Header Bar */}
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
            CSV Import Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reviewing details for file: <strong>{session.originalFileName}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Grid of Metrics Cards */}
      <Box sx={{ mb: 4 }}>
        <ImportSummary
          rowsProcessed={session.totalRows}
          validRows={records.filter((r) => r.status === 'VALID').length}
          rowsRequiringReview={records.filter((r) => r.status === 'REVIEW_REQUIRED' || r.status === 'PENDING').length}
          criticalIssues={records.filter((r) => r.status === 'INVALID').length}
        />
      </Box>

      {/* Anomaly Review Banner */}
      {session.status === 'REVIEW_REQUIRED' && (
        <Paper
          elevation={0}
          sx={{
            mb: 3,
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'linear-gradient(135deg, #422006 0%, #431407 100%)',
            border: '1px solid #f9731655',
            borderRadius: '16px'
          }}
        >
          <WarningAmberIcon sx={{ color: '#f97316', fontSize: 32, flexShrink: 0 }} />
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight={700} color="#fed7aa">
              Anomalies Detected — Review Required
            </Typography>
            <Typography variant="body2" color="#fb923c">
              One or more imported rows have issues that need your attention before this data can be used.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate(`/import/${sessionId}/anomalies`)}
            sx={{
              bgcolor: '#f97316',
              color: '#fff',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#ea580c' }
            }}
          >
            Review Anomalies
          </Button>
        </Paper>
      )}

      {/* Material UI Data Grid Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: 'background.paper',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Staged Transaction Records List
        </Typography>
        <Divider />

        <Box sx={{ height: 480, width: '100%', mt: 2 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 20]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 }
              }
            }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              color: 'text.primary',
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center'
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              },
              '& .MuiDataGrid-columnHeader': {
                backgroundColor: 'rgba(255, 255, 255, 0.01)'
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }
            }}
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default ImportPreview;
