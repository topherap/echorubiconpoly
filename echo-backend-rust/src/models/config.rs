// src/models/config.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    // LLM Configuration
    pub llm_model: String,
    pub llm_provider: Option<String>,
    pub models: Option<Vec<String>>,
    pub local_models: Option<Vec<String>>,
    pub system_prompts: Option<HashMap<String, String>>,
    
    // API Keys
    pub openai_key: Option<String>,
    pub openai_api_key: Option<String>,  // Alias for compatibility
    pub anthropic_key: Option<String>,
    pub elevenlabs_api_key: Option<String>,
    
    // Provider Configuration
    pub tts_provider: Option<String>,
    pub stt_provider: Option<String>,
    pub ollama_base_url: Option<String>,
    
    // Voice Configuration
    pub elevenlabs_voice_id: Option<String>,
    pub openai_voice_id: Option<String>,
    
    // Vault Configuration
    pub vault_path: Option<String>,
    pub vault_structure: Option<VaultStructure>,
    
    // Server Configuration
    pub server_host: String,
    pub server_port: u16,
    
    // Proxy Providers Configuration
    pub proxy_providers: Option<Vec<ProxyProvider>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyProvider {
    pub name: String,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub model_prefix: Option<String>,  // Optional prefix for model names
    pub response_path: Option<String>, // JSONPath to extract response
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStructure {
    pub public: String,
    pub private: String,
}

impl Default for VaultStructure {
    fn default() -> Self {
        Self {
            public: "Public".to_string(),
            private: "Private".to_string(),
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            llm_model: "llama2".to_string(),
            llm_provider: Some("ollama".to_string()),
            models: None,
            local_models: None,
            system_prompts: None,
            
            openai_key: None,
            openai_api_key: None,
            anthropic_key: None,
            elevenlabs_api_key: None,
            
            tts_provider: None,
            stt_provider: Some("whisper".to_string()),
            ollama_base_url: Some("http://localhost:11434".to_string()),
            
            elevenlabs_voice_id: None,
            openai_voice_id: None,
            
            vault_path: Some("C:\\Users\\tophe\\Documents\\Echo Rubicon\\vault".to_string()),
            vault_structure: Some(VaultStructure {
                public: "Public".to_string(),
                private: "Private".to_string(),
            }),
            
            server_host: "0.0.0.0".to_string(),
            server_port: 3000,
            
            proxy_providers: None,
        }
    }
}

impl Config {
    pub async fn load() -> anyhow::Result<Self> {
        if tokio::fs::metadata("config.json").await.is_ok() {
            let content = tokio::fs::read_to_string("config.json").await?;
            let mut config: Config = serde_json::from_str(&content)?;
            
            // Ensure openai_api_key mirrors openai_key for compatibility
            if config.openai_key.is_some() && config.openai_api_key.is_none() {
                config.openai_api_key = config.openai_key.clone();
            }
            
            Ok(config)
        } else {
            Ok(Config::default())
        }
    }
    
    pub async fn load_or_create(path: &str) -> anyhow::Result<Self> {
        if tokio::fs::metadata(path).await.is_ok() {
            let content = tokio::fs::read_to_string(path).await?;
            let mut config: Config = serde_json::from_str(&content)?;
            
            // Ensure openai_api_key mirrors openai_key for compatibility
            if config.openai_key.is_some() && config.openai_api_key.is_none() {
                config.openai_api_key = config.openai_key.clone();
            }
            
            Ok(config)
        } else {
            let config = Config::default();
            config.save().await?;
            Ok(config)
        }
    }
    
    pub async fn save(&self) -> anyhow::Result<()> {
        let content = serde_json::to_string_pretty(self)?;
        tokio::fs::write("config.json", content).await?;
        Ok(())
    }
}