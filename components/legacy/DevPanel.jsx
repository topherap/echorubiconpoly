import React, { useState, useEffect } from 'react';
import '../css/DevPanel.css';
import { 
  
  Card, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Switch, 
  FormControlLabel,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  Box,
  Alert
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SettingsIcon from '@mui/icons-material/Settings';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import './css/devpanel.css'; // inside DevPanel.jsx
import { useDevPanel } from './utils/hotkey-logic'; // inside MyAI.jsx

/**
 * DevPanel - Developer Tools Section
 * Only accessible via hidden hotkey (e.g. Ctrl+Shift+D or ::devmode prompt)
 * Includes model metrics, benchmarking toggles, Obsidian sync controls, and diagnostic logs
 */
export default function DevPanel({
  modelStats = [],
  onForceSync = () => console.warn('onForceSync not implemented'),
  onClearCache = () => console.warn('onClearCache not implemented'),
  debugLogs = [],
  showAdvanced = false,
  toggleAdvanced = () => console.warn('toggleAdvanced not implemented'),
  onExportJSON = () => console.warn('onExportJSON not implemented')
}) {
  const [models, setModels] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [currentNoteFile, setCurrentNoteFile] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch initial model performance data
  useEffect(() => {
    const fetchModelData = async () => {
      try {
        const performanceData = await window.electron.ipcRenderer.invoke('get-model-performance');
        setModels(sortModelData(performanceData));
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch model performance data:', error);
        setLoading(false);
      }
    };

    // Check if we have props data, otherwise fetch from electron
    if (modelStats && modelStats.length > 0) {
      setModels(sortModelData(modelStats));
      setLoading(false);
    } else {
      fetchModelData();
    }
  }, [modelStats]);

  // Fetch benchmark data when advanced mode is toggled on
  useEffect(() => {
    const fetchBenchmarkData = async () => {
      if (showAdvanced && !benchmarks) {
        try {
          const data = await window.electron.ipcRenderer.invoke('get-model-benchmarks');
          setBenchmarks(data);
        } catch (error) {
          console.error('Failed to fetch benchmark data:', error);
        }
      }
    };
    
    fetchBenchmarkData();
  }, [showAdvanced, benchmarks]);

  // Sort model data by success rate (descending)
  const sortModelData = (data) => {
    return [...data].sort((a, b) => b.successRate - a.successRate);
  };

  // Identify the best/worst performing models
  const getBestPerformer = () => models.length > 0 ? models[0].name : null;
  const getSlowestModel = () => {
    if (models.length === 0) return null;
    return models.reduce((slowest, current) => 
      current.avgResponseTime > slowest.avgResponseTime ? current : slowest
    ).name;
  };
  const getLowestQuality = () => {
    if (models.length === 0) return null;
    return models.reduce((lowest, current) => 
      current.successRate < lowest.successRate ? current : lowest
    ).name;
  };

  // Handle manual refresh of model data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const performanceData = await window.electron.ipcRenderer.invoke('get-model-performance');
      setModels(sortModelData(performanceData));
      
      if (showAdvanced) {
        const benchmarkData = await window.electron.ipcRenderer.invoke('get-model-benchmarks');
        setBenchmarks(benchmarkData);
      }
    } catch (error) {
      console.error('Failed to refresh model data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle manual sync to Obsidian
  const handleObsidianSync = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('logToObsidianMaster');
      setLastSyncTime(new Date().toLocaleString());
      setCurrentNoteFile(result.filename || 'myai-stats.md');
      if (onForceSync) onForceSync(result);
    } catch (error) {
      console.error('Failed to sync to Obsidian:', error);
    }
  };

  // Handle clear cache button
  const handleClearCache = () => {
    if (onClearCache) onClearCache();
  };

  // Handle export JSON
  const handleExportJSON = () => {
    const exportData = {
      models,
      benchmarks: benchmarks || {},
      exportDate: new Date().toISOString()
    };
    
    // Create a blob and download the JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `myai-benchmarks-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (onExportJSON) onExportJSON(exportData);
  };

  // Handle global registry refresh
  const handleGlobalRegistryRefresh = async () => {
    try {
      await window.electron.ipcRenderer.invoke('refresh-global-registry');
      // Refresh model data after registry refresh
      handleRefresh();
    } catch (error) {
      console.error('Failed to refresh global registry:', error);
    }
  };

  return (
    <Card className='dev-panel'>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          🛠️ Developer Tools
        </Typography>
        <FormControlLabel
          control={
            <Switch 
              checked={showAdvanced} 
              onChange={toggleAdvanced}
              color="primary"
            />
          }
          label="Advanced Metrics"
        />
      </Box>
      <Divider />
      
      {/* Debug Utilities Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
          ⚙️ Debug Utilities
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            startIcon={<SyncIcon />} 
            onClick={handleObsidianSync}
            size="small"
          >
            Force Obsidian Sync
          </Button>
          <Button 
            variant="contained" 
            startIcon={<DeleteSweepIcon />} 
            onClick={handleClearCache}
            size="small"
            color="warning"
          >
            Clear Model Cache
          </Button>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={handleGlobalRegistryRefresh}
            size="small"
            color="secondary"
          >
            Refresh Registry
          </Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={handleExportJSON}
            size="small"
            color="info"
          >
            Export Benchmark JSON
          </Button>
        </Box>
        
        {/* Obsidian Sync Info */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" component="div">
            <strong>Obsidian Note:</strong> {currentNoteFile || 'Not synced yet'}
          </Typography>
          <Typography variant="body2" component="div">
            <strong>Last Sync:</strong> {lastSyncTime || 'Never'}
          </Typography>
        </Box>
      </Box>
      <Divider />
      
      {/* Model Stats Table */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3">
            📈 Model Stats
          </Typography>
          <Tooltip title="Refresh Model Stats">
            <IconButton size="small" onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        {loading ? (
          <Typography variant="body1">Loading model statistics...</Typography>
        ) : models.length === 0 ? (
          <Alert severity="info">No model stats available. Try refreshing.</Alert>
        ) : (
          <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Model Name</TableCell>
                  <TableCell align="right">Success Rate</TableCell>
                  <TableCell align="right">Avg Response Time</TableCell>
                  <TableCell align="right">Requests</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {models.map((model, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell component="th" scope="row">
                      {model.name}
                      {model.name === getBestPerformer() && (
                        <Chip 
                          label="✅ Best" 
                          size="small" 
                          color="success" 
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {model.name === getSlowestModel() && (
                        <Chip 
                          label="⏱ Slow" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                      {model.name === getLowestQuality() && (
                        <Chip 
                          label="⚠️ Low Quality" 
                          size="small" 
                          color="error" 
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {model.successRate?.toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {model.avgResponseTime}ms
                    </TableCell>
                    <TableCell align="right">
                      {model.requestCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      <Divider />
      
      {/* Debug Logs Section */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
          📄 Debug Logs
        </Typography>
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 1,
            height: 150, 
            overflow: 'auto', 
            bgcolor: 'black',
            color: 'lightgreen',
            fontFamily: 'monospace',
            fontSize: '0.75rem' 
          }}
        >
          {debugLogs.length > 0 ? (
            debugLogs.map((line, i) => (
              <pre key={i} style={{ margin: 0 }}>{line}</pre>
            ))
          ) : (
            <Typography variant="body2" sx={{ color: 'gray' }}>No logs available.</Typography>
          )}
        </Paper>
      </Box>
      
      {/* Advanced Metrics Section - only visible when showAdvanced is true */}
      {showAdvanced && benchmarks && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              🧪 Advanced Metrics
            </Typography>
            
            {/* Latency Histogram */}
            <Typography variant="subtitle2" gutterBottom>
              Latency Distribution (ms)
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={benchmarks.latencyHistogram || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Reasoning Score Graph */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Reasoning Score by Model
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={benchmarks.reasoningScores || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis domain={[0, 10]} />
                <RechartsTooltip />
                <Bar dataKey="score" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Token Usage Chart */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              Token Usage Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={benchmarks.tokenUsage || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="input" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="output" stroke="#82ca9d" />
                <Line type="monotone" dataKey="total" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </>
      )}
      
      {/* Footer with attribution */}
      <Box sx={{ p: 1, bgcolor: 'background.paper', borderTop: '1px solid rgba(0,0,0,0.12)', fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center' }}>
        MyAI DevPanel • Press Ctrl+Shift+D to hide
      </Box>
    </Card>
  );
}
