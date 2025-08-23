use std::collections::HashMap;
use std::path::PathBuf;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::models::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelState {
    pub model_id: String,
    pub provider: String,
    pub is_available: bool,
    pub last_used: Option<chrono::DateTime<chrono::Utc>>,
    pub total_requests: u64,
    pub total_tokens: u64,
    pub average_response_time_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationState {
    pub conversation_id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub message_count: usize,
    pub total_tokens: u64,
    pub active_models: Vec<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug)]
pub struct RuntimeState {
    pub config: Config,
    pub models: RwLock<HashMap<String, ModelState>>,
    pub conversations: RwLock<HashMap<String, ConversationState>>,
    pub system_prompts: RwLock<HashMap<String, String>>,
    pub vault_path: Option<PathBuf>,
}

impl RuntimeState {
    pub fn new(config: Config) -> Self {
        let vault_path = config.vault_path.as_ref().map(PathBuf::from);
        
        Self {
            config,
            models: RwLock::new(HashMap::new()),
            conversations: RwLock::new(HashMap::new()),
            system_prompts: RwLock::new(HashMap::new()),
            vault_path,
        }
    }

    pub async fn initialize(&self) -> Result<()> {
        // Initialize model states
        let mut models = self.models.write().await;
        
        // Add configured models
        if let Some(ref api_models) = self.config.models {
            for model in api_models {
                models.insert(
                    model.clone(),
                    ModelState {
                        model_id: model.clone(),
                        provider: "openai".to_string(), // Default to OpenAI for now
                        is_available: true,
                        last_used: None,
                        total_requests: 0,
                        total_tokens: 0,
                        average_response_time_ms: 0.0,
                    },
                );
            }
        }

        // Add local models if Ollama is configured
        if self.config.ollama_base_url.is_some() {
            if let Some(ref local_models) = self.config.local_models {
                for model in local_models {
                    models.insert(
                        model.clone(),
                        ModelState {
                            model_id: model.clone(),
                            provider: "ollama".to_string(),
                            is_available: true,
                            last_used: None,
                            total_requests: 0,
                            total_tokens: 0,
                            average_response_time_ms: 0.0,
                        },
                    );
                }
            }
        }

        // Load system prompts
        let mut system_prompts = self.system_prompts.write().await;
        system_prompts.insert(
            "default".to_string(),
            "You are a helpful assistant.".to_string(),
        );
        
        // Add any custom system prompts from config
        if let Some(ref prompts) = self.config.system_prompts {
            for (key, value) in prompts {
                system_prompts.insert(key.clone(), value.clone());
            }
        }

        Ok(())
    }

    pub async fn update_model_stats(
        &self,
        model_id: &str,
        tokens: u64,
        response_time_ms: f64,
    ) -> Result<()> {
        let mut models = self.models.write().await;
        
        if let Some(model) = models.get_mut(model_id) {
            model.last_used = Some(chrono::Utc::now());
            model.total_requests += 1;
            model.total_tokens += tokens;
            
            // Update rolling average response time
            let n = model.total_requests as f64;
            model.average_response_time_ms = 
                ((n - 1.0) * model.average_response_time_ms + response_time_ms) / n;
        }
        
        Ok(())
    }

    pub async fn create_conversation(&self, conversation_id: String) -> Result<()> {
        let mut conversations = self.conversations.write().await;
        
        conversations.insert(
            conversation_id.clone(),
            ConversationState {
                conversation_id,
                created_at: chrono::Utc::now(),
                last_activity: chrono::Utc::now(),
                message_count: 0,
                total_tokens: 0,
                active_models: Vec::new(),
                metadata: HashMap::new(),
            },
        );
        
        Ok(())
    }

    pub async fn update_conversation(
        &self,
        conversation_id: &str,
        tokens: u64,
        model_id: Option<&str>,
    ) -> Result<()> {
        let mut conversations = self.conversations.write().await;
        
        if let Some(conversation) = conversations.get_mut(conversation_id) {
            conversation.last_activity = chrono::Utc::now();
            conversation.message_count += 1;
            conversation.total_tokens += tokens;
            
            if let Some(model) = model_id {
                if !conversation.active_models.contains(&model.to_string()) {
                    conversation.active_models.push(model.to_string());
                }
            }
        }
        
        Ok(())
    }

    pub async fn get_system_prompt(&self, prompt_id: &str) -> Option<String> {
        let prompts = self.system_prompts.read().await;
        prompts.get(prompt_id).cloned()
    }

    pub async fn set_system_prompt(&self, prompt_id: String, prompt: String) -> Result<()> {
        let mut prompts = self.system_prompts.write().await;
        prompts.insert(prompt_id, prompt);
        Ok(())
    }

    pub async fn get_stats(&self) -> Result<serde_json::Value> {
        let models = self.models.read().await;
        let conversations = self.conversations.read().await;
        
        let total_requests: u64 = models.values().map(|m| m.total_requests).sum();
        let total_tokens: u64 = models.values().map(|m| m.total_tokens).sum();
        let active_conversations = conversations.len();
        
        Ok(serde_json::json!({
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "active_conversations": active_conversations,
            "models": models.values().collect::<Vec<_>>(),
            "uptime_seconds": 0, // TODO: Track actual uptime
        }))
    }

    // FIXED: Added save_config method
    pub async fn save_config(&self) -> Result<()> {
        let config_str = serde_json::to_string_pretty(&self.config)?;
        tokio::fs::write("config.json", config_str).await?;
        Ok(())
    }
}

// Re-export Config for compatibility
pub use crate::models::config::Config as RuntimeConfig;