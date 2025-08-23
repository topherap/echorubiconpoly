import BaseEngine from '../core/BaseEngine.js';
import SpineGuardian from '../core/SpineGuardian.js';

export class WriterEngine extends BaseEngine {
  constructor(config) {
    super(config);
    this.name = 'Writer';
    this.guardian = new SpineGuardian(this.name);
  }

  async generateCreativeOutput(topic) {
    const prompt = `You are a literary assistant. Help write or brainstorm: ${topic}`;
    const injected = this.guardian.injectDirective(prompt);
    return this.queryModel(injected);
  }
}
