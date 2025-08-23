/**
 * BrainRouter - Multi-Brain Query Routing System
 * Routes user queries to specialized AI models based on content analysis
 */

const path = require('path');
const routePatterns = require('./routePatterns');

class BrainRouter {
  constructor() {
    this.config = require('./brainConfig.json');
    this.models = this.config.models;
    this.fallbackModel = this.config.fallbackModel;
    this.routerEnabled = this.config.routerEnabled;
    
    // Initialize routing statistics
    this.stats = {
      totalRoutes: 0,
      routesByModel: {},
      averageConfidence: 0
    };
    
    this.trace('brain-router', 'BrainRouter initialized', {
      modelsAvailable: Object.keys(this.models),
      routerEnabled: this.routerEnabled
    });
  }

  /**
   * Main routing function - analyzes query and returns routing decision
   * @param {string} query - User's input query
   * @param {object} context - Context including lastFileContent, conversationHistory, etc.
   * @returns {object} - { model, role, confidence, reasoning }
   */
  async routeQuery(query, context = {}) {
    this.trace('brain-router', 'Routing query', { 
      query: query.substring(0, 100), 
      hasContext: !!context,
      contextKeys: Object.keys(context)
    });

    // If router is disabled, use fallback
    if (!this.routerEnabled) {
      return {
        model: this.fallbackModel,
        role: 'conversationalist',
        confidence: 1.0,
        reasoning: 'Router disabled, using fallback'
      };
    }

    const routingScores = this.analyzeQuery(query, context);
    const bestRoute = this.selectBestRoute(routingScores);
    
    // Update statistics
    this.updateStats(bestRoute);
    
    this.trace('brain-router', 'Routing decision', {
      query: query.substring(0, 50),
      selectedModel: bestRoute.model,
      selectedRole: bestRoute.role,
      confidence: bestRoute.confidence,
      reasoning: bestRoute.reasoning
    });

    return bestRoute;
  }

  /**
   * Analyze query against all brain patterns
   */
  analyzeQuery(query, context) {
    const queryLower = query.toLowerCase().trim();
    const scores = {};

    // Initialize scores for each brain type
    Object.keys(this.models).forEach(brain => {
      scores[brain] = {
        score: 0,
        matches: [],
        contextBonus: 0
      };
    });

    // Pattern matching for each brain type
    this.scoreClerkPatterns(queryLower, context, scores);
    this.scoreReaderPatterns(queryLower, context, scores);
    this.scoreAnalystPatterns(queryLower, context, scores);
    this.scoreConversationalistPatterns(queryLower, context, scores);

    // Apply context bonuses
    this.applyContextBonuses(query, context, scores);

    return scores;
  }

  /**
   * Score patterns for Clerk brain (lists, navigation, file selection)
   */
  scoreClerkPatterns(query, context, scores) {
    // Add safety checks for pattern structure
    if (!routePatterns || !routePatterns.clerk) {
      this.trace('brain-router', 'ERROR: routePatterns.clerk not available', { routePatterns: typeof routePatterns });
      return;
    }

    const clerkPatterns = routePatterns.clerk;
    let totalScore = 0;
    let matches = [];

    // Check direct patterns with safety checks
    if (clerkPatterns.direct && Array.isArray(clerkPatterns.direct)) {
      clerkPatterns.direct.forEach((pattern, index) => {
        if (pattern && pattern.regex && typeof pattern.regex.test === 'function') {
          try {
            if (pattern.regex.test(query)) {
              totalScore += (pattern.weight || 0.5);
              matches.push(pattern.name || `pattern_${index}`);
            }
          } catch (err) {
            this.trace('brain-router', 'Pattern test error', { error: err.message, index });
          }
        }
      });
    }

    // Special handling for number-only inputs (file selection)
    if (/^\d+$/.test(query.trim())) {
      totalScore += 0.9; // High confidence for number selection
      matches.push('number_selection');
    }

    // Check for list-related keywords with safety checks
    if (clerkPatterns.keywords && Array.isArray(clerkPatterns.keywords)) {
      clerkPatterns.keywords.forEach(keyword => {
        if (query.includes(keyword)) {
          totalScore += 0.3;
          matches.push(`keyword_${keyword}`);
        }
      });
    }

    scores.clerk.score = Math.min(totalScore, 1.0);
    scores.clerk.matches = matches;
  }

  /**
   * Score patterns for Reader brain (summarization, explanation)
   */
  scoreReaderPatterns(query, context, scores) {
    if (!routePatterns || !routePatterns.reader) {
      this.trace('brain-router', 'ERROR: routePatterns.reader not available');
      return;
    }

    const readerPatterns = routePatterns.reader;
    let totalScore = 0;
    let matches = [];

    // Check direct patterns with safety checks
    if (readerPatterns.direct && Array.isArray(readerPatterns.direct)) {
      readerPatterns.direct.forEach((pattern, index) => {
        if (pattern && pattern.regex && typeof pattern.regex.test === 'function') {
          try {
            if (pattern.regex.test(query)) {
              totalScore += (pattern.weight || 0.5);
              matches.push(pattern.name || `reader_pattern_${index}`);
            }
          } catch (err) {
            this.trace('brain-router', 'Reader pattern test error', { error: err.message, index });
          }
        }
      });
    }

    // Boost if we have lastFileContent (user wants to work with existing content)
    if (context.lastFileContent && 
        readerPatterns.keywords && 
        readerPatterns.keywords.some(kw => query.includes(kw))) {
      totalScore += 0.4;
      matches.push('has_file_context');
    }

    scores.reader.score = Math.min(totalScore, 1.0);
    scores.reader.matches = matches;
  }

  /**
   * Score patterns for Analyst brain (code, technical, debugging)
   */
  scoreAnalystPatterns(query, context, scores) {
    if (!routePatterns || !routePatterns.analyst) {
      this.trace('brain-router', 'ERROR: routePatterns.analyst not available');
      return;
    }

    const analystPatterns = routePatterns.analyst;
    let totalScore = 0;
    let matches = [];

    // Check direct patterns with safety checks
    if (analystPatterns.direct && Array.isArray(analystPatterns.direct)) {
      analystPatterns.direct.forEach((pattern, index) => {
        if (pattern && pattern.regex && typeof pattern.regex.test === 'function') {
          try {
            if (pattern.regex.test(query)) {
              totalScore += (pattern.weight || 0.5);
              matches.push(pattern.name || `analyst_pattern_${index}`);
            }
          } catch (err) {
            this.trace('brain-router', 'Analyst pattern test error', { error: err.message, index });
          }
        }
      });
    }

    // Check for technical keywords with safety checks
    if (analystPatterns.keywords && Array.isArray(analystPatterns.keywords)) {
      analystPatterns.keywords.forEach(keyword => {
        if (query.includes(keyword)) {
          totalScore += 0.2;
          matches.push(`keyword_${keyword}`);
        }
      });
    }

    // Check for file extensions or code indicators
    if (/\.(js|py|json|html|css|md|txt)/.test(query)) {
      totalScore += 0.3;
      matches.push('file_extension');
    }

    scores.analyst.score = Math.min(totalScore, 1.0);
    scores.analyst.matches = matches;
  }

  /**
   * Score patterns for Conversationalist brain (general chat, creative)
   */
  scoreConversationalistPatterns(query, context, scores) {
    if (!routePatterns || !routePatterns.conversationalist) {
      this.trace('brain-router', 'ERROR: routePatterns.conversationalist not available');
      return;
    }

    const convPatterns = routePatterns.conversationalist;
    let totalScore = 0.1; // Base score for fallback
    let matches = [];

    // Check direct patterns with safety checks
    if (convPatterns.direct && Array.isArray(convPatterns.direct)) {
      convPatterns.direct.forEach((pattern, index) => {
        if (pattern && pattern.regex && typeof pattern.regex.test === 'function') {
          try {
            if (pattern.regex.test(query)) {
              totalScore += (pattern.weight || 0.5);
              matches.push(pattern.name || `conv_pattern_${index}`);
            }
          } catch (err) {
            this.trace('brain-router', 'Conversationalist pattern test error', { error: err.message, index });
          }
        }
      });
    }

    // Boost for emotional or creative content with safety checks
    if (convPatterns.keywords && Array.isArray(convPatterns.keywords)) {
      convPatterns.keywords.forEach(keyword => {
        if (query.includes(keyword)) {
          totalScore += 0.2;
          matches.push(`keyword_${keyword}`);
        }
      });
    }

    scores.conversationalist.score = Math.min(totalScore, 1.0);
    scores.conversationalist.matches = matches;
  }

  /**
   * Apply context-based bonuses
   */
  applyContextBonuses(query, context, scores) {
    // If user just asked for a list and now asks for details, favor Reader
    if (context.lastResponse && context.lastResponse.includes('1.') && /^\d+$/.test(query.trim())) {
      scores.clerk.score += 0.2; // Still favor clerk for number selection
    }

    // If we have file content and user asks about it, favor Reader
    if (context.lastFileContent) {
      if (query.includes('this') || query.includes('it') || query.includes('that')) {
        scores.reader.score += 0.3;
      }
    }

    // If previous response was technical and user asks follow-up, favor Analyst
    if (context.lastRole === 'analyst' && query.length < 20) {
      scores.analyst.score += 0.2;
    }
  }

  /**
   * Select the best route based on scores
   */
  selectBestRoute(scores) {
    let bestBrain = 'conversationalist';
    let bestScore = scores?.conversationalist?.score || 0.1;
    let reasoning = 'Default fallback';

    // Find highest scoring brain with safety checks
    Object.keys(scores || {}).forEach(brain => {
      const brainScore = scores[brain]?.score || 0;
      if (brainScore > bestScore) {
        bestBrain = brain;
        bestScore = brainScore;
        reasoning = `Pattern match: ${scores[brain]?.matches?.join(', ') || 'unknown'}`;
      }
    });

    // Get model configuration with safety checks
    const modelConfig = this.models[bestBrain] || this.models['conversationalist'];
    
    return {
      model: modelConfig?.name || 'command-r:7b',
      role: bestBrain,
      confidence: bestScore || 0.1,
      reasoning: reasoning,
      config: {
        maxTokens: modelConfig?.maxTokens || 1000,
        temperature: modelConfig?.temperature || 0.7,
        specialties: modelConfig?.specialties || ['general']
      }
    };
  }

  /**
   * Update routing statistics
   */
  updateStats(route) {
    this.stats.totalRoutes++;
    
    if (!this.stats.routesByModel[route.role]) {
      this.stats.routesByModel[route.role] = 0;
    }
    this.stats.routesByModel[route.role]++;
    
    // Update average confidence
    this.stats.averageConfidence = 
      (this.stats.averageConfidence * (this.stats.totalRoutes - 1) + route.confidence) / this.stats.totalRoutes;
  }

  /**
   * Get routing statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Trace logging helper
   */
  trace(category, message, data = {}) {
    if (global.trace) {
      global.trace(category, message, data);
    } else {
      console.log(`[${category.toUpperCase()}] ${message}`, data);
    }
  }
}

module.exports = BrainRouter;