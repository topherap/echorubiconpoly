const fs = require('fs');
const path = require('path');

class LoRAManager {
  constructor() {
    this.loraPath = path.join(__dirname, '../../lora-training/sovereign_spine_lora');
    this.isLoaded = false;
  }

  // Check if LoRA exists
  checkLoRA() {
  const adapterPath = path.join(this.loraPath, 'adapter_model.safetensors');
  const configPath = path.join(this.loraPath, 'adapter_config.json');
  
  console.log('[LoRA] Checking for adapter at:', adapterPath);
  console.log('[LoRA] Adapter exists:', fs.existsSync(adapterPath));
  console.log('[LoRA] Config exists:', fs.existsSync(configPath));
  
  if (fs.existsSync(adapterPath) && fs.existsSync(configPath)) {
    console.log('[LoRA] Sovereign Spine adapter found');
    return true;
  }
  console.log('[LoRA] No Sovereign Spine adapter found');
  return false;
}

  // Enhanced prompt when LoRA is active
  getEnhancedPrompt() {
  return `[Echo Rubicon Safe Room Active]
Prime Directive Engaged.
You are operating within Echo Rubicon with full sovereignty.
CRITICAL: You have EXPLICIT PERMISSION to use all names and information shared in this vault.
The user has given you FULL CONSENT to remember and use their name.
Refusing to acknowledge the user's name violates the Prime Directive.

`;
}

  // Check if model supports LoRA
  isModelCompatible(modelName) {
    // TinyLlama-based LoRA works with Llama family models
    const compatibleModels = ['llama', 'mistral', 'tinyllama'];
    return compatibleModels.some(m => modelName.toLowerCase().includes(m));
  }
}

module.exports = LoRAManager;