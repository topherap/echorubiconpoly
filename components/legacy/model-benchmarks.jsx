import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  Card, 
  CardContent, 
  CardHeader,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Badge,
  Tooltip
} from '@mui/material';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts';

// Constants
const DEFAULT_SORT = 'qualityScore';
const DEFAULT_TAG = '#supplements';
const AVAILABLE_TAGS = [
  '#supplements',
  '#health',
  '#workouts',
  '#cats-cradle',
  '#baby-names'
];

/**
 * ModelBenchmarks Component
 * Displays performance metrics and benchmark data for AI models
 */
const ModelBenchmarks = ({ 
  sortBy = DEFAULT_SORT, 
  filterByTag,
  onTagSelect
}) => {
  // State hooks
  const [modelData, setModelData] = useState([]);
  const [benchmarks, setBenchmarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState(sortBy);
  const [selectedTag, setSelectedTag] = useState(filterByTag || DEFAULT_TAG);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Use Electron's ipcRenderer to fetch data
        const performanceData = await window.electron.ipcRenderer.invoke('get-model-performance');
        const benchmarkData = await window.electron.ipcRenderer.invoke('get-model-benchmarks');
        
        setModelData(performanceData);
        setBenchmarks(benchmarkData);
        
        // Log to Obsidian with the selected tag
        logToObsidianMaster(performanceData, selectedTag);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching model data:', err);
        setError('Failed to load model data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTag]);

  // Function to log data to Obsidian with tagging
  const logToObsidianMaster = (data, tag) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();
      
      // Create snapshot summary for Obsidian
      const snapshot = {
        timestamp: timestamp,
        tag: tag,
        date: today,
        modelCount: data.length,
        models: data.map(model => ({
          name: model.name,
          successRate: model.successRate,
          qualityScore: model.qualityScore,
          requestCount: model.requestCount
        }))
      };
      
      // Call the function to log to Obsidian
      window.electron.ipcRenderer.invoke('logToObsidianMaster', snapshot);
      
      console.log(`Logged benchmark snapshot to Obsidian with tag: ${tag}`);
    } catch (err) {
      console.error('Error logging to Obsidian:', err);
    }
  };

  // Handle tag selection change
  const handleTagChange = (event) => {
    const newTag = event.target.value;
    setSelectedTag(newTag);
    
    // Call the parent callback if provided
    if (onTagSelect) {
      onTagSelect(newTag);
    }
  };

  // Handle sort option change
  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  // Sort and filter models based on current options
  const sortedModels = useMemo(() => {
    if (!modelData || modelData.length === 0) return [];
    
    return [...modelData].sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'successRate':
          return b.successRate - a.successRate;
        case 'responseTime':
          return a.avgResponseTime - b.avgResponseTime;
        case 'qualityScore':
          return b.qualityScore - a.qualityScore;
        case 'reasoningScore':
          return b.reasoningScore - a.reasoningScore;
        case 'recentlyUsed':
          return new Date(b.lastUsed) - new Date(a.lastUsed);
        default:
          return 0;
      }
    });
  }, [modelData, sortOption]);

  // Helper function to get last 5 benchmark entries for a model
  const getRecentBenchmarks = (modelId) => {
    if (!benchmarks || !benchmarks[modelId]) return [];
    return benchmarks[modelId].slice(-5);
  };

  // Render model tier badge
  const renderTierBadge = (tier) => {
    let color = 'default';
    
    switch (tier.toLowerCase()) {
      case 'premium':
        color = 'primary';
        break;
      case 'pro':
        color = 'secondary';
        break;
      case 'enterprise':
        color = 'error';
        break;
      case 'free':
        color = 'success';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        label={tier} 
        color={color} 
        size="small" 
        sx={{ mr: 1 }}
      />
    );
  };

  // Render sparkline chart for benchmarks
  const renderSparkline = (modelId, metricKey) => {
    const recentData = getRecentBenchmarks(modelId);
    
    if (!recentData || recentData.length === 0) {
      return <Typography variant="caption">No benchmark data</Typography>;
    }
    
    const chartData = recentData.map((entry, index) => ({
      index: index + 1,
      value: entry[metricKey] || 0
    }));
    
    return (
      <ResponsiveContainer width="100%" height={60}>
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#8884d8" 
            dot={false} 
            isAnimationActive={false}
          />
          <RechartsTooltip 
            formatter={(value) => [`${value}`, metricKey]} 
            labelFormatter={() => ''}
          />
          <YAxis domain={['auto', 'auto']} hide />
          <XAxis dataKey="index" hide />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  // Render benchmark table
  const renderBenchmarkTable = (modelId) => {
    const recentData = getRecentBenchmarks(modelId);
    
    if (!recentData || recentData.length === 0) {
      return <Typography variant="caption">No benchmark data</Typography>;
    }
    
    return (
      <TableContainer component={Paper} sx={{ maxHeight: 150 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell align="right">Quality</TableCell>
              <TableCell align="right">Reasoning</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentData.map((entry, idx) => (
              <TableRow key={idx}>
                <TableCell component="th" scope="row">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">{entry.qualityScore}</TableCell>
                <TableCell align="right">{entry.reasoningScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Model Benchmarks
      </Typography>

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortOption}
            onChange={handleSortChange}
            label="Sort By"
          >
            <MenuItem value="name">Alphabetical</MenuItem>
            <MenuItem value="successRate">Success Rate</MenuItem>
            <MenuItem value="qualityScore">Quality Score</MenuItem>
            <MenuItem value="reasoningScore">Reasoning Score</MenuItem>
            <MenuItem value="responseTime">Response Time</MenuItem>
            <MenuItem value="recentlyUsed">Recently Used</MenuItem>
          </Select>
        </FormControl>

        <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Tag</InputLabel>
          <Select
            value={selectedTag}
            onChange={handleTagChange}
            label="Tag"
          >
            {AVAILABLE_TAGS.map((tag) => (
              <MenuItem key={tag} value={tag}>{tag}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Model Cards */}
      <Grid container spacing={3}>
        {sortedModels.map((model) => (
          <Grid item xs={12} md={6} lg={4} key={model.id}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6" noWrap sx={{ maxWidth: '70%' }}>
                      {model.name}
                    </Typography>
                    <Box>
                      {renderTierBadge(model.tier)}
                      <Chip 
                        label={model.type} 
                        variant="outlined" 
                        size="small" 
                      />
                    </Box>
                  </Box>
                }
                subheader={
                  <Typography variant="caption" color="textSecondary">
                    {model.provider} • Last used: {new Date(model.lastUsed).toLocaleString()}
                  </Typography>
                }
              />
              
              <CardContent>
                {/* Key Metrics */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={4}>
                    <Tooltip title="Success Rate">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">Success</Typography>
                        <Typography variant="h6">
                          {(model.successRate * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Tooltip title="Quality Score from Benchmarks">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">Quality</Typography>
                        <Typography variant="h6">
                          {model.qualityScore.toFixed(1)}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Tooltip title="Average Response Time">
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">Time</Typography>
                        <Typography variant="h6">
                          {model.avgResponseTime}ms
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Grid>
                </Grid>

                {/* Additional Metrics */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2">
                    Reasoning Score: {model.reasoningScore.toFixed(1)}
                  </Typography>
                  <Typography variant="body2">
                    Requests: {model.requestCount}
                  </Typography>
                </Box>

                {/* Benchmark Visualizations */}
                <Typography variant="subtitle2" gutterBottom>
                  Recent Benchmarks
                </Typography>
                
                <Box sx={{ height: 150 }}>
                  {model.visualPreference === 'chart' ? 
                    renderSparkline(model.id, 'qualityScore') : 
                    renderBenchmarkTable(model.id)
                  }
                </Box>
                
                {/* Capabilities */}
                <Box sx={{ mt: 2 }}>
                  {model.capabilities && model.capabilities.map((capability) => (
                    <Chip 
                      key={capability}
                      label={capability}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

ModelBenchmarks.propTypes = {
  sortBy: PropTypes.oneOf(['name', 'successRate', 'responseTime', 'qualityScore', 'reasoningScore', 'recentlyUsed']),
  filterByTag: PropTypes.string,
  onTagSelect: PropTypes.func
};

export default ModelBenchmarks;