import React, { useState, useEffect, useRef } from 'react';
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
  Chip,
  Stack,
  Divider,
  Tooltip
} from '@mui/material';
import ArrowBackIcon        from '@mui/icons-material/ArrowBack';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon     from '@mui/icons-material/ErrorOutline';
import ReplayIcon           from '@mui/icons-material/Replay';
import SkipNextIcon         from '@mui/icons-material/SkipNext';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import GridViewIcon         from '@mui/icons-material/GridView';
import TimerOutlinedIcon    from '@mui/icons-material/TimerOutlined';

import {
  getImportSessionDetails,
  getImportRecords,
  executeImport,
  getExecutionStatus
} from '../../services/importService.js';
import ImportSummary  from '../../components/ImportSummary.jsx';
import ImportProgress from '../../components/ImportProgress.jsx';

/* ─────────────────────────────────────────────────────────────────────────── *
 *  Small helper: coloured stat tile shown in the right-hand summary panel
 * ─────────────────────────────────────────────────────────────────────────── */
const SummaryRow = ({ icon, label, value, valueColor = 'text.primary' }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      py: 1.5,
      px: 0
    }}
  >
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="body1" fontWeight={800} sx={{ color: valueColor }}>
      {value}
    </Typography>
  </Box>
);

/* ─────────────────────────────────────────────────────────────────────────── *
 *  ExecuteImport page
 * ─────────────────────────────────────────────────────────────────────────── */
export const ExecuteImport = () => {
  const { sessionId } = useParams();
  const navigate      = useNavigate();

  // ── Page-load state ──────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(true);
  const [error,   setError]       = useState(null);
  const [session, setSession]     = useState(null);
  const [records, setRecords]     = useState([]);

  // ── Execution state ───────────────────────────────────────────────────────
  const [executing,      setExecuting]      = useState(false);
  const [execution,      setExecution]      = useState(null);   // latest DB record
  const [executionError, setExecutionError] = useState(null);

  const pollingRef = useRef(null);

  // ── Derived counts ────────────────────────────────────────────────────────
  const totalRows            = session?.totalRows ?? 0;
  const recordsReady         = records.filter(r => r.status === 'VALID').length;
  const recordsRequiringReview = records.filter(
    r => r.status === 'REVIEW_REQUIRED' || r.status === 'PENDING'
  ).length;
  const criticalIssues       = records.filter(r => r.status === 'INVALID').length;

  const isCompleted = (execution?.executionStatus === 'COMPLETED');
  const isFailed    = (execution?.executionStatus === 'FAILED');
  const isRunning   = executing || execution?.executionStatus === 'RUNNING';

  // ── Data fetch ────────────────────────────────────────────────────────────
  const refreshRecords = async () => {
    const [sRes, rRes] = await Promise.all([
      getImportSessionDetails(sessionId),
      getImportRecords(sessionId)
    ]);
    if (sRes?.success)  setSession(sRes.session);
    if (rRes?.success)  setRecords(rRes.records ?? []);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await refreshRecords();

      // Resume polling if an execution already exists and is still live
      try {
        const execRes = await getExecutionStatus(sessionId);
        if (execRes?.success && execRes.execution) {
          setExecution(execRes.execution);
          const s = execRes.execution.executionStatus;
          if (s === 'RUNNING' || s === 'PENDING') {
            setExecuting(true);
            startPolling();
          }
        }
      } catch (e) {
        if (e.response?.status !== 404) console.error(e);
      }
    } catch (e) {
      setError(e.response?.data?.message ?? e.message ?? 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => stopPolling();
  }, [sessionId]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = () => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getExecutionStatus(sessionId);
        if (res?.success && res.execution) {
          setExecution(res.execution);
          const s = res.execution.executionStatus;
          if (s === 'COMPLETED' || s === 'FAILED') {
            setExecuting(false);
            stopPolling();
            await refreshRecords();
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 800);
  };

  const stopPolling = () => {
    clearInterval(pollingRef.current);
    pollingRef.current = null;
  };

  // ── Trigger execution ─────────────────────────────────────────────────────
  const handleStartImport = async () => {
    try {
      setExecuting(true);
      setExecutionError(null);
      setExecution(null);
      startPolling();

      const res = await executeImport(sessionId);

      stopPolling();
      setExecuting(false);

      if (res?.success && res.summary) {
        // Normalise summary → execution shape
        setExecution({
          executionStatus: res.summary.status,
          totalRecords:    res.summary.totalRecords,
          importedRecords: res.summary.importedRecords,
          skippedRecords:  res.summary.skippedRecords,
          failedRecords:   res.summary.failedRecords,
          startedAt:       res.summary.startedAt,
          completedAt:     res.summary.completedAt
        });
        await refreshRecords();
      }
    } catch (e) {
      stopPolling();
      setExecuting(false);
      setExecutionError(e.response?.data?.message ?? e.message ?? 'Execution failed.');
    }
  };

  // ── Loading / error guards ────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 14 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !session) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/import/${sessionId}`)} sx={{ mb: 3 }}>
          Back to Preview
        </Button>
        <Alert severity="error">{error ?? 'Session details unavailable.'}</Alert>
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box>

      {/* ═══════════════════════════════ HEADER ════════════════════════════ */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Back to Preview">
            <IconButton
              onClick={() => navigate(`/import/${sessionId}`)}
              disabled={isRunning}
              sx={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: 'text.primary' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                Execute Import
              </Typography>
              {session.status === 'COMPLETED' && (
                <Chip label="Completed" color="success" size="small" sx={{ fontWeight: 800, fontSize: '11px' }} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              Staging file: <strong>{session.originalFileName}</strong>
            </Typography>
          </Box>
        </Stack>

        {/* CTA shortcut buttons */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {recordsRequiringReview > 0 && !isCompleted && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(`/import/${sessionId}/resolution-center`)}
              startIcon={<WarningAmberIcon />}
              sx={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24', '&:hover': { bgcolor: 'rgba(251,191,36,0.06)', borderColor: '#fbbf24' } }}
            >
              Resolve Anomalies
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/import/${sessionId}`)}
            startIcon={<GridViewIcon />}
            sx={{ fontWeight: 700 }}
          >
            Preview Data
          </Button>
        </Stack>
      </Box>

      {/* ═══════════════════════════════ METRICS ═══════════════════════════ */}
      <Box sx={{ mb: 4 }}>
        <ImportSummary
          rowsProcessed={totalRows}
          validRows={recordsReady}
          rowsRequiringReview={recordsRequiringReview}
          criticalIssues={criticalIssues}
        />
      </Box>

      {/* ═══════════════════════════════ MAIN GRID ══════════════════════════ */}
      <Grid container spacing={3}>

        {/* ── LEFT: Execution controller ─────────────────────────────────── */}
        <Grid item xs={12} lg={7}>
          <Card elevation={0} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3.5 }}>

              <Typography variant="h6" fontWeight={800} mb={0.5}>
                Execution Controller
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Valid records will be matched against active users, resolved by split type,
                and committed as <strong>Expenses</strong> or <strong>Settlements</strong>.
              </Typography>

              {/* ── Anomaly warning ───────────────────────────────────── */}
              {recordsRequiringReview > 0 && !isCompleted && !isRunning && (
                <Paper
                  elevation={0}
                  sx={{
                    mb: 3,
                    p: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    background: 'linear-gradient(135deg, #3a2004 0%, #451a03 100%)',
                    border: '1px solid rgba(249,115,22,0.3)',
                    borderRadius: '14px'
                  }}
                >
                  <WarningAmberIcon sx={{ color: '#f97316', fontSize: 28, flexShrink: 0 }} />
                  <Box flex={1}>
                    <Typography variant="subtitle2" fontWeight={700} color="#fed7aa">
                      {recordsRequiringReview} record{recordsRequiringReview !== 1 ? 's' : ''} require review
                    </Typography>
                    <Typography variant="caption" color="#fb923c">
                      These will be skipped during execution. Resolve them first for a full import.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate(`/import/${sessionId}/resolution-center`)}
                    sx={{ bgcolor: '#f97316', flexShrink: 0, fontWeight: 700, '&:hover': { bgcolor: '#ea580c' } }}
                  >
                    Resolve
                  </Button>
                </Paper>
              )}

              {/* ── Start button ─────────────────────────────────────── */}
              {!isRunning && !isCompleted && !isFailed && (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: '16px',
                    border: '1px dashed rgba(16,185,129,0.25)',
                    background: 'rgba(16,185,129,0.03)',
                    textAlign: 'center',
                    mb: 3
                  }}
                >
                  {recordsReady > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        <strong style={{ color: '#34d399' }}>{recordsReady}</strong> record{recordsReady !== 1 ? 's' : ''} ready to be committed to the ledger.
                      </Typography>
                      <Button
                        id="start-import-btn"
                        variant="contained"
                        color="primary"
                        size="large"
                        startIcon={<PlayArrowRoundedIcon />}
                        onClick={handleStartImport}
                        sx={{
                          py: 1.5,
                          px: 5,
                          fontWeight: 800,
                          fontSize: '1rem',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          boxShadow: '0 6px 24px rgba(16,185,129,0.35)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            boxShadow: '0 8px 32px rgba(16,185,129,0.45)',
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        Start Import Execution
                      </Button>
                    </>
                  ) : (
                    <>
                      <ErrorOutlineIcon sx={{ fontSize: 36, color: 'error.main', mb: 1 }} />
                      <Typography variant="body2" color="error.main" fontWeight={700}>
                        No valid records staged
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Resolve anomalies in the Resolution Center before executing.
                      </Typography>
                    </>
                  )}
                </Box>
              )}

              {/* ── Progress (live or cached) ─────────────────────────── */}
              {(isRunning || execution) && (
                <Box mb={3}>
                  <ImportProgress execution={execution} isRunning={isRunning} />
                </Box>
              )}

              {/* ── Execution error ───────────────────────────────────── */}
              {executionError && (
                <Alert
                  severity="error"
                  icon={<ErrorOutlineIcon />}
                  sx={{ mb: 3, borderRadius: '12px' }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>Import Process Failed</Typography>
                  {executionError}
                </Alert>
              )}

              {/* ── Completed state ───────────────────────────────────── */}
              {isCompleted && !isRunning && (
                <Box>
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{
                      mb: 3,
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.03) 100%)',
                      border: '1px solid rgba(16,185,129,0.25)'
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={800} color="primary.main">
                      Ledger Import Completed
                    </Typography>
                    All eligible records have been processed and added to your expense pools.
                  </Alert>

                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Button
                      id="go-to-balances-btn"
                      variant="contained"
                      color="primary"
                      onClick={() => navigate('/balances')}
                      sx={{ fontWeight: 700 }}
                    >
                      View Balances Dashboard
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/import/${sessionId}`)}
                      sx={{ fontWeight: 700 }}
                    >
                      Back to Preview
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* ── Failed state ──────────────────────────────────────── */}
              {isFailed && !isRunning && (
                <Box>
                  <Alert
                    severity="error"
                    icon={<ErrorOutlineIcon />}
                    sx={{ mb: 3, borderRadius: '14px' }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Import Encountered Failures
                    </Typography>
                    No records were committed. Review your CSV data and try again.
                  </Alert>

                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ReplayIcon />}
                      onClick={handleStartImport}
                      sx={{ fontWeight: 700 }}
                    >
                      Retry Execution
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/import/${sessionId}`)}
                      sx={{ fontWeight: 700 }}
                    >
                      Review Staged Data
                    </Button>
                  </Stack>
                </Box>
              )}

            </CardContent>
          </Card>
        </Grid>

        {/* ── RIGHT: Execution summary ───────────────────────────────────── */}
        <Grid item xs={12} lg={5}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={800}>
                  Execution Summary
                </Typography>
                {execution && (
                  <Chip
                    label={execution.executionStatus}
                    size="small"
                    color={
                      isCompleted ? 'success' :
                      isFailed    ? 'error'   :
                      isRunning   ? 'primary' : 'default'
                    }
                    sx={{ fontWeight: 800, fontSize: '11px' }}
                  />
                )}
              </Stack>

              {execution ? (
                <>
                  {/* Stat rows */}
                  <SummaryRow
                    icon={<AssignmentTurnedInIcon sx={{ fontSize: 18, color: '#a78bfa' }} />}
                    label="Total Staged"
                    value={execution.totalRecords ?? 0}
                    valueColor="text.primary"
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                  <SummaryRow
                    icon={<CheckCircleIcon sx={{ fontSize: 18, color: '#34d399' }} />}
                    label="Records Ready"
                    value={recordsReady}
                    valueColor="#34d399"
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                  <SummaryRow
                    icon={<CheckCircleIcon sx={{ fontSize: 18, color: '#34d399' }} />}
                    label="Imported"
                    value={execution.importedRecords ?? 0}
                    valueColor="#34d399"
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                  <SummaryRow
                    icon={<SkipNextIcon sx={{ fontSize: 18, color: '#fbbf24' }} />}
                    label="Skipped"
                    value={execution.skippedRecords ?? 0}
                    valueColor="#fbbf24"
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                  <SummaryRow
                    icon={<ErrorOutlineIcon sx={{ fontSize: 18, color: '#f87171' }} />}
                    label="Failed"
                    value={execution.failedRecords ?? 0}
                    valueColor="#f87171"
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

                  <SummaryRow
                    icon={<WarningAmberIcon sx={{ fontSize: 18, color: '#fbbf24' }} />}
                    label="Requiring Review"
                    value={recordsRequiringReview}
                    valueColor={recordsRequiringReview > 0 ? '#fbbf24' : 'text.secondary'}
                  />

                  {/* Timing footer */}
                  {execution.startedAt && (
                    <>
                      <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)', mt: 1 }} />
                      <Box mt={2} p={2} sx={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                          <TimerOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Timing
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Started: <strong>{new Date(execution.startedAt).toLocaleTimeString()}</strong>
                        </Typography>
                        {execution.completedAt && (
                          <Typography variant="body2" color="text.secondary">
                            Duration:{' '}
                            <strong style={{ color: '#34d399' }}>
                              {new Date(execution.completedAt) - new Date(execution.startedAt)} ms
                            </strong>
                          </Typography>
                        )}
                      </Box>
                    </>
                  )}
                </>
              ) : (
                /* Empty state */
                <Box
                  sx={{
                    py: 6,
                    textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: '16px'
                  }}
                >
                  <AssignmentTurnedInIcon sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.3, mb: 1.5 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    No execution data yet
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Start the import to see a live report here.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default ExecuteImport;
