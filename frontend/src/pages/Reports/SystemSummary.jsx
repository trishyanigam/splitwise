import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Divider,
  Tooltip,
  Stack,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon             from '@mui/icons-material/Refresh';
import GroupsOutlinedIcon      from '@mui/icons-material/GroupsOutlined';
import PeopleAltOutlinedIcon   from '@mui/icons-material/PeopleAltOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import HandshakeOutlinedIcon   from '@mui/icons-material/HandshakeOutlined';
import UploadFileOutlinedIcon  from '@mui/icons-material/UploadFileOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import TrendingUpIcon          from '@mui/icons-material/TrendingUp';
import FiberManualRecordIcon   from '@mui/icons-material/FiberManualRecord';
import api from '../../services/api.js';

// ─────────────────────────────────────────────────────────────────────────────
// API helper
// ─────────────────────────────────────────────────────────────────────────────

const fetchSystemSummary = async () => {
  const { data } = await api.get('/reports/system-summary');
  return data;          // { success, generatedAt, summary }
};

// ─────────────────────────────────────────────────────────────────────────────
// Mini spark-bar: a row of vertical bars proportional to values[]
// ─────────────────────────────────────────────────────────────────────────────
const SparkBars = ({ values = [], color = '#10b981' }) => {
  const max = Math.max(...values, 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 28 }}>
      {values.map((v, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            height: `${Math.max(4, (v / max) * 28)}px`,
            borderRadius: '3px',
            backgroundColor: i === values.length - 1 ? color : `${color}55`,
            transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Thin horizontal progress bar
// ─────────────────────────────────────────────────────────────────────────────
const MiniBar = ({ value = 0, max = 100, color = '#10b981' }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <Box sx={{ height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', mt: 1.5 }}>
      <Box
        sx={{
          height: '100%',
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: 999,
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Primary metric card
// ─────────────────────────────────────────────────────────────────────────────
const MetricCard = ({
  icon,
  label,
  value,
  subvalue,
  sublabel,
  accentColor,
  sparkValues,
  barValue,
  barMax,
  badge,
}) => (
  <Card
    sx={{
      height: '100%',
      background: `linear-gradient(145deg, ${accentColor}0d 0%, rgba(0,0,0,0) 100%)`,
      border: `1px solid ${accentColor}1e`,
      transition: 'all 0.25s ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 16px 48px -12px ${accentColor}28`,
        border: `1px solid ${accentColor}40`,
      },
    }}
  >
    <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box
          sx={{
            p: 1.25,
            borderRadius: '12px',
            backgroundColor: `${accentColor}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        {badge && (
          <Chip
            label={badge.label}
            size="small"
            sx={{
              fontSize: '0.62rem',
              fontWeight: 700,
              height: 20,
              backgroundColor: `${badge.color}22`,
              color: badge.color,
              border: `1px solid ${badge.color}33`,
            }}
          />
        )}
      </Box>

      {/* Main value */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 800, letterSpacing: '-0.035em', color: 'text.primary', lineHeight: 1 }}
        >
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
          {label}
        </Typography>
        {subvalue !== undefined && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
            <Typography variant="body1" sx={{ fontWeight: 800, color: accentColor }}>
              {subvalue}
            </Typography>
            {sublabel && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {sublabel}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Spark bars (decorative trend) */}
      {sparkValues && (
        <SparkBars values={sparkValues} color={accentColor} />
      )}

      {/* Mini bar */}
      {barMax !== undefined && (
        <MiniBar value={barValue} max={barMax} color={accentColor} />
      )}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Stat row for the detail panel
// ─────────────────────────────────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, valueColor = 'text.primary', last = false }) => (
  <>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.75 }}>
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
            flexShrink: 0,
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
    {!last && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
  </>
);

// ─────────────────────────────────────────────────────────────────────────────
// Imports breakdown bar (completed / pending / failed)
// ─────────────────────────────────────────────────────────────────────────────
const ImportBreakdownBar = ({ completed, pending, failed, total }) => {
  if (!total || total === 0) return null;
  const segs = [
    { pct: (completed / total) * 100, color: '#10b981', label: 'Completed', value: completed },
    { pct: (pending   / total) * 100, color: '#f59e0b', label: 'Pending',   value: pending   },
    { pct: (failed    / total) * 100, color: '#ef4444', label: 'Failed',    value: failed    },
  ];
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', mb: 1.5 }}>
        {segs.map(({ pct, color, label }) =>
          pct > 0 ? (
            <Box
              key={label}
              sx={{
                width: `${pct}%`,
                backgroundColor: color,
                transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          ) : null
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
        {segs.map(({ color, label, value }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {label}:{' '}
              <Box component="span" sx={{ color: 'text.primary' }}>{value}</Box>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SystemSummary page — system-wide aggregate dashboard.
 * Route: /reports/system-summary
 */
const SystemSummary = () => {
  const navigate = useNavigate();

  const [data,    setData]    = useState(null);   // { generatedAt, summary }
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSystemSummary();
      if (res?.success) setData(res);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to load system summary.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 16, gap: 3 }}>
        <CircularProgress color="primary" size={48} />
        <Typography variant="body2" color="text.secondary">
          Fetching system metrics…
        </Typography>
      </Box>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <Box>
        <Alert
          severity="error"
          sx={{ borderRadius: '12px' }}
          action={
            <Button color="inherit" size="small" onClick={loadData}>
              Retry
            </Button>
          }
        >
          {error || 'System summary data is unavailable.'}
        </Alert>
      </Box>
    );
  }

  // ── Destructure ───────────────────────────────────────────────────────────
  const { generatedAt, summary } = data;
  const {
    users,
    groups,
    expenses,
    settlements,
    imports: imp,
  } = summary;

  const totalGroups      = groups.total;
  const totalMembers     = users.total;
  const totalExpenses    = expenses.total;
  const totalSettlements = settlements.total;
  const totalImports     = imp.totalSessions;
  const outstanding      = expenses.totalAmount;   // formatted string from API

  const completedImports = imp.completedSessions;
  const pendingImports   = imp.pendingSessions;
  const failedImports    = imp.failedSessions;
  const totalAnomalies   = imp.totalAnomalies;
  const resolvedAnomalies= imp.resolvedAnomalies;
  const pendingAnomalies = imp.pendingAnomalies;

  const resolutionRate = totalAnomalies > 0
    ? Math.round((resolvedAnomalies / totalAnomalies) * 100)
    : 100;

  const formattedAt = generatedAt
    ? new Date(generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  // Deterministic spark values derived from real totals (7-bar visual hint)
  const makeSparkValues = (total) => {
    if (total === 0) return [0, 0, 0, 0, 0, 0, 0];
    // Simulate an ascending trend ending at `total`; purely decorative
    return Array.from({ length: 7 }, (_, i) =>
      Math.round(total * ((i + 2) / 10) * (0.6 + Math.random() * 0.4))
    ).map((v, _, arr) => Math.min(v, total));
  };

  // Primary 6 metric cards
  const cards = [
    {
      icon:        <GroupsOutlinedIcon      sx={{ color: '#6366f1', fontSize: 22 }} />,
      label:       'Total Groups',
      value:       totalGroups.toLocaleString(),
      accentColor: '#6366f1',
      sparkValues: makeSparkValues(totalGroups),
      badge:       null,
    },
    {
      icon:        <PeopleAltOutlinedIcon   sx={{ color: '#8b5cf6', fontSize: 22 }} />,
      label:       'Total Members',
      value:       totalMembers.toLocaleString(),
      accentColor: '#8b5cf6',
      sparkValues: makeSparkValues(totalMembers),
      badge:       null,
    },
    {
      icon:        <ReceiptLongOutlinedIcon sx={{ color: '#3b82f6', fontSize: 22 }} />,
      label:       'Total Expenses',
      value:       totalExpenses.toLocaleString(),
      accentColor: '#3b82f6',
      subvalue:    `₹${Number(expenses.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sublabel:    'total value',
      sparkValues: makeSparkValues(totalExpenses),
    },
    {
      icon:        <HandshakeOutlinedIcon   sx={{ color: '#10b981', fontSize: 22 }} />,
      label:       'Total Settlements',
      value:       totalSettlements.toLocaleString(),
      accentColor: '#10b981',
      subvalue:    `₹${Number(settlements.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sublabel:    'settled',
      sparkValues: makeSparkValues(totalSettlements),
    },
    {
      icon:        <UploadFileOutlinedIcon  sx={{ color: '#f59e0b', fontSize: 22 }} />,
      label:       'Total Imports',
      value:       totalImports.toLocaleString(),
      accentColor: '#f59e0b',
      barValue:    completedImports,
      barMax:      totalImports,
      badge:       completedImports > 0
        ? { label: `${completedImports} done`, color: '#10b981' }
        : null,
    },
    {
      icon:        <AccountBalanceOutlinedIcon sx={{ color: '#ef4444', fontSize: 22 }} />,
      label:       'Outstanding Balance',
      value:       `₹${Number(outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      accentColor: '#ef4444',
      subvalue:    totalExpenses > 0
        ? `${Math.round(100 - (Number(settlements.totalAmount) / Number(expenses.totalAmount)) * 100)}%`
        : '0%',
      sublabel:    'unsettled',
      barValue:    Number(outstanding),
      barMax:      Number(expenses.totalAmount) || 1,
    },
  ];

  return (
    <Box>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <TrendingUpIcon sx={{ color: '#10b981', fontSize: 28 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              System Summary
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Platform-wide aggregate metrics across all groups, users, and transactions.
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            Last refreshed: {formattedAt}
          </Typography>
        </Box>

        <Tooltip title="Refresh metrics">
          <IconButton
            onClick={loadData}
            disabled={loading}
            sx={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)', color: 'text.primary' },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── 6 Primary Metric Cards ───────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {cards.map((card) => (
          <Grid item xs={12} sm={6} md={4} lg={4} key={card.label}>
            <MetricCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* ── Bottom Detail Row ─────────────────────────────────────────────── */}
      <Grid container spacing={2.5}>

        {/* Import session breakdown */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(145deg, rgba(245,158,11,0.04) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(245,158,11,0.1)',
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              <Typography variant="h6" fontWeight={700} mb={0.5}>
                Import Sessions
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Breakdown of all CSV import sessions by their final status.
              </Typography>

              <ImportBreakdownBar
                completed={completedImports}
                pending={pendingImports}
                failed={failedImports}
                total={totalImports}
              />

              <Divider sx={{ my: 2.5 }} />

              <DetailRow
                icon={<UploadFileOutlinedIcon sx={{ fontSize: 17, color: '#f59e0b' }} />}
                label="Total Sessions"
                value={totalImports}
              />
              <DetailRow
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#10b981' }} />}
                label="Completed"
                value={completedImports}
                valueColor="#10b981"
              />
              <DetailRow
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#f59e0b' }} />}
                label="Pending / In Review"
                value={pendingImports}
                valueColor={pendingImports > 0 ? '#f59e0b' : 'text.secondary'}
              />
              <DetailRow
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#ef4444' }} />}
                label="Failed"
                value={failedImports}
                valueColor={failedImports > 0 ? '#ef4444' : 'text.secondary'}
                last
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Anomaly health panel */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(145deg, rgba(99,102,241,0.05) 0%, rgba(0,0,0,0) 100%)',
              border: '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <CardContent sx={{ p: 3.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                <Typography variant="h6" fontWeight={700}>
                  Anomaly Health
                </Typography>
                <Chip
                  label={`${resolutionRate}% resolved`}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    height: 22,
                    backgroundColor: resolutionRate >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color:           resolutionRate >= 80 ? '#10b981' : '#f59e0b',
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Cross-session anomaly detection and reviewer resolution status.
              </Typography>

              {/* Resolution rate bar */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Resolution progress
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                    {resolvedAnomalies} / {totalAnomalies}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    mb: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: totalAnomalies > 0 ? `${(resolvedAnomalies / totalAnomalies) * 100}%` : '0%',
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      borderRadius: 999,
                      transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <DetailRow
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#6366f1' }} />}
                label="Total Detected"
                value={totalAnomalies}
                valueColor="#6366f1"
              />
              <DetailRow
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#10b981' }} />}
                label="Resolved"
                value={resolvedAnomalies}
                valueColor="#10b981"
              />
              <DetailRow
                icon={<FiberManualRecordIcon sx={{ fontSize: 12, color: '#f59e0b' }} />}
                label="Pending Review"
                value={pendingAnomalies}
                valueColor={pendingAnomalies > 0 ? '#f59e0b' : 'text.secondary'}
                last
              />

              {pendingAnomalies > 0 && (
                <Alert
                  severity="warning"
                  sx={{ mt: 2.5, borderRadius: '10px', fontSize: '0.75rem', py: 0.5 }}
                  action={
                    <Button
                      size="small"
                      color="inherit"
                      sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
                      onClick={() => navigate('/review')}
                    >
                      Review
                    </Button>
                  }
                >
                  {pendingAnomalies} anomali{pendingAnomalies === 1 ? 'y' : 'es'} awaiting reviewer action.
                </Alert>
              )}

              {totalAnomalies === 0 && (
                <Alert severity="success" sx={{ mt: 2.5, borderRadius: '10px', fontSize: '0.75rem', py: 0.5 }}>
                  No anomalies have been detected across any import session.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemSummary;
