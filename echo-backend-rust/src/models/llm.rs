// src/models/llm.rs
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LLMProvider {
    OpenAI,
    Anthropic,
    Ollama,
    Proxy,  // For external microservices
}

pub struct LLMModule {
    provider: LLMProvider,
}

impl LLMModule {
    pub fn new(provider: LLMProvider) -> Self {
        Self { provider }
    }
}