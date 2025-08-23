// API wrapper for Q-Lib to call Ollama
// Separate from main app to avoid circular dependencies
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function apiCall({ model, prompt, stream = false, temperature = 0.7, options = {} }) {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream,
        options: {
          temperature,
          ...options
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }
    
    if (!stream) {
      const data = await response.json();
      return data.response;
    }
    
    // Handle streaming (not used by Q-Lib)
    return response;
  } catch (error) {
    console.error('[API Wrapper] Ollama call failed:', error);
    throw error;
  }
}

module.exports = { apiCall };