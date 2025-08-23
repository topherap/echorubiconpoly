/*
 * 🏛️ CANON VALIDATOR - Enforces Divine Truth
 * Detects and corrects AI heresy (denying vault content)
 * Ensures AI responses respect established canonical text
 */

class CanonValidator {
  constructor() {
    // Patterns that indicate AI is denying canonical truth (heresy)
    this.heresyPatterns = [
      /I don't have access/i,
      /I cannot access/i,
      /I don't see any/i,
      /no .+ found/i,
      /I'm not able to access/i,
      /I don't have information about your/i,
      /I cannot provide information about your personal/i,
      /I don't have details about your specific/i,
      /I'm unable to access your/i
    ];
    
    // Patterns that indicate good canonical adherence
    this.orthodoxPatterns = [
      /based on your vault/i,
      /from your sacred records/i,
      /according to the canonical text/i,
      /as written in your/i,
      /the vault shows/i,
      /your records indicate/i
    ];
  }

  detectHeresy(aiResponse, hasCanon = false, canonicalText = null) {
    if (!hasCanon && !canonicalText) {
      return false; // No canon to violate
    }
    
    // Check if AI is denying canonical truth when it exists
    const containsHeresy = this.heresyPatterns.some(pattern => 
      pattern.test(aiResponse)
    );
    
    if (containsHeresy) {
      console.log('🚨 CONTEXT DENIED: AI denying provided content');
      console.log('Denial response:', aiResponse.substring(0, 200));
      return true;
    }
    
    return false;
  }

  enforceCanon(aiResponse, canonicalText = null, userQuery = '') {
    const hasCanon = !!(canonicalText || global.currentCanonicalText);
    const canon = canonicalText || global.currentCanonicalText;
    
    if (this.detectHeresy(aiResponse, hasCanon, canon)) {
      console.log('🏛️ ENFORCING CONTEXT: Overriding AI denial response');
      
      // Create canonical response based on available text
      let canonicalResponse = '🏛️ **CANON ENFORCEMENT ACTIVATED**\\n\\n';
      canonicalResponse += '📜 **The Vault Has Spoken:**\\n\\n';
      
      if (canon && canon.content) {
        canonicalResponse += `**${canon.title}**\\n`;
        canonicalResponse += '═'.repeat(50) + '\\n\\n';
        canonicalResponse += canon.content;
        canonicalResponse += '\\n\\n';
      } else {
        canonicalResponse += 'Sacred records exist in the vault but the full text is not immediately available.\\n\\n';
      }
      
      canonicalResponse += '**⚠️ Note:** The AI\'s response was rejected for denying provided content.\\n';
      canonicalResponse += 'The above content is the authentic record from your vault.\\n';
      
      if (userQuery) {
        canonicalResponse += `\\n**Your Question:** ${userQuery}\\n`;
        canonicalResponse += '**Answer:** The information is in the content above.';
      }
      
      return {
        message: canonicalResponse,
        heresyDetected: true,
        enforcement: 'canon-override',
        originalResponse: aiResponse
      };
    }
    
    // Check for good canonical adherence and mark it
    const isOrthodox = this.orthodoxPatterns.some(pattern => 
      pattern.test(aiResponse)
    );
    
    return {
      message: aiResponse,
      heresyDetected: false,
      isOrthodox: isOrthodox,
      enforcement: 'none'
    };
  }

  // Validate that AI is properly referencing canon
  validateCanonicalReference(aiResponse, canonicalText) {
    if (!canonicalText) return true;
    
    // Check if AI mentions key elements from the canonical text
    const canonLower = canonicalText.content?.toLowerCase() || '';
    const responseLower = aiResponse.toLowerCase();
    
    // Extract key terms from canonical text (first 50 words)
    const canonWords = canonLower.split(/\\s+/).slice(0, 50);
    const significantWords = canonWords.filter(word => 
      word.length > 4 && 
      !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'were', 'been'].includes(word)
    );
    
    // Check if AI response references significant canonical terms
    const referencedTerms = significantWords.filter(term => 
      responseLower.includes(term)
    );
    
    const referenceScore = referencedTerms.length / Math.max(significantWords.length, 1);
    
    return {
      score: referenceScore,
      isGoodReference: referenceScore > 0.1, // At least 10% canonical term overlap
      referencedTerms: referencedTerms,
      canonicalTerms: significantWords
    };
  }

  // Enhanced enforcement with context awareness
  enforceCanonWithContext(aiResponse, canonicalText, userQuery, context = {}) {
    const enforcement = this.enforceCanon(aiResponse, canonicalText, userQuery);
    
    if (!enforcement.heresyDetected) {
      // Validate canonical reference quality
      const validation = this.validateCanonicalReference(aiResponse, canonicalText);
      
      if (canonicalText && !validation.isGoodReference) {
        console.log('🏛️ WEAK CONTENT REFERENCE: AI not properly using provided content');
        
        // Clean enhancement without dumping content again
        if (this.detectHeresy(aiResponse, true, canonicalText)) {
          // AI is lying about seeing the content
          return {
            message: `The AI seems confused. You're viewing "${canonicalText.title}". 

Please try asking your question differently, or select the record again.`,
            heresyDetected: true,
            weakReference: true,
            enforcement: 'context-denied'
          };
        }
        
        // Just add a simple header without content dump
        let enhancedResponse = `📄 Discussing: ${canonicalText.title}\n\n${aiResponse}`;
        
        return {
          message: enhancedResponse,
          heresyDetected: false,
          weakReference: true,
          enforcement: 'canonical-enhancement',
          validation: validation
        };
      }
    }
    
    return enforcement;
  }

  // Log enforcement events for model evaluation
  logEnforcementEvent(event) {
    const timestamp = new Date().toISOString();
    console.log(`🏛️ CANON LOG [${timestamp}]:`, {
      type: event.enforcement,
      heresy: event.heresyDetected,
      orthodox: event.isOrthodox,
      query: event.userQuery?.substring(0, 100)
    });
    
    // Could write to file for analysis
    // fs.appendFileSync('canon-enforcement.log', JSON.stringify({...event, timestamp}) + '\\n');
  }
}

module.exports = new CanonValidator();