const NodeCache = require('node-cache');
const axios = require('axios');

// Cache initialization
const modelCache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const benchmarkCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

// Global model registry
let globalModelRegistry = {
  cloud: [],
  local: []
};

// Benchmarking data storage
let modelBenchmarks = {
  responseTime: {},
  tokensPerSecond: {},
  successRate: {},
  qualityScores: {}
};

// In-memory performance tracking
const modelPerformanceStats = {
  requestCount: {},
  successCount: {},
  totalResponseTime: {},
  lastUsed: {}
};

// Fetch models from remote registry if available
async function fetchModelRegistry() {
  // Check cache first
  const cachedRegistry = modelCache.get('modelRegistry');
  if (cachedRegistry) {
    console.log(`✅ Using cached model registry`);
    return cachedRegistry;
  }

  const registryUrl = process.env.MODEL_REGISTRY_URL;
  if (!registryUrl) {
    console.log(`📦 Using local model registry`);
    // Return a hardcoded registry with recommended models
    const localRegistry = {
      models: [],
      grouped: {
        installed: [], // Will be populated by Ollama check
        recommended: [
          {
            name: 'llama3.2:3b',
            label: 'Llama 3.2 (3B)',
            value: 'llama3.2:3b',
            provider: 'Ollama',
            type: 'local',
            size: '2.0GB',
            description: 'Latest Llama model, very efficient',
            useCase: 'general purpose, fast responses',
            speed: 'very fast',
            quality: 'very good',
            minRAM: '4GB',
            recommended: true
          },
          {
            name: 'mistral:7b',
            label: 'Mistral (7B)',
            value: 'mistral:7b',
            provider: 'Ollama',
            type: 'local',
            size: '4.1GB',
            description: 'Excellent balance of speed and quality',
            useCase: 'general purpose, creative writing',
            speed: 'fast',
            quality: 'excellent',
            minRAM: '8GB',
            recommended: true
          },
          {
            name: 'phi3:mini',
            label: 'Phi-3 Mini',
            value: 'phi3:mini',
            provider: 'Ollama',
            type: 'local',
            size: '2.3GB',
            description: 'Microsoft\'s efficient small model',
            useCase: 'quick tasks, low resource usage',
            speed: 'very fast',
            quality: 'good',
            minRAM: '4GB',
            recommended: true
          }
        ],
        coding: [
          {
            name: 'codellama:7b',
            label: 'Code Llama (7B)',
            value: 'codellama:7b',
            provider: 'Ollama',
            type: 'local',
            size: '3.8GB',
            description: 'Specialized for coding tasks',
            useCase: 'programming, code generation',
            speed: 'fast',
            quality: 'excellent for code',
            minRAM: '8GB'
          },
          {
            name: 'deepseek-coder:6.7b',
            label: 'DeepSeek Coder',
            value: 'deepseek-coder:6.7b',
            provider: 'Ollama',
            type: 'local',
            size: '3.8GB',
            description: 'Excellent code completion model',
            useCase: 'code completion, debugging',
            speed: 'fast',
            quality: 'excellent for code',
            minRAM: '8GB'
          }
        ],
        available: [
          {
            name: 'granite3.3:2b',
            label: 'Llama 3.2 (1B)',
            value: 'granite3.3:2b',
            provider: 'Ollama',
            type: 'local',
            size: '1.3GB',
            description: 'Tiny but capable model',
            useCase: 'ultra-fast responses, limited RAM',
            speed: 'very fast',
            quality: 'good',
            minRAM: '2GB'
          },
          {
            name: 'gemma2:9b',
            label: 'Gemma 2 (9B)',
            value: 'gemma2:9b',
            provider: 'Ollama',
            type: 'local',
            size: '5.5GB',
            description: 'Google\'s latest open model',
            useCase: 'general purpose, reasoning',
            speed: 'moderate',
            quality: 'excellent',
            minRAM: '16GB'
          }
        ]
      }
    };
    
    // Cache it
    modelCache.set('modelRegistry', localRegistry);
    return localRegistry;
  }

  try {
    console.log(`Fetching model registry from ${registryUrl}`);
    const response = await axios.get(registryUrl, { timeout: 5000 });
    if (response.status === 200 && response.data) {
      console.log(`✅ Remote model registry fetched successfully`);
      
      // Store in cache
      modelCache.set('modelRegistry', response.data);
      return response.data;
    }
  } catch (error) {
    console.error(`Failed to fetch model registry:`, error.message);
  }
  
  return null;
}

module.exports = {
  modelCache,
  benchmarkCache,
  globalModelRegistry,
  modelBenchmarks,
  modelPerformanceStats,
  fetchModelRegistry
};