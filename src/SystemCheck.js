// src/SystemCheck.js - System Capability Detection for Echo Rubicon

const SystemCheck = {
  // Run all checks and return capabilities + recommendations
  async runFullCheck() {
    console.log('🔍 Starting Echo Rubicon system check...');
    
    const capabilities = {
      timestamp: new Date().toISOString(),
      system: await this.checkSystem(),
      memory: await this.checkMemory(),
      cpu: await this.checkCPU(),
      storage: await this.checkStorage(),
      ollama: await this.checkOllama(),
      gpu: await this.checkGPU()
    };
    
    // Generate recommendations based on what we found
    capabilities.recommendations = this.generateRecommendations(capabilities);
    capabilities.tier = this.calculateSystemTier(capabilities);
    
    console.log('✅ System check complete:', capabilities);
    return capabilities;
  },
  
  // Basic system info
  async checkSystem() {
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      cores: navigator.hardwareConcurrency || 2
    };
  },
  
  // Memory detection
  async checkMemory() {
    const result = {
      detected: false,
      total: 4, // Default assumption
      available: 2,
      tier: 'low'
    };
    
    try {
      // Method 1: Chrome's memory API
      if (performance.memory) {
        const totalBytes = performance.memory.jsHeapSizeLimit;
        const usedBytes = performance.memory.usedJSHeapSize;
        
        result.total = Math.round(totalBytes / (1024 * 1024 * 1024) * 10) / 10;
        result.available = Math.round((totalBytes - usedBytes) / (1024 * 1024 * 1024) * 10) / 10;
        result.detected = true;
      }
      
      // Method 2: Navigator deviceMemory (limited but useful)
      if (navigator.deviceMemory) {
        result.deviceMemory = navigator.deviceMemory;
        if (!result.detected) {
          result.total = navigator.deviceMemory;
          result.available = navigator.deviceMemory * 0.5; // Assume 50% available
        }
        result.detected = true;
      }
      
      // Calculate tier
      if (result.total >= 16) {
        result.tier = 'high';
      } else if (result.total >= 8) {
        result.tier = 'medium';
      } else {
        result.tier = 'low';
      }
      
    } catch (error) {
      console.error('Memory detection error:', error);
    }
    
    return result;
  },
  
  // CPU benchmark
  async checkCPU() {
    const cores = navigator.hardwareConcurrency || 2;
    
    // Simple performance test
    console.log('Running CPU benchmark...');
    const iterations = 1000000;
    const start = performance.now();
    
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i);
    }
    
    const duration = performance.now() - start;
    
    return {
      cores: cores,
      benchmark: duration,
      speed: duration < 20 ? 'fast' : duration < 100 ? 'medium' : 'slow',
      multithreading: cores > 2
    };
  },
  
  // Storage availability
  async checkStorage() {
    const result = {
      available: false,
      quotaGB: 0,
      usedGB: 0,
      freeGB: 0
    };
    
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        result.available = true;
        result.quotaGB = Math.round(estimate.quota / (1024 * 1024 * 1024) * 10) / 10;
        result.usedGB = Math.round(estimate.usage / (1024 * 1024 * 1024) * 10) / 10;
        result.freeGB = result.quotaGB - result.usedGB;
      }
    } catch (error) {
      console.error('Storage check error:', error);
    }
    
    return result;
  },
  
  // Check if Ollama is running and what models are available
  async checkOllama() {
    const result = {
      available: false,
      responsive: false,
      models: [],
      recommended: null,
      categories: {
        tiny: [],    // < 1GB
        small: [],   // 1-3GB  
        medium: [],  // 3-7GB
        large: []    // 7GB+
      }
    };
    
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        result.available = true;
        result.responsive = true;
        
        if (data.models && Array.isArray(data.models)) {
          result.models = data.models.map(m => ({
            name: m.name,
            size: m.size,
            sizeGB: Math.round(m.size / (1024 * 1024 * 1024) * 10) / 10
          }));
          
          // Categorize by size
          result.models.forEach(model => {
            if (model.sizeGB < 1) {
              result.categories.tiny.push(model.name);
            } else if (model.sizeGB < 3) {
              result.categories.small.push(model.name);
            } else if (model.sizeGB < 7) {
              result.categories.medium.push(model.name);
            } else {
              result.categories.large.push(model.name);
            }
          });
        }
      }
    } catch (error) {
      console.log('Ollama not available:', error.message);
    }
    
    return result;
  },
  
  // GPU detection
  async checkGPU() {
    const result = {
      webgl: false,
      webgl2: false,
      gpu: 'Unknown'
    };
    
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      
      if (gl) {
        result.webgl2 = true;
        result.webgl = true;
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          result.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      } else {
        const gl1 = canvas.getContext('webgl');
        if (gl1) {
          result.webgl = true;
        }
      }
    } catch (error) {
      console.error('GPU detection error:', error);
    }
    
    return result;
  },
  
  // Calculate overall system tier
  calculateSystemTier(caps) {
    let score = 0;
    
    // Memory scoring (most important)
    if (caps.memory.tier === 'high') score += 3;
    else if (caps.memory.tier === 'medium') score += 2;
    else score += 1;
    
    // CPU scoring
    if (caps.cpu.speed === 'fast') score += 2;
    else if (caps.cpu.speed === 'medium') score += 1;
    
    // Bonus points
    if (caps.ollama.available) score += 1;
    if (caps.cpu.cores >= 4) score += 1;
    if (caps.storage.freeGB > 10) score += 1;
    
    // Final tier
    if (score >= 7) return 'premium';
    if (score >= 5) return 'standard';
    if (score >= 3) return 'basic';
    return 'minimal';
  },
  
  // Generate specific recommendations
  generateRecommendations(caps) {
    const rec = {
      features: [],
      warnings: [],
      settings: {}
    };
    
    // Base settings for all systems
    rec.settings = {
      enableSearch: true,
      searchType: 'keyword',
      cacheStrategy: 'disk',
      maxCacheSize: 100,
      backgroundWorkers: 1,
      chunkSize: 10
    };
    
    // Tier-based recommendations
    switch (caps.tier) {
      case 'premium':
        rec.features.push(
          '✅ Semantic search with embeddings',
          '✅ Local AI enhancement',
          '✅ Real-time relationship mapping',
          '✅ Parallel processing',
          '✅ Large in-memory cache'
        );
        rec.settings.searchType = 'semantic';
        rec.settings.cacheStrategy = 'memory';
        rec.settings.maxCacheSize = 500;
        rec.settings.backgroundWorkers = caps.cpu.cores - 1;
        rec.settings.enableEmbeddings = true;
        rec.settings.embeddingModel = 'Xenova/all-MiniLM-L6-v2';
        
        if (caps.ollama.available && caps.ollama.categories.small.length > 0) {
          rec.settings.enableLocalLLM = true;
          rec.settings.localLLMModel = caps.ollama.categories.small[0];
        }
        break;
        
      case 'standard':
        rec.features.push(
          '✅ Enhanced keyword search',
          '✅ Basic categorization',
          '✅ Moderate caching',
          '✅ Background indexing'
        );
        rec.settings.searchType = 'enhanced';
        rec.settings.cacheStrategy = 'hybrid';
        rec.settings.maxCacheSize = 200;
        rec.settings.backgroundWorkers = 2;
        
        if (caps.memory.total >= 8) {
          rec.features.push('✅ Limited semantic search');
          rec.settings.enableEmbeddings = true;
          rec.settings.embeddingBatchSize = 5;
        }
        
        if (caps.ollama.available && caps.ollama.categories.tiny.length > 0) {
          rec.settings.enableQueryExpansion = true;
          rec.settings.queryModel = caps.ollama.categories.tiny[0];
        }
        break;
        
      case 'basic':
        rec.features.push(
          '✅ Fast keyword search',
          '✅ File-based caching',
          '✅ Basic organization'
        );
        rec.warnings.push(
          '⚠️ Limited memory - some features disabled',
          '⚠️ Search limited to keywords only'
        );
        rec.settings.chunkSize = 5;
        break;
        
      case 'minimal':
        rec.features.push(
          '✅ Basic file search',
          '✅ Minimal memory usage'
        );
        rec.warnings.push(
          '⚠️ System resources very limited',
          '⚠️ Only essential features enabled',
          '⚠️ Consider closing other applications'
        );
        rec.settings.backgroundWorkers = 0;
        rec.settings.chunkSize = 3;
        break;
    }
    
    // Specific warnings
    if (caps.memory.total < 4) {
      rec.warnings.push('⚠️ Very low RAM detected - performance will be limited');
    }
    
    if (!caps.ollama.available) {
      rec.warnings.push('💡 Install Ollama for AI-enhanced features');
    }
    
    if (caps.storage.freeGB < 1) {
      rec.warnings.push('⚠️ Low disk space - caching will be limited');
    }
    
    return rec;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemCheck;
} else {
  window.SystemCheck = SystemCheck;
}