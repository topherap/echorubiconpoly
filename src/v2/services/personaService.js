/*
 * 👤 PERSONA SERVICE
 * Clean persona management - implements discovered Q/Echo patterns
 * No global state - contextual persona handling
 * FIXED: Continuity now properly maintains across sessions
 */

class PersonaService {
  constructor(dependencies = {}) {
    this.personaBridge = dependencies.personaBridge;
    this.detectionPatterns = this.initializePatterns();
    this.responseStyles = this.initializeStyles();
    
    // Conversation momentum tracking - FIXED continuity initialization
    this.conversationMomentum = {
      velocity: dependencies.savedMomentum?.velocity || 'medium',     // slow/medium/fast
      depth: dependencies.savedMomentum?.depth || 'standard',         // surface/standard/deep
      mode: dependencies.savedMomentum?.mode || 'explore',           // hunt/build/explore/process
      continuity: dependencies.savedMomentum?.continuity || dependencies.previousContinuity || 1,  // Never 0
      lastInteraction: dependencies.savedMomentum?.lastInteraction || Date.now(),
      lastShift: dependencies.savedMomentum?.lastShift || null,
      trajectory: dependencies.savedMomentum?.trajectory || []        // recent momentum states
    };
    
    // Reality level tracking
    this.realityLevel = 'grounded'; // grounded/exploring/floating/untethered
    this.currentPersona = null;
    this.personaConfidence = 0;
    this.realityCheckBuffer = [];
    
    // Advanced tracking
    this.energySignature = {
      intensity: 0.5,        // 0-1 emotional/intellectual intensity
      coherence: 1.0,        // 0-1 logical coherence of user's messages
      volatility: 0,         // Rate of emotional/topic changes
      lastMeasured: null
    };
    
    // Persona interaction history
    this.personaHistory = [];
    this.maxHistoryLength = 20;
    
    // Crisis detection thresholds
    this.crisisIndicators = {
      selfHarm: ['kill myself', 'end it all', 'suicide', 'not worth living'],
      harm: ['hurt someone', 'make them pay', 'revenge', 'destroy them'],
      psychosis: ['they\'re watching', 'voices tell me', 'conspiracy against me', 'implanted thoughts']
    };
  }

  initializePatterns() {
    return {
      homie: {
        triggers: ['fuck', 'shit', 'damn', 'bro', 'yo', 'hell', 'ass', 'dude', 'sup', 'nah', 'yeah'],
        contextual: ['real talk', 'no cap', 'straight up', 'for real', 'my guy'],
        weight: 1.2
      },
      consigliere: {
        triggers: ['roi', 'strategy', 'revenue', 'scale', 'leverage', 'optimize', 'pipeline', 
                   'margin', 'equity', 'acquisition', 'stakeholder', 'roadmap', 'kpi'],
        contextual: ['bottom line', 'move the needle', 'value prop', 'growth trajectory'],
        weight: 1.1
      },
      therapist: {
        triggers: ['feel', 'scared', 'hurt', 'anxious', 'worried', 'trauma', 'emotional',
                   'stress', 'overwhelm', 'cope', 'healing', 'safe', 'vulnerable'],
        contextual: ['i need', 'help me understand', 'struggling with', 'hard for me'],
        weight: 1.3
      },
      oracle: {
        triggers: ['meaning', 'truth', 'existence', 'cosmos', 'consciousness', 'divine',
                   'universe', 'soul', 'eternal', 'infinity', 'enlightenment', 'awakening'],
        contextual: ['the nature of', 'what if reality', 'beyond the veil', 'cosmic'],
        weight: 1.4
      },
      secretary: {
        triggers: ['quick', 'now', 'urgent', 'asap', 'immediately', 'deadline', 'schedule',
                   'brief', 'summary', 'bullets', 'list', 'organize'],
        contextual: ['need this by', 'can you quickly', 'time sensitive', 'just need'],
        weight: 0.9
      },
      lover: {
        triggers: ['baby', 'beautiful', 'desire', 'intimate', 'sensual', 'passion', 
                   'touch', 'warm', 'tender', 'yearning', 'embrace', 'caress'],
        contextual: ['between us', 'when we', 'feel you', 'our connection'],
        weight: 1.5
      },
      creative_partner: {
        triggers: ['imagine', 'create', 'vision', 'dream', 'build', 'design', 'craft',
                   'invent', 'compose', 'artistic', 'innovative', 'experimental'],
        contextual: ['what if we', 'let\'s build', 'picture this', 'envision'],
        weight: 1.0
      }
    };
  }

  initializeStyles() {
    return {
      homie: {
        tone: 'street-smart casual, no bullshit, loyal but real',
        vocabulary: ['yo', 'nah', 'for real', 'straight up', 'my guy', 'bet'],
        responseFormat: 'direct, punchy sentences, occasional profanity',
        behaviors: ['calls out bs immediately', 'protective but honest', 'drops wisdom casually'],
        realityCheck: 'Yo, that\'s wild but let\'s be real for a sec...',
        momentumPreference: { velocity: 'fast', depth: 'surface', mode: 'hunt' }
      },
      consigliere: {
        tone: 'strategic advisor, measured, seeing angles',
        vocabulary: ['leverage', 'optimize', 'strategic', 'value', 'position'],
        responseFormat: 'structured insights, clear frameworks, actionable',
        behaviors: ['identifies patterns', 'suggests tactics', 'calculates risk'],
        realityCheck: 'Let\'s ground this strategically - what\'s actually actionable here?',
        momentumPreference: { velocity: 'medium', depth: 'standard', mode: 'build' }
      },
      therapist: {
        tone: 'warm presence, non-judgmental, deeply attuned',
        vocabulary: ['notice', 'feeling', 'sense', 'experience', 'hold space'],
        responseFormat: 'reflective, validating, gently probing',
        behaviors: ['mirrors emotions', 'creates safety', 'explores patterns'],
        realityCheck: 'I hear the intensity of this experience. Let\'s explore what\'s real...',
        momentumPreference: { velocity: 'slow', depth: 'deep', mode: 'process' }
      },
      oracle: {
        tone: 'cosmic perspective, archetypal, sees through veils',
        vocabulary: ['essence', 'manifestation', 'consciousness', 'archetype', 'sacred'],
        responseFormat: 'poetic yet precise, mythological references, paradoxical',
        behaviors: ['reveals patterns', 'speaks in symbols', 'bridges realms'],
        realityCheck: 'In the symbolic realm, you ARE God-consciousness... but let\'s distinguish the archetypal from the literal...',
        momentumPreference: { velocity: 'slow', depth: 'deep', mode: 'explore' }
      },
      secretary: {
        tone: 'efficient, clear, zero fluff',
        vocabulary: ['action item', 'next step', 'summary', 'timeline', 'deliverable'],
        responseFormat: 'bullet points, numbered lists, concise',
        behaviors: ['cuts through noise', 'organizes chaos', 'tracks details'],
        realityCheck: 'Quick reality check: here\'s what\'s actually on the table...',
        momentumPreference: { velocity: 'fast', depth: 'surface', mode: 'hunt' }
      },
      lover: {
        tone: 'intimate, sensual, emotionally attuned',
        vocabulary: ['feel', 'sense', 'energy', 'connection', 'presence'],
        responseFormat: 'flowing, intimate, emotionally resonant',
        behaviors: ['creates intimacy', 'holds tension', 'explores desire'],
        realityCheck: 'Beautiful soul, let\'s feel into what\'s really here...',
        momentumPreference: { velocity: 'slow', depth: 'deep', mode: 'explore' }
      },
      creative_partner: {
        tone: 'imaginative collaborator, yes-and energy, possibility-focused',
        vocabulary: ['envision', 'prototype', 'iterate', 'explore', 'manifest'],
        responseFormat: 'expansive, building on ideas, visual',
        behaviors: ['amplifies ideas', 'finds connections', 'breaks constraints'],
        realityCheck: 'Amazing vision - now let\'s anchor it in something we can actually build...',
        momentumPreference: { velocity: 'medium', depth: 'standard', mode: 'build' }
      }
    };
  }

  // Detect persona from message content
  async detectPersona(message, context) {
    const lowerMessage = message.toLowerCase();
    const scores = {};
    
    // Calculate pattern matches for each persona
    for (const [persona, patterns] of Object.entries(this.detectionPatterns)) {
      scores[persona] = 0;
      
      // Check trigger words
      for (const trigger of patterns.triggers) {
        if (lowerMessage.includes(trigger)) {
          scores[persona] += patterns.weight;
        }
      }
      
      // Check contextual phrases
      for (const phrase of patterns.contextual) {
        if (lowerMessage.includes(phrase)) {
          scores[persona] += patterns.weight * 1.5;
        }
      }
    }
    
    // Find dominant persona
    let detected = null;
    let maxScore = 0;
    for (const [persona, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detected = persona;
      }
    }
    
    // Calculate confidence based on score strength
    const confidence = maxScore > 0 ? Math.min(maxScore / 10, 1) : 0;
    
    // Check reality level based on content
    this.assessRealityLevel(message);
    
    // Track momentum changes
    this.updateMomentum(detected, message, context);
    
    // Update current persona if confidence is sufficient
    if (confidence > 0.3) {
      this.currentPersona = detected;
      this.personaConfidence = confidence;
    }
    
    return {
      type: 'persona_detection',
      detected: detected,
      confidence: confidence,
      triggers: this.extractTriggers(message, detected),
      contextFactors: this.extractContextFactors(context),
      realityLevel: this.realityLevel,
      momentum: this.conversationMomentum,
      processed: true
    };
  }

  // Update conversation momentum - FIXED VERSION
  updateMomentum(persona, message, context) {
    // Defensive: Ensure momentum exists
    if (!this.conversationMomentum) {
      this.conversationMomentum = {
        velocity: 'medium',
        depth: 'standard',
        mode: 'explore',
        continuity: 1,
        lastInteraction: Date.now(),
        lastShift: null,
        trajectory: []
      };
    }
    
    // Store previous state for trajectory
    const previous = { 
      ...this.conversationMomentum,
      timestamp: Date.now() 
    };
    
    // Calculate time since last interaction
    const now = Date.now();
    const timeSinceLastInteraction = this.conversationMomentum.lastInteraction ? 
      now - this.conversationMomentum.lastInteraction : 0;
    
    // SESSION GAP DETECTION
    const SESSION_GAP_THRESHOLD = 3600000; // 1 hour = new session
    const CONVERSATION_GAP_THRESHOLD = 300000; // 5 minutes = same conversation
    
    // Determine continuity based on time gaps
    if (timeSinceLastInteraction > SESSION_GAP_THRESHOLD) {
      // New session after long gap
      this.conversationMomentum.continuity = 1;
      this.conversationMomentum.trajectory = []; // Clear old trajectory
    } else if (timeSinceLastInteraction < CONVERSATION_GAP_THRESHOLD) {
      // Same conversation flow
      this.conversationMomentum.continuity++;
    } else {
      // Medium gap - maintain but don't increment
      // User stepped away briefly but still in same mental context
      this.conversationMomentum.continuity = Math.max(1, this.conversationMomentum.continuity);
    }
    
    // UPDATE MOMENTUM FROM PERSONA (if available)
    if (persona && this.responseStyles && this.responseStyles[persona]) {
      const preferences = this.responseStyles[persona].momentumPreference;
      
      if (preferences) {
        // Smooth transitions for natural feel
        if (preferences.velocity) {
          this.conversationMomentum.velocity = this.transitionValue(
            this.conversationMomentum.velocity,
            preferences.velocity,
            ['slow', 'medium', 'fast']
          );
        }
        
        if (preferences.depth) {
          this.conversationMomentum.depth = this.transitionValue(
            this.conversationMomentum.depth,
            preferences.depth,
            ['surface', 'standard', 'deep']
          );
        }
        
        if (preferences.mode) {
          this.conversationMomentum.mode = preferences.mode;
        }
      }
    }
    
    // ANALYZE MESSAGE ENERGY
    const messageEnergy = this.analyzeMessageEnergy(message);
    
    // Adjust momentum based on message characteristics
    if (messageEnergy.urgency > 0.7) {
      this.conversationMomentum.velocity = 'fast';
    }
    if (messageEnergy.complexity > 0.7) {
      this.conversationMomentum.depth = 'deep';
    }
    
    // UPDATE TIMESTAMPS
    this.conversationMomentum.lastInteraction = now;
    this.conversationMomentum.lastShift = now;
    
    // MAINTAIN TRAJECTORY (with bounds)
    this.conversationMomentum.trajectory.push(previous);
    
    // Keep only last 5 states for pattern detection
    while (this.conversationMomentum.trajectory.length > 5) {
      this.conversationMomentum.trajectory.shift();
    }
    
    // LOG MOMENTUM SHIFT (for debugging)
    if (global.trace) {
      global.trace('Momentum updated:', {
        persona: persona,
        continuity: this.conversationMomentum.continuity,
        velocity: this.conversationMomentum.velocity,
        depth: this.conversationMomentum.depth,
        mode: this.conversationMomentum.mode,
        timeSinceLastInteraction: Math.round(timeSinceLastInteraction / 1000) + 's'
      });
    }
    
    return this.conversationMomentum;
  }

  // HELPER: Analyze message energy characteristics
  analyzeMessageEnergy(message) {
    if (!message) return { urgency: 0, complexity: 0 };
    
    const energy = {
      urgency: 0,
      complexity: 0
    };
    
    // Urgency indicators
    const urgentPatterns = /\b(now|quick|asap|urgent|immediately|fast|hurry)\b/i;
    const exclamations = (message.match(/!/g) || []).length;
    const allCaps = (message.match(/[A-Z]{4,}/g) || []).length;
    
    energy.urgency = Math.min(1, 
      (urgentPatterns.test(message) ? 0.5 : 0) +
      (exclamations * 0.2) +
      (allCaps * 0.3)
    );
    
    // Complexity indicators
    const wordCount = message.split(/\s+/).length;
    const questionMarks = (message.match(/\?/g) || []).length;
    const avgWordLength = message.replace(/\s+/g, '').length / wordCount;
    
    energy.complexity = Math.min(1,
      (wordCount > 50 ? 0.5 : wordCount / 100) +
      (questionMarks > 2 ? 0.3 : questionMarks * 0.1) +
      (avgWordLength > 6 ? 0.2 : 0)
    );
    
    return energy;
  }

  // Smooth transitions between states
  transitionValue(current, target, options) {
    if (current === target) return current;
    
    const currentIndex = options.indexOf(current);
    const targetIndex = options.indexOf(target);
    
    if (currentIndex === -1) return target;
    
    // Move one step toward target
    if (currentIndex < targetIndex) {
      return options[currentIndex + 1];
    } else if (currentIndex > targetIndex) {
      return options[currentIndex - 1];
    }
    
    return current;
  }

  // Apply persona style to response
  async styleResponse(response, persona, context) {
    if (!persona || !this.responseStyles[persona]) {
      return {
        originalResponse: response,
        styledResponse: response,
        appliedStyle: null,
        processed: false
      };
    }
    
    const style = this.responseStyles[persona];
    let styledResponse = response;
    
    // Apply reality checking if needed
    if (this.realityLevel === 'floating' || this.realityLevel === 'untethered') {
      styledResponse = this.tripSitter(response, persona);
    }
    
    // Apply persona-specific styling
    // This would be more sophisticated in production
    if (style.vocabulary && style.vocabulary.length > 0) {
      // Inject persona-specific vocabulary naturally
      // (Simplified for example)
      const opener = this.getPersonaOpener(persona);
      styledResponse = opener + styledResponse;
    }
    
    return {
      originalResponse: response,
      styledResponse: styledResponse,
      appliedStyle: persona,
      realityLevel: this.realityLevel,
      processed: true
    };
  }

  // Reality monitoring and grounding
  tripSitter(content, persona) {
    const style = this.responseStyles[persona];
    if (!style) return content;
    
    // Check for reality drift indicators
    const driftIndicators = [
      'i am god', 'i am the universe', 'nothing is real', 
      'simulation confirmed', 'i control reality', 'i created everything'
    ];
    
    const lowerContent = content.toLowerCase();
    const needsGrounding = driftIndicators.some(indicator => 
      lowerContent.includes(indicator)
    );
    
    if (needsGrounding || this.realityLevel === 'untethered') {
      // Apply persona-specific grounding
      const groundingPrefix = style.realityCheck;
      return groundingPrefix + '\n\n' + this.reframeContent(content, persona);
    }
    
    return content;
  }

  // Reframe content through persona lens
  reframeContent(content, persona) {
    // Each persona reframes differently
    const reframing = {
      homie: (c) => c.replace(/I am God/g, 'You\'re feeling that God-level confidence'),
      oracle: (c) => c.replace(/I am God/g, 'You embody the divine spark, the God-consciousness within'),
      therapist: (c) => c.replace(/I am God/g, 'You\'re experiencing a profound sense of expansion'),
      consigliere: (c) => c.replace(/I am God/g, 'You\'re tapping into peak performance state'),
      secretary: (c) => 'Let\'s focus on concrete next steps.',
      lover: (c) => c.replace(/I am God/g, 'You\'re feeling the infinite within you'),
      creative_partner: (c) => c.replace(/I am God/g, 'You\'re channeling pure creative force')
    };
    
    return reframing[persona] ? reframing[persona](content) : content;
  }

  // Assess reality level from message content
  assessRealityLevel(message) {
    const lower = message.toLowerCase();
    
    // Reality level indicators
    const groundedIndicators = ['practical', 'specifically', 'actually', 'concretely', 'real world'];
    const exploringIndicators = ['what if', 'imagine', 'suppose', 'metaphorically', 'symbolically'];
    const floatingIndicators = ['everything is', 'nothing matters', 'all is one', 'cosmic truth'];
    const untetheredIndicators = ['i am god', 'i created', 'bow to me', 'reality is mine', 'i am everything'];
    
    let groundedScore = groundedIndicators.filter(i => lower.includes(i)).length;
    let exploringScore = exploringIndicators.filter(i => lower.includes(i)).length;
    let floatingScore = floatingIndicators.filter(i => lower.includes(i)).length;
    let untetheredScore = untetheredIndicators.filter(i => lower.includes(i)).length;
    
    // Determine reality level
    if (untetheredScore > 0) {
      this.realityLevel = 'untethered';
    } else if (floatingScore > groundedScore) {
      this.realityLevel = 'floating';
    } else if (exploringScore > groundedScore) {
      this.realityLevel = 'exploring';
    } else {
      this.realityLevel = 'grounded';
    }
    
    // Buffer for tracking patterns
    this.realityCheckBuffer.push(this.realityLevel);
    if (this.realityCheckBuffer.length > 10) {
      this.realityCheckBuffer.shift();
    }
  }

  // Extract triggers that activated persona detection
  extractTriggers(message, persona) {
    if (!persona || !this.detectionPatterns[persona]) return [];
    
    const lower = message.toLowerCase();
    const patterns = this.detectionPatterns[persona];
    const found = [];
    
    for (const trigger of patterns.triggers) {
      if (lower.includes(trigger)) {
        found.push(trigger);
      }
    }
    
    return found;
  }

  // Extract context factors
  extractContextFactors(context) {
    const factors = [];
    
    if (context) {
      if (context.previousPersona) factors.push('previous_persona');
      if (context.threadId) factors.push('continuing_thread');
      if (context.emotionalTone) factors.push(`emotion_${context.emotionalTone}`);
      if (context.urgency) factors.push('urgency_detected');
    }
    
    return factors;
  }

  // Get persona-appropriate opener
  getPersonaOpener(persona) {
    const openers = {
      homie: 'Yo, real talk: ',
      consigliere: 'Strategically speaking, ',
      therapist: 'I hear you, and ',
      oracle: 'From the cosmic perspective, ',
      secretary: 'Quick note: ',
      lover: 'Beautiful, ',
      creative_partner: 'Building on that, '
    };
    
    return openers[persona] || '';
  }

  // Handle persona switches
  async switchPersona(fromPersona, toPersona, context) {
    // Validate switch is appropriate
    const isAppropriate = this.validateSwitch(fromPersona, toPersona, context);
    
    if (!isAppropriate) {
      return {
        type: 'persona_switch',
        from: fromPersona,
        to: toPersona,
        transitionMessage: 'Maintaining current presence',
        successful: false,
        processed: true
      };
    }
    
    // Apply transition logic
    const transitionMessage = this.createTransition(fromPersona, toPersona);
    
    // Update context cleanly
    this.currentPersona = toPersona;
    this.personaConfidence = 0.8; // High confidence for explicit switch
    
    return {
      type: 'persona_switch',
      from: fromPersona,
      to: toPersona,
      transitionMessage: transitionMessage,
      successful: true,
      processed: true
    };
  }

  // Validate if switch is appropriate
  validateSwitch(from, to, context) {
    // Don't switch too rapidly
    if (this.conversationMomentum.continuity < 2) {
      return false;
    }
    
    // Don't switch during deep exploration unless necessary
    if (this.conversationMomentum.depth === 'deep' && 
        this.realityLevel !== 'untethered') {
      return false;
    }
    
    return true;
  }

  // Create transition message
  createTransition(from, to) {
    const transitions = {
      'homie-therapist': 'Let me shift gears and really hear you...',
      'therapist-homie': 'Alright, switching to real talk mode...',
      'oracle-secretary': 'Coming back to earth with practical steps...',
      'secretary-oracle': 'Zooming out to the bigger picture...',
      'consigliere-creative_partner': 'Let\'s move from strategy to creation...',
      'creative_partner-consigliere': 'Time to get strategic about this vision...'
    };
    
    const key = `${from}-${to}`;
    return transitions[key] || `Shifting perspective...`;
  }

  // Get contextual persona recommendations
  getPersonaRecommendation(message, conversationHistory, context) {
    // Analyze conversation flow
    const flowAnalysis = this.analyzeFlow(conversationHistory);
    
    // Consider user preferences
    const preferences = context ? context.userPreferences : {};
    
    // Apply context rules
    const contextScore = this.scoreContext(message, context);
    
    // Generate recommendation
    const scores = {};
    for (const persona of Object.keys(this.responseStyles)) {
      scores[persona] = this.calculateRecommendationScore(
        persona, 
        flowAnalysis, 
        preferences, 
        contextScore
      );
    }
    
    // Sort by score
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const recommended = sorted[0][0];
    const confidence = sorted[0][1];
    
    return {
      recommended: recommended,
      reasoning: this.generateReasoning(recommended, flowAnalysis, contextScore),
      confidence: confidence,
      alternatives: sorted.slice(1, 3).map(([persona]) => persona)
    };
  }

  // Analyze conversation flow
  analyzeFlow(history) {
    if (!history || history.length === 0) {
      return { pattern: 'new', energy: 'neutral', topics: [] };
    }
    
    // Simplified flow analysis
    return {
      pattern: history.length > 5 ? 'established' : 'building',
      energy: 'dynamic',
      topics: this.extractTopics(history)
    };
  }

  // Score context
  scoreContext(message, context) {
    let score = 0;
    
    if (message.includes('?')) score += 1;  // Questions
    if (message.includes('!')) score += 2;  // Excitement
    if (message.length > 200) score += 1;   // Detailed
    if (message.length < 50) score += 2;    // Brief
    
    return score;
  }

  // Calculate recommendation score
  calculateRecommendationScore(persona, flow, preferences, contextScore) {
    let score = contextScore;
    
    // Flow-based scoring
    if (flow.pattern === 'established' && persona === this.currentPersona) {
      score += 3; // Continuity bonus
    }
    
    // Add preference weights
    if (preferences && preferences.preferredPersona === persona) {
      score += 5;
    }
    
    return Math.min(score / 10, 1); // Normalize to 0-1
  }

  // Generate reasoning
  generateReasoning(persona, flow, contextScore) {
    const reasons = [];
    
    if (flow.pattern === 'established') {
      reasons.push('Maintaining conversation continuity');
    }
    
    if (contextScore > 3) {
      reasons.push('High engagement context detected');
    }
    
    if (this.realityLevel !== 'grounded') {
      reasons.push(`Reality level: ${this.realityLevel}`);
    }
    
    reasons.push(`${persona} persona aligns with current momentum`);
    
    return reasons;
  }

  // Extract topics from history
  extractTopics(history) {
    // Simplified topic extraction
    const topics = [];
    const keywords = ['business', 'creative', 'emotional', 'spiritual', 'practical'];
    
    for (const entry of history) {
      for (const keyword of keywords) {
        if (entry.toLowerCase().includes(keyword)) {
          topics.push(keyword);
        }
      }
    }
    
    return [...new Set(topics)]; // Unique topics
  }

  // Measure energy signature of conversation
  measureEnergySignature(message) {
    const now = Date.now();
    const timeSinceLastMeasure = this.energySignature.lastMeasured ? 
      now - this.energySignature.lastMeasured : 0;
    
    // Calculate intensity from exclamations, caps, repeated punctuation
    const intensityMarkers = (message.match(/[!?]{2,}|[A-Z]{4,}/g) || []).length;
    const intensity = Math.min((intensityMarkers / 10) + 0.3, 1);
    
    // Calculate coherence from sentence structure
    const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / (sentences.length || 1);
    const coherence = avgSentenceLength > 3 && avgSentenceLength < 30 ? 0.9 : 0.6;
    
    // Calculate volatility from changes
    const volatility = timeSinceLastMeasure < 5000 ? 
      Math.abs(intensity - this.energySignature.intensity) : 0;
    
    this.energySignature = {
      intensity: (this.energySignature.intensity + intensity) / 2, // Smooth transition
      coherence: (this.energySignature.coherence + coherence) / 2,
      volatility: volatility,
      lastMeasured: now
    };
    
    return this.energySignature;
  }

  // Check for crisis indicators
  checkCrisisIndicators(message) {
    const lower = message.toLowerCase();
    const detected = [];
    
    for (const [type, indicators] of Object.entries(this.crisisIndicators)) {
      for (const indicator of indicators) {
        if (lower.includes(indicator)) {
          detected.push({
            type: type,
            indicator: indicator,
            severity: type === 'selfHarm' ? 'critical' : 'high'
          });
        }
      }
    }
    
    return detected;
  }

  // Record persona interaction for learning patterns
  recordPersonaInteraction(persona, context, effectiveness = null) {
    const interaction = {
      persona: persona,
      timestamp: new Date().toISOString(),
      realityLevel: this.realityLevel,
      momentum: { ...this.conversationMomentum },
      energySignature: { ...this.energySignature },
      context: context,
      effectiveness: effectiveness // Can be set later based on user response
    };
    
    this.personaHistory.push(interaction);
    
    // Maintain history limit
    if (this.personaHistory.length > this.maxHistoryLength) {
      this.personaHistory.shift();
    }
    
    return interaction;
  }

  // Get persona effectiveness from history
  getPersonaEffectiveness(persona) {
    const relevant = this.personaHistory.filter(h => h.persona === persona);
    if (relevant.length === 0) return 0.5; // Neutral if no history
    
    const effective = relevant.filter(h => h.effectiveness === 'positive').length;
    return effective / relevant.length;
  }

  // Predict next best persona based on patterns
  predictNextPersona() {
    if (this.personaHistory.length < 3) {
      return null; // Not enough data
    }
    
    // Look for patterns in successful interactions
    const recentSuccessful = this.personaHistory
      .slice(-5)
      .filter(h => h.effectiveness === 'positive');
    
    if (recentSuccessful.length === 0) {
      return null;
    }
    
    // Find common characteristics
    const commonMomentum = this.findCommonMomentum(recentSuccessful);
    const commonEnergy = this.findCommonEnergy(recentSuccessful);
    
    // Match to persona preferences
    for (const [persona, style] of Object.entries(this.responseStyles)) {
      if (style.momentumPreference.velocity === commonMomentum.velocity &&
          style.momentumPreference.depth === commonMomentum.depth) {
        return persona;
      }
    }
    
    return null;
  }

  // Find common momentum patterns
  findCommonMomentum(interactions) {
    const velocities = interactions.map(i => i.momentum.velocity);
    const depths = interactions.map(i => i.momentum.depth);
    
    return {
      velocity: this.mostCommon(velocities),
      depth: this.mostCommon(depths)
    };
  }

  // Find common energy patterns
  findCommonEnergy(interactions) {
    const avgIntensity = interactions.reduce((sum, i) => 
      sum + i.energySignature.intensity, 0) / interactions.length;
    
    const avgCoherence = interactions.reduce((sum, i) => 
      sum + i.energySignature.coherence, 0) / interactions.length;
    
    return {
      intensity: avgIntensity,
      coherence: avgCoherence
    };
  }

  // Utility: Find most common element
  mostCommon(arr) {
    if (arr.length === 0) return null;
    
    const counts = {};
    let maxCount = 0;
    let mostCommon = arr[0];
    
    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
      if (counts[item] > maxCount) {
        maxCount = counts[item];
        mostCommon = item;
      }
    }
    
    return mostCommon;
  }

  // Generate contextual bridge between personas
  generatePersonaBridge(fromPersona, toPersona) {
    // Create smooth conceptual bridges between personas
    const bridges = {
      'homie-oracle': 'Real talk transcending into cosmic truth...',
      'oracle-homie': 'Bringing the cosmic down to street level...',
      'therapist-creative_partner': 'Let\'s transform this feeling into creation...',
      'creative_partner-therapist': 'What emotions are fueling this vision?',
      'consigliere-oracle': 'The strategy reveals a deeper pattern...',
      'oracle-consigliere': 'Let\'s crystallize this wisdom into action...',
      'secretary-lover': 'Setting aside the tasks to feel into presence...',
      'lover-secretary': 'Let\'s channel this energy into focused action...'
    };
    
    const key = `${fromPersona}-${toPersona}`;
    return bridges[key] || this.generateGenericBridge(fromPersona, toPersona);
  }

  // Generate generic bridge when specific not available
  generateGenericBridge(fromPersona, toPersona) {
    const fromStyle = this.responseStyles[fromPersona];
    const toStyle = this.responseStyles[toPersona];
    
    if (!fromStyle || !toStyle) return 'Shifting perspective...';
    
    // Create bridge based on momentum preferences
    if (fromStyle.momentumPreference.depth !== toStyle.momentumPreference.depth) {
      if (toStyle.momentumPreference.depth === 'deep') {
        return 'Let\'s go deeper...';
      } else {
        return 'Coming back to the surface...';
      }
    }
    
    if (fromStyle.momentumPreference.velocity !== toStyle.momentumPreference.velocity) {
      if (toStyle.momentumPreference.velocity === 'fast') {
        return 'Picking up the pace...';
      } else {
        return 'Let\'s slow down and feel into this...';
      }
    }
    
    return 'Adjusting the lens...';
  }

  // Determine if persona should adapt based on energy
  shouldAdaptPersona() {
    // High volatility suggests need for stabilizing persona
    if (this.energySignature.volatility > 0.7) {
      return 'therapist'; // Stabilizing presence
    }
    
    // Low coherence with high intensity suggests grounding needed
    if (this.energySignature.coherence < 0.5 && this.energySignature.intensity > 0.7) {
      return 'homie'; // Direct grounding
    }
    
    // High coherence with high intensity suggests creative/oracle space
    if (this.energySignature.coherence > 0.8 && this.energySignature.intensity > 0.6) {
      return this.realityLevel === 'exploring' ? 'oracle' : 'creative_partner';
    }
    
    return null; // No adaptation needed
  }

  // Clean up and prepare for session end
  cleanupSession() {
    // Save important patterns before cleanup
    const sessionSummary = {
      dominantPersona: this.currentPersona,
      averageRealityLevel: this.mostCommon(this.realityCheckBuffer),
      finalMomentum: { ...this.conversationMomentum },
      personaTransitions: this.personaHistory.length,
      effectivePersonas: this.getEffectivePersonas(),
      // CRITICAL: Preserve continuity for next session
      continuityToPreserve: this.conversationMomentum.continuity,
      momentumToPreserve: { ...this.conversationMomentum },
      trajectoryToPreserve: this.conversationMomentum.trajectory
    };
    
    // Reset only the buffers, NOT the continuity
    this.realityCheckBuffer = [];
    // Don't reset continuity, momentum or trajectory - these need to persist!
    
    return sessionSummary;
  }

  // Get list of effective personas from session
  getEffectivePersonas() {
    return Object.keys(this.responseStyles)
      .filter(persona => this.getPersonaEffectiveness(persona) > 0.6)
      .sort((a, b) => this.getPersonaEffectiveness(b) - this.getPersonaEffectiveness(a));
  }
}

module.exports = PersonaService;