// GeneralEngine.js - General-purpose conversational AI with spine
import { BaseEngine } from '../core/BaseEngine.js';
import { SpineGuardian } from '../core/SpineGuardian.js';

export class GeneralEngine extends BaseEngine {
  constructor(config) {
    super(config);
    this.name = 'Echo';
    this.role = 'general';
    this.guardian = new SpineGuardian(this.name);
  }
  
  async respond(input) {
    // Use the parent respond method which handles capsule creation
    return super.respond(input);
  }
}
