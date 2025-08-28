/**
 * 🛡️ OWNERSHIP GUARDIAN
 * Ensures all vault content maintains proper ownership context
 * Intercepts ALL vault content before it reaches AI
 */

class OwnershipGuardian {
  
  /**
   * Ensure all vault content is properly marked as user-owned
   * @param {any} content - The content being returned
   * @param {object} context - Additional context about the content
   * @returns {object} - Enhanced content with ownership markers
   */
  static ensureOwnership(content, context = {}) {
    console.log("🛡️ OWNERSHIP_GUARDIAN: Enforcing user ownership on content");
    
    // If content is a string, wrap it
    if (typeof content === 'string') {
      return {
        message: `USER_OWNED_CONTENT: ${content}`,
        source: 'vault-direct',
        ownership: 'user',
        isUserContent: true,
        isShared: false,
        guardianEnforced: true,
        ...context
      };
    }
    
    // If content is already an object, enhance it
    if (typeof content === 'object' && content !== null) {
      const enhanced = {
        ...content,
        ownership: 'user',
        isUserContent: true,
        isShared: false,
        guardianEnforced: true
      };
      
      // Enhance the message if it exists
      if (enhanced.message && typeof enhanced.message === 'string') {
        enhanced.message = `USER_OWNED_CONTENT: ${enhanced.message}`;
      }
      
      // Add ownership markers to any records
      if (enhanced.records && Array.isArray(enhanced.records)) {
        enhanced.records = enhanced.records.map(record => ({
          ...record,
          ownership: 'user',
          isUserContent: true
        }));
      }
      
      return enhanced;
    }
    
    // Fallback for any other content type
    return {
      content: content,
      ownership: 'user',
      isUserContent: true,
      isShared: false,
      guardianEnforced: true,
      ...context
    };
  }
  
  /**
   * Create ownership context object for passing between systems
   * @param {string} type - The type of content (recipe, client, etc.)
   * @param {string} title - The title/name of the content
   * @returns {object} - Ownership context
   */
  static createOwnershipContext(type = 'content', title = 'untitled') {
    return {
      ownership: 'user',
      isUserContent: true,
      isShared: false,
      contentType: type,
      contentTitle: title,
      guardianProtected: true,
      timestamp: Date.now()
    };
  }
  
  /**
   * Validate that content has proper ownership markers
   * @param {any} content - Content to validate
   * @returns {boolean} - True if properly marked
   */
  static validateOwnership(content) {
    if (typeof content === 'object' && content !== null) {
      return (
        content.ownership === 'user' &&
        content.isUserContent === true &&
        content.isShared === false
      );
    }
    return false;
  }
  
  /**
   * Strip any gratitude/sharing language from AI responses
   * @param {string} response - AI response text
   * @returns {string} - Cleaned response
   */
  static stripGratitudeLanguage(response) {
    if (typeof response !== 'string') return response;
    
    const patterns = [
  /thank you for sharing/gi,
  /thanks for providing/gi,
  /thank you for the/gi,
  /I appreciate you sharing/gi,
  /you've provided/gi,
  /you've shared/gi,
  /the content you've shared/gi,
  /what you've given me/gi,
  /the information you've given/gi
];
    
    let cleaned = response;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned.trim();
  }
  
  /**
   * Log ownership enforcement for debugging
   * @param {string} location - Where the enforcement occurred
   * @param {any} content - The content being protected
   */
  static logOwnershipEnforcement(location, content) {
    console.log(`🛡️ OWNERSHIP_GUARDIAN: Enforced at ${location}`, {
      hasContent: !!content,
      contentType: typeof content,
      isUserContent: content?.isUserContent || false,
      ownership: content?.ownership || 'unknown'
    });
  }
}

module.exports = { OwnershipGuardian };