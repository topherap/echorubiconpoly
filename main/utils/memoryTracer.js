// main/utils/memoryTracer.js
class MemoryTracer {
  constructor() {
    this.traces = [];
    this.currentTrace = null;
  }

  startTrace(queryId) {
    this.currentTrace = {
      id: queryId,
      query: null,
      points: [],
      startTime: Date.now()
    };
    this.traces.push(this.currentTrace);
    console.log(`\n${'='.repeat(60)}\n[TRACE START] ${queryId}\n${'='.repeat(60)}`);
  }

  track(location, data, metadata = {}) {
    if (!this.currentTrace) return;
    
    const point = {
      location,
      timestamp: Date.now() - this.currentTrace.startTime,
      hasData: !!data,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      size: this.getSize(data),
      sample: this.getSample(data),
      ...metadata
    };
    
    this.currentTrace.points.push(point);
    
    // Real-time logging
    console.log(`[${point.timestamp}ms] ${location}`);
    console.log(`  Type: ${point.dataType}, Size: ${point.size}, Has Data: ${point.hasData}`);
    if (point.sample) console.log(`  Sample: ${point.sample}`);
  }

  getSize(data) {
    if (!data) return 0;
    if (typeof data === 'string') return data.length;
    if (Array.isArray(data)) return data.length;
    try {
      return JSON.stringify(data).length;
    } catch {
      return -1;
    }
  }

  getSample(data) {
    if (!data) return 'null/undefined';
    if (typeof data === 'string') return data.substring(0, 100) + (data.length > 100 ? '...' : '');
    if (Array.isArray(data)) return `[Array with ${data.length} items]`;
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`;
    }
    return String(data).substring(0, 100);
  }

  endTrace() {
    if (!this.currentTrace) return;
    
    const duration = Date.now() - this.currentTrace.startTime;
    console.log(`\n[TRACE END] Duration: ${duration}ms`);
    console.log(`Points tracked: ${this.currentTrace.points.length}`);
    
    // Show the full pipeline flow
    console.log('\n--- PIPELINE FLOW ---');
    this.currentTrace.points.forEach(p => {
      const marker = p.hasData ? '✓' : '✗';
      console.log(`${marker} [${p.timestamp}ms] ${p.location} (${p.size} bytes)`);
    });
    
    // Identify breaks
    const breaks = this.currentTrace.points.filter(p => !p.hasData);
    if (breaks.length > 0) {
      console.log('\n⚠️  PIPELINE BREAKS AT:');
      breaks.forEach(b => console.log(`  - ${b.location}`));
    }
    
    console.log('='.repeat(60));
    this.currentTrace = null;
  }

  dump() {
    return this.traces;
  }
}

global.memoryTracer = new MemoryTracer();
module.exports = global.memoryTracer;