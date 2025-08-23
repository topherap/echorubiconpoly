// main/utils/pipelineTest.js
const memoryTracer = require('./memoryTracer');

class PipelineTestHarness {
  constructor(qlibInterface, memorySystem, factStore) {
    this.qlib = qlibInterface;
    this.memory = memorySystem;
    this.facts = factStore;
    this.results = [];
  }

  async runFullTest() {
    console.log('\n' + '='.repeat(80));
    console.log('PIPELINE INTEGRATION TEST');
    console.log('='.repeat(80));

    const testQueries = [
      // Fast-path candidates
      { query: "list my clients", expectedPath: "fast", expectedData: true },
      { query: "show my projects", expectedPath: "fast", expectedData: true },
      { query: "what's in medical?", expectedPath: "fast", expectedData: true },
      
      // Memory-dependent queries
      { query: "what are my lifts?", expectedPath: "memory", expectedData: true },
      { query: "show me recipes", expectedPath: "memory", expectedData: true },
      
      // Extraction-dependent
      { query: "tell me about Angela Smith", expectedPath: "extraction", expectedData: true },
      { query: "find the crush script", expectedPath: "extraction", expectedData: true },
      
      // Follow-up context
      { query: "what does that mean?", expectedPath: "context", expectedData: false }
    ];

    for (const test of testQueries) {
      await this.testQuery(test);
    }

    this.printReport();
  }

  async testQuery({ query, expectedPath, expectedData }) {
    console.log(`\n--- Testing: "${query}" ---`);
    const traceId = `test-${Date.now()}`;
    memoryTracer.startTrace(traceId);
    
    const result = {
      query,
      expectedPath,
      expectedData,
      actualPath: null,
      hasData: false,
      success: false,
      timing: {}
    };

    const startTime = Date.now();

    try {
      // Step 1: Q-Lib Extraction
      memoryTracer.track('TEST_EXTRACTION_START', query);
      const facts = await this.qlib.extractFacts(query);
      result.facts = facts;
      result.timing.extraction = Date.now() - startTime;
      memoryTracer.track('TEST_FACTS_EXTRACTED', facts);

      // Step 2: Determine path
      if (this.isFastPathQuery(facts)) {
        result.actualPath = 'fast';
        memoryTracer.track('TEST_PATH_SELECTED', 'fast');
      } else if (facts?.entities?.length > 0 || facts?.specifics?.length > 0) {
        result.actualPath = 'extraction';
        memoryTracer.track('TEST_PATH_SELECTED', 'extraction');
      } else if (facts?.types?.includes('memory') || query.includes('lift')) {
        result.actualPath = 'memory';
        memoryTracer.track('TEST_PATH_SELECTED', 'memory');
      } else {
        result.actualPath = 'context';
        memoryTracer.track('TEST_PATH_SELECTED', 'context');
      }

      // Step 3: Retrieve data based on path
      let data = null;
      const dataStart = Date.now();

      switch (result.actualPath) {
        case 'fast':
          data = await this.retrieveFastPath(facts);
          break;
        case 'extraction':
          data = await this.retrieveByExtraction(facts);
          break;
        case 'memory':
          data = await this.retrieveFromMemory(query);
          break;
        case 'context':
          data = { needsContext: true };
          break;
      }

      result.timing.retrieval = Date.now() - dataStart;
      result.hasData = !!(data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0));
      memoryTracer.track('TEST_DATA_RETRIEVED', { hasData: result.hasData, dataSize: JSON.stringify(data || {}).length });

      // Step 4: Validate result
      result.success = (result.actualPath === expectedPath) && 
                      (result.hasData === expectedData);

      if (!result.success) {
        console.log(`  ❌ FAILED: Expected ${expectedPath}/${expectedData}, got ${result.actualPath}/${result.hasData}`);
      } else {
        console.log(`  ✅ PASSED: ${result.actualPath} path with ${result.hasData ? 'data' : 'no data'}`);
      }

    } catch (error) {
      console.error(`  ❌ ERROR: ${error.message}`);
      result.error = error.message;
    }

    result.timing.total = Date.now() - startTime;
    memoryTracer.endTrace();
    
    this.results.push(result);
    return result;
  }

  isFastPathQuery(facts) {
    const fastPathActions = ['list', 'show', 'get'];
    const fastPathTypes = ['client', 'clients', 'project', 'projects'];
    
    return facts?.actions?.some(a => fastPathActions.includes(a)) &&
           facts?.types?.some(t => fastPathTypes.includes(t));
  }

  async retrieveFastPath(facts) {
    // Simulate fast-path retrieval
    if (facts.types.includes('client') || facts.types.includes('clients')) {
      return ['Angela Smith', 'John Doe', 'Sarah Johnson'];
    }
    if (facts.types.includes('project') || facts.types.includes('projects')) {
      return ['medical', 'clients', 'Foods'];
    }
    return [];
  }

  async retrieveByExtraction(facts) {
    // Use fact store if available
    if (this.facts && facts.entities?.[0]) {
      return this.facts.getEntity(facts.entities[0]);
    }
    return null;
  }

  async retrieveFromMemory(query) {
    // Use memory system if available
    if (this.memory) {
      const context = await this.memory.buildContextForInput(query);
      return context?.memory || [];
    }
    return [];
  }

  printReport() {
    console.log('\n' + '='.repeat(80));
    console.log('PIPELINE TEST REPORT');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const errors = this.results.filter(r => r.error).length;

    console.log(`\nResults: ${passed} passed, ${failed} failed, ${errors} errors\n`);

    // Path accuracy
    const pathStats = {};
    this.results.forEach(r => {
      if (!pathStats[r.expectedPath]) pathStats[r.expectedPath] = { correct: 0, total: 0 };
      pathStats[r.expectedPath].total++;
      if (r.actualPath === r.expectedPath) pathStats[r.expectedPath].correct++;
    });

    console.log('Path Routing Accuracy:');
    Object.entries(pathStats).forEach(([path, stats]) => {
      const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
      console.log(`  ${path}: ${accuracy}% (${stats.correct}/${stats.total})`);
    });

    // Timing analysis
    console.log('\nTiming Analysis:');
    const avgExtraction = this.average(this.results.map(r => r.timing?.extraction || 0));
    const avgRetrieval = this.average(this.results.map(r => r.timing?.retrieval || 0));
    const avgTotal = this.average(this.results.map(r => r.timing?.total || 0));
    
    console.log(`  Avg Extraction: ${avgExtraction.toFixed(0)}ms`);
    console.log(`  Avg Retrieval: ${avgRetrieval.toFixed(0)}ms`);
    console.log(`  Avg Total: ${avgTotal.toFixed(0)}ms`);

    // Failed queries detail
    if (failed > 0) {
      console.log('\nFailed Queries:');
      this.results.filter(r => !r.success && !r.error).forEach(r => {
        console.log(`  "${r.query}"`);
        console.log(`    Expected: ${r.expectedPath}/${r.expectedData}`);
        console.log(`    Got: ${r.actualPath}/${r.hasData}`);
        if (r.facts) {
          console.log(`    Facts: ${JSON.stringify(r.facts)}`);
        }
      });
    }

    return { passed, failed, errors };
  }

  average(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / (numbers.length || 1);
  }
}

// Export for use
module.exports = PipelineTestHarness;