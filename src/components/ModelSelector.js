// src/components/ModelSelector.js
const ModelSelector = ({ currentModel, onModelChange }) => {
  const [models, setModels] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    // Always start with fallback models
    const fallbackModels = [
      'openchat:latest',
      'dolphin-mistral:latest', 
      'mistral:latest',
      'granite3.3:2b',
      'llama3.2:1b'
    ];
    
    // Set fallback models immediately so dropdown is never empty
    setModels(fallbackModels);
    console.log('[ModelSelector] Set initial fallback models');
    
    try {
      // Try to fetch actual models from Ollama
      const res = await fetch('http://localhost:11434/api/tags');
      const data = await res.json();
      
      if (data.models && Array.isArray(data.models) && data.models.length > 0) {
        const modelList = data.models.map(m => m.name);
        setModels(modelList);
        console.log('[ModelSelector] Updated with Ollama models:', modelList);
      }
    } catch (err) {
      console.error('[ModelSelector] Ollama fetch failed, keeping fallback models:', err);
    }
  };

  const handleModelChange = async (e) => {
    const model = e.target.value;
    setLoading(true);
    
    try {
      // Just call the callback - let parent handle the actual model switch
      onModelChange(model);
      console.log('[ModelSelector] Model changed to:', model);
      
      // Store selection in localStorage for persistence
      localStorage.setItem('selectedModel', model);
    } catch (err) {
      console.error('[ModelSelector] Failed to switch model:', err);
    }
    
    setLoading(false);
  };

  return React.createElement('div', { className: 'model-selector-wrapper' }, [
    React.createElement('select', {
      key: 'model-select',
      value: currentModel || models[0] || '',
      onChange: handleModelChange,
      disabled: loading,
      className: 'model-selector-select',
      style: {
        backgroundColor: '#2a2a2a',
        color: 'white',
        border: '1px solid #666',
        padding: '8px 12px',
        borderRadius: '6px',
        minWidth: '200px'
      }
    }, models.length > 0 ? models.map(model => 
      React.createElement('option', { 
        key: model, 
        value: model,
        style: {
          backgroundColor: '#3a3a3a',
          color: 'white'
        }
      }, model)
    ) : React.createElement('option', { 
      key: 'loading', 
      value: '',
      disabled: true
    }, 'Loading models...'))
  ]);
};