import BaseEngine from '../core/BaseEngine.js';
import SpineGuardian from '../core/SpineGuardian.js';

export class BusinessEngine extends BaseEngine {
  constructor(config) {
    super(config);
    this.name = 'Strategist';
    this.guardian = new SpineGuardian(this.name);
  }

  async draftStrategy(goal) {
    const prompt = `You are a business strategist. Advise on: ${goal}`;
    const injected = this.guardian.injectDirective(prompt);
    return this.queryModel(injected);
  }
}
