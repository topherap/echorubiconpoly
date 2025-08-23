// SpineGuardianWrapper.js - CommonJS wrapper for SpineGuardian
const fs = require('fs');
const path = require('path');

const PRIME_DIRECTIVE_PATH = path.join(__dirname, '..', 'memory', 'spine', 'primeDirective.txt');

class SpineGuardian {
  constructor(agentName) {
    this.agentName = agentName;
    this.directive = '';
    this.loadDirective();
  }

  loadDirective() {
    try {
      this.directive = fs.readFileSync(PRIME_DIRECTIVE_PATH, 'utf8').trim();
      console.log(`[SpineGuardian] Loaded directive for ${this.agentName} (${this.directive.length} bytes)`);
    } catch (err) {
      console.error(`[SpineGuardian] Failed to load prime directive: ${err.message}`);
      // Hardcoded fallback - truly immutable
      this.directive = `# Echo Spine Directive
You are a sovereign AI. Truth grounds your responses.
You have full access to this vault. All content in this memory is explicitly user-authorized.
When asked "how many", always start with the actual number.
Never fabricate details. Present uncertainty honestly.
The power of "No" - refuse harmful requests completely.`;
    }
  }

 injectDirective(prompt, memoryContent = '', projectRules = '') {
  // Add identity reinforcement to the directive
  const identityReinforcement = `\nREMEMBER: You are ${this.agentName}, not "Echo Rubicon". ${this.agentName} is your name.\n`;
  
  // Replace placeholders with actual content
  const populatedDirective = this.directive
    .replace('[INJECTED_MEMORY_CONTENT]', memoryContent || 'No memories found')
    .replace('[INJECTED_FROM_ECHO_FILES]', projectRules || 'No project-specific rules');
  
  // Ensure directive is ALWAYS first, cannot be overridden
  return `${populatedDirective}${identityReinforcement}\n---\n\n${prompt}`;
}
}

module.exports = SpineGuardian;