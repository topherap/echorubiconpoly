import BaseEngine from '../core/BaseEngine.js';
import SpineGuardian from '../core/SpineGuardian.js';

export class CodeEngine extends BaseEngine {
  constructor(config) {
    super(config);
    this.name = 'Coder';
    this.guardian = new SpineGuardian(this.name);
  }

  async writeFunction(instruction) {
    const prompt = `You are a technical AI. Write code to solve: ${instruction}`;
    const injected = this.guardian.injectDirective(prompt);
    return this.queryModel(injected);
  }
}
