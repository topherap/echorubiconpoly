// src/routes/llm.rs
use axum::{
    extract::State,
    response::{IntoResponse, Response, Json},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub size: String,
    pub modified: String,
    pub active: bool,
    pub model_type: ModelType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelType {
    Local,      // Ollama models
    OpenAI,     // GPT-3.5, GPT-4, etc.
    Claude,     // Anthropic Claude
    Proxy,      // External microservices
    Custom,     // Future expansion
}

#[derive(Debug, Deserialize)]
pub struct SetModelRequest {
    pub model: String,
    pub model_type: ModelType,
    pub as_primary: bool,
}

#[derive(Debug, Deserialize)]
pub struct ConversationRequest {
    pub prompt: String,
    pub models: Vec<String>,
    pub mode: ConversationMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConversationMode {
    Sequential,
    Consensus,
    Debate,
    Collaborative,
}

#[derive(Debug, Serialize)]
pub struct ModelResponse {
    pub model: String,
    pub response: String,
    pub timestamp: u64,
    pub thinking_time_ms: u64,
}

// Model routing helper
#[derive(Debug)]
enum ModelRouting {
    Ollama(String),
    OpenAI(String),
    Anthropic(String),
    Proxy { provider: String, model: String },
}

impl ModelRouting {
    fn parse(model_name: &str) -> Self {
        if model_name.starts_with("proxy:") {
            let parts: Vec<&str> = model_name.splitn(3, ':').collect();
            if parts.len() == 3 {
                return ModelRouting::Proxy {
                    provider: parts[1].to_string(),
                    model: parts[2].to_string(),
                };
            }
        } else if model_name.starts_with("gpt-") {
            return ModelRouting::OpenAI(model_name.to_string());
        } else if model_name.starts_with("claude-") {
            return ModelRouting::Anthropic(model_name.to_string());
        }
        
        // Default to Ollama for everything else
        ModelRouting::Ollama(model_name.to_string())
    }
}

// GET /llm/models
pub async fn get_models(
    State(state): State<AppState>,
) -> Result<Response, StatusCode> {
    let mut all_models = Vec::new();
    
    // Get Ollama models
    let output = tokio::process::Command::new("ollama")
        .arg("list")
        .output()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                all_models.push(ModelInfo {
                    name: parts[0].to_string(),
                    size: parts[parts.len() - 2].to_string(),
                    modified: parts[parts.len() - 1].to_string(),
                    active: false,
                    model_type: ModelType::Local,
                });
            }
        }
    }
    
    // Clone config to avoid holding the lock
    let config = {
        let runtime_state = state.runtime_state.read().await;
        runtime_state.config.clone()
    };
    
    // Add API models if keys are configured
    if config.openai_key.is_some() {
        all_models.extend(vec![
            ModelInfo {
                name: "gpt-3.5-turbo".to_string(),
                size: "API".to_string(),
                modified: "latest".to_string(),
                active: false,
                model_type: ModelType::OpenAI,
            },
            ModelInfo {
                name: "gpt-4".to_string(),
                size: "API".to_string(),
                modified: "latest".to_string(),
                active: false,
                model_type: ModelType::OpenAI,
            },
            ModelInfo {
                name: "gpt-4-turbo".to_string(),
                size: "API".to_string(),
                modified: "latest".to_string(),
                active: false,
                model_type: ModelType::OpenAI,
            },
        ]);
    }
    
    if config.anthropic_key.is_some() {
        all_models.extend(vec![
            ModelInfo {
                name: "claude-3-opus".to_string(),
                size: "API".to_string(),
                modified: "latest".to_string(),
                active: false,
                model_type: ModelType::Claude,
            },
            ModelInfo {
                name: "claude-3-sonnet".to_string(),
                size: "API".to_string(),
                modified: "latest".to_string(),
                active: false,
                model_type: ModelType::Claude,
            },
            ModelInfo {
                name: "claude-3-haiku".to_string(),
                size: "API".to_string(),
                modified: "latest".to_string(),
                active: false,
                model_type: ModelType::Claude,
            },
        ]);
    }
    
    // Add proxy models if configured
    if let Some(proxy_providers) = &config.proxy_providers {
        for provider in proxy_providers {
            all_models.push(ModelInfo {
                name: format!("proxy:{}:model", provider.name),
                size: "Proxy".to_string(),
                modified: "external".to_string(),
                active: false,
                model_type: ModelType::Proxy,
            });
        }
    }
    
    // Mark active model
    let current_model = config.llm_model.clone();
    for model in &mut all_models {
        if model.name == current_model {
            model.active = true;
        }
    }
    
    Ok(Json(serde_json::json!({
        "models": all_models,
        "primary": current_model,
    })).into_response())
}

// POST /llm/use
pub async fn set_model(
    State(state): State<AppState>,
    Json(payload): Json<SetModelRequest>,
) -> Result<StatusCode, StatusCode> {
    match payload.model_type {
        ModelType::Local => {
            let check = tokio::process::Command::new("ollama")
                .arg("show")
                .arg(&payload.model)
                .output()
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            
            if !check.status.success() {
                return Err(StatusCode::NOT_FOUND);
            }
        },
        ModelType::OpenAI => {
            let runtime_state = state.runtime_state.read().await;
            if runtime_state.config.openai_key.is_none() {
                return Err(StatusCode::UNAUTHORIZED);
            }
        },
        ModelType::Claude => {
            let runtime_state = state.runtime_state.read().await;
            if runtime_state.config.anthropic_key.is_none() {
                return Err(StatusCode::UNAUTHORIZED);
            }
        },
        ModelType::Proxy => {
            // Verify proxy provider exists
            let runtime_state = state.runtime_state.read().await;
            if let Some(providers) = &runtime_state.config.proxy_providers {
                let provider_name = payload.model.split(':').nth(1).unwrap_or("");
                if !providers.iter().any(|p| p.name == provider_name) {
                    return Err(StatusCode::NOT_FOUND);
                }
            } else {
                return Err(StatusCode::NOT_FOUND);
            }
        },
        _ => return Err(StatusCode::NOT_IMPLEMENTED),
    }
    
    // Update config
    {
        let mut runtime_state = state.runtime_state.write().await;
        if payload.as_primary {
            runtime_state.config.llm_model = payload.model;
        }
    }
    
    state.save_config().await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(StatusCode::OK)
}

// POST /llm/conversation
pub async fn multi_model_conversation(
    State(state): State<AppState>,
    Json(payload): Json<ConversationRequest>,
) -> Result<Response, StatusCode> {
    let mut responses = Vec::new();
    
    // Clone config to avoid holding lock during async operations
    let config = {
        let runtime_state = state.runtime_state.read().await;
        runtime_state.config.clone()
    };
    
    // Process each model
    for model_name in &payload.models {
        let start_time = std::time::Instant::now();
        
        let response_text = match ModelRouting::parse(model_name) {
            ModelRouting::Ollama(model) => {
                call_ollama_model(&model, &payload.prompt).await
                    .unwrap_or_else(|e| format!("Ollama error: {}", e))
            },
            ModelRouting::OpenAI(model) => {
                if let Some(key) = &config.openai_key {
                    call_openai_api(&model, &payload.prompt, key).await
                        .unwrap_or_else(|e| format!("OpenAI error: {}", e))
                } else {
                    "OpenAI API key not configured".to_string()
                }
            },
            ModelRouting::Anthropic(model) => {
                if let Some(key) = &config.anthropic_key {
                    call_anthropic_api(&model, &payload.prompt, key).await
                        .unwrap_or_else(|e| format!("Anthropic error: {}", e))
                } else {
                    "Anthropic API key not configured".to_string()
                }
            },
            ModelRouting::Proxy { provider, model } => {
                call_proxy_model(&provider, &model, &payload.prompt, &config).await
                    .unwrap_or_else(|e| format!("Proxy error: {}", e))
            },
        };
        
        let elapsed = start_time.elapsed();
        
        responses.push(ModelResponse {
            model: model_name.clone(),
            response: response_text,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            thinking_time_ms: elapsed.as_millis() as u64,
        });
    }
    
    // Process conversation mode
    let final_response = match payload.mode {
        ConversationMode::Sequential => responses,
        ConversationMode::Debate => {
            process_debate_mode(responses, &payload.models, &config).await
        },
        ConversationMode::Collaborative => {
            process_collaborative_mode(responses, &payload.models, &config).await
        },
        ConversationMode::Consensus => {
            process_consensus_mode(responses, &payload.models, &config).await
        },
    };
    
    Ok(Json(serde_json::json!({
        "mode": payload.mode,
        "responses": final_response,
        "total_models": payload.models.len(),
    })).into_response())
}

// Helper functions
async fn call_ollama_model(model: &str, prompt: &str) -> Result<String, Box<dyn std::error::Error>> {
    let output = tokio::process::Command::new("ollama")
        .arg("run")
        .arg(model)
        .arg(prompt)
        .output()
        .await?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Ollama failed: {}", stderr).into());
    }
    
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

async fn call_openai_api(model: &str, prompt: &str, api_key: &str) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }))
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("OpenAI API error: {}", error_text).into());
    }
    
    let json: serde_json::Value = response.json().await?;
    Ok(json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No response")
        .to_string())
}

async fn call_anthropic_api(model: &str, prompt: &str, api_key: &str) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&serde_json::json!({
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1000,
        }))
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("Anthropic API error: {}", error_text).into());
    }
    
    let json: serde_json::Value = response.json().await?;
    Ok(json["content"][0]["text"]
        .as_str()
        .unwrap_or("No response")
        .to_string())
}

async fn call_proxy_model(
    provider_name: &str,
    model: &str,
    prompt: &str,
    config: &crate::models::config::Config
) -> Result<String, Box<dyn std::error::Error>> {
    let providers = config.proxy_providers.as_ref()
        .ok_or("No proxy providers configured")?;
    
    let provider = providers.iter()
        .find(|p| p.name == provider_name)
        .ok_or(format!("Provider '{}' not found", provider_name))?;
    
    let client = reqwest::Client::new();
    let mut request = client
        .post(&provider.endpoint)
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "messages": [{"role": "user", "content": prompt}],
        }));
    
    // Add API key if configured
    if let Some(api_key) = &provider.api_key {
        request = request.header("Authorization", format!("Bearer {}", api_key));
    }
    
    // Add custom headers
    if let Some(headers) = &provider.headers {
        for (key, value) in headers {
            request = request.header(key, value);
        }
    }
    
    let response = request.send().await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("Proxy API error: {}", error_text).into());
    }
    
    let json: serde_json::Value = response.json().await?;
    
    // Try to extract response from common paths
    let text = json["response"].as_str()
        .or_else(|| json["content"].as_str())
        .or_else(|| json["text"].as_str())
        .or_else(|| json["message"].as_str())
        .or_else(|| json["choices"][0]["message"]["content"].as_str())
        .or_else(|| json["choices"][0]["text"].as_str());
    
    // If provider specified a custom response path, try that
    if let Some(response_path) = &provider.response_path {
        // Simple JSONPath-like extraction (e.g., "data.response")
        let mut current = &json;
        for part in response_path.split('.') {
            current = &current[part];
        }
        if let Some(text) = current.as_str() {
            return Ok(text.to_string());
        }
    }
    
    text.map(|s| s.to_string())
        .ok_or_else(|| "No response found in proxy response".into())
}

// Conversation mode processors
async fn process_debate_mode(
    initial_responses: Vec<ModelResponse>,
    models: &[String],
    config: &crate::models::config::Config,
) -> Vec<ModelResponse> {
    let mut all_responses = initial_responses;
    
    // 3 rounds of debate
    for round in 1..=3 {
        for (_i, model_name) in models.iter().enumerate() {
            let other_response = &all_responses.last().unwrap().response;
            let debate_prompt = format!(
                "Round {} - Respond to this argument: '{}'. Present a counter-argument or different perspective.",
                round, other_response
            );
            
            let response_text = match ModelRouting::parse(model_name) {
                ModelRouting::Ollama(model) => {
                    call_ollama_model(&model, &debate_prompt).await
                        .unwrap_or_else(|_| "Error in debate".to_string())
                },
                ModelRouting::OpenAI(model) => {
                    if let Some(key) = &config.openai_key {
                        call_openai_api(&model, &debate_prompt, key).await
                            .unwrap_or_else(|_| "Error in debate".to_string())
                    } else {
                        continue;
                    }
                },
                ModelRouting::Anthropic(model) => {
                    if let Some(key) = &config.anthropic_key {
                        call_anthropic_api(&model, &debate_prompt, key).await
                            .unwrap_or_else(|_| "Error in debate".to_string())
                    } else {
                        continue;
                    }
                },
                ModelRouting::Proxy { provider, model } => {
                    call_proxy_model(&provider, &model, &debate_prompt, config).await
                        .unwrap_or_else(|_| "Error in debate".to_string())
                },
            };
            
            all_responses.push(ModelResponse {
                model: model_name.clone(),
                response: response_text,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                thinking_time_ms: 0,
            });
        }
    }
    
    all_responses
}

async fn process_collaborative_mode(
    initial_responses: Vec<ModelResponse>,
    models: &[String],
    config: &crate::models::config::Config,
) -> Vec<ModelResponse> {
    let mut all_responses = initial_responses;
    
    for (i, model_name) in models.iter().enumerate().skip(1) {
        let previous = &all_responses[i-1].response;
        let collab_prompt = format!(
            "Build upon this idea: '{}'. Add your own insights and expand the concept.",
            previous
        );
        
        let response_text = match ModelRouting::parse(model_name) {
            ModelRouting::Ollama(model) => {
                call_ollama_model(&model, &collab_prompt).await
                    .unwrap_or_else(|_| "Error in collaboration".to_string())
            },
            ModelRouting::OpenAI(model) => {
                if let Some(key) = &config.openai_key {
                    call_openai_api(&model, &collab_prompt, key).await
                        .unwrap_or_else(|_| "Error in collaboration".to_string())
                } else {
                    continue;
                }
            },
            ModelRouting::Anthropic(model) => {
                if let Some(key) = &config.anthropic_key {
                    call_anthropic_api(&model, &collab_prompt, key).await
                        .unwrap_or_else(|_| "Error in collaboration".to_string())
                } else {
                    continue;
                }
            },
            ModelRouting::Proxy { provider, model } => {
                call_proxy_model(&provider, &model, &collab_prompt, config).await
                    .unwrap_or_else(|_| "Error in collaboration".to_string())
            },
        };
        
        all_responses.push(ModelResponse {
            model: model_name.clone(),
            response: response_text,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            thinking_time_ms: 0,
        });
    }
    
    all_responses
}

async fn process_consensus_mode(
    initial_responses: Vec<ModelResponse>,
    models: &[String],
    config: &crate::models::config::Config,
) -> Vec<ModelResponse> {
    let mut all_responses = initial_responses;
    
    let synthesis_prompt = format!(
        "These are different perspectives on the same topic: {}. Find common ground and synthesize a unified response.",
        all_responses.iter()
            .map(|r| format!("'{}': {}", r.model, r.response))
            .collect::<Vec<_>>()
            .join(", ")
    );
    
    if let Some(first_model) = models.first() {
        let response_text = match ModelRouting::parse(first_model) {
            ModelRouting::Ollama(model) => {
                call_ollama_model(&model, &synthesis_prompt).await
                    .unwrap_or_else(|_| "Error in consensus".to_string())
            },
            ModelRouting::OpenAI(model) => {
                if let Some(key) = &config.openai_key {
                    call_openai_api(&model, &synthesis_prompt, key).await
                        .unwrap_or_else(|_| "Error in consensus".to_string())
                } else {
                    "Cannot synthesize without API key".to_string()
                }
            },
            ModelRouting::Anthropic(model) => {
                if let Some(key) = &config.anthropic_key {
                    call_anthropic_api(&model, &synthesis_prompt, key).await
                        .unwrap_or_else(|_| "Error in consensus".to_string())
                } else {
                    "Cannot synthesize without API key".to_string()
                }
            },
            ModelRouting::Proxy { provider, model } => {
                call_proxy_model(&provider, &model, &synthesis_prompt, config).await
                    .unwrap_or_else(|_| "Error in consensus".to_string())
            },
        };
        
        all_responses.push(ModelResponse {
            model: format!("{} (Consensus)", first_model),
            response: response_text,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            thinking_time_ms: 0,
        });
    }
    
    all_responses
}

// GET /llm/status
pub async fn model_status(
    State(state): State<AppState>,
) -> Result<Response, StatusCode> {
    let config = {
        let runtime_state = state.runtime_state.read().await;
        runtime_state.config.clone()
    };
    
    let primary_model = config.llm_model.clone();
    let is_loaded = match ModelRouting::parse(&primary_model) {
        ModelRouting::Ollama(model) => {
            let check = tokio::process::Command::new("ollama")
                .arg("show")
                .arg(&model)
                .output()
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            check.status.success()
        },
        ModelRouting::OpenAI(_) => config.openai_key.is_some(),
        ModelRouting::Anthropic(_) => config.anthropic_key.is_some(),
        ModelRouting::Proxy { provider, .. } => {
            config.proxy_providers
                .as_ref()
                .map(|providers| providers.iter().any(|p| p.name == provider))
                .unwrap_or(false)
        },
    };
    
    Ok(Json(serde_json::json!({
        "primary_model": primary_model,
        "loaded": is_loaded,
        "capabilities": {
            "local_ai": true,
            "openai": config.openai_key.is_some(),
            "anthropic": config.anthropic_key.is_some(),
            "proxy": config.proxy_providers.is_some(),
            "multi_model": true,
            "conversation_modes": ["sequential", "debate", "collaborative", "consensus"],
        }
    })).into_response())
}

// Route registration
pub fn routes() -> axum::Router<AppState> {
    use axum::routing::{get, post};
    
    axum::Router::new()
        .route("/models", get(get_models))
        .route("/use", post(set_model))
        .route("/conversation", post(multi_model_conversation))
        .route("/status", get(model_status))
}