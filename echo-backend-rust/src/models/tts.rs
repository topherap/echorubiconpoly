// src/models/tts.rs
use anyhow::{anyhow, Result};
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use tokio::sync::mpsc;
use crate::models::config::Config;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VoiceTier {
    Basic,
    Pro,
    Creator,
}

impl Default for VoiceTier {
    fn default() -> Self {
        Self::Basic
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceSettings {
    pub voice_id: Option<String>,
    pub tier: VoiceTier,
    pub stability: f32,
    pub similarity_boost: f32,
    pub style: f32,
    pub use_speaker_boost: bool,
    pub rate: f32,
    pub pitch: f32,
}

impl Default for VoiceSettings {
    fn default() -> Self {
        Self {
            voice_id: None,
            tier: VoiceTier::Basic,
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: false,
            rate: 1.0,
            pitch: 1.0,
        }
    }
}

pub struct TTSConfig {
    pub provider: String,
}

impl Default for TTSConfig {
    fn default() -> Self {
        Self {
            provider: "elevenlabs".to_string(),
        }
    }
}

pub struct TTSEngine {
    client: Client,
    config: Arc<Config>,
}

impl TTSEngine {
    pub fn new(_tts_config: TTSConfig) -> Self {
        Self {
            client: Client::new(),
            config: Arc::new(Config::default()),
        }
    }
    
    pub fn with_config(config: Arc<Config>) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    pub async fn synthesize(&self, text: &str, settings: &VoiceSettings) -> Result<Vec<u8>> {
        let config = &self.config;
        
        match config.tts_provider.as_deref() {
            Some("elevenlabs") => self.synthesize_elevenlabs(text, settings).await,
            Some("openai") => self.synthesize_openai(text, settings).await,
            Some(provider) => Err(anyhow!("Unknown TTS provider: {}", provider)),
            None => Err(anyhow!("No TTS provider configured")),
        }
    }

    pub async fn synthesize_stream(&self, text: &str, settings: &VoiceSettings) -> Result<Response> {
        let config = &self.config;
        
        match config.tts_provider.as_deref() {
            Some("elevenlabs") => self.stream_elevenlabs(text, settings).await,
            Some("openai") => {
                // OpenAI doesn't support streaming, return error
                Err(anyhow!("OpenAI TTS does not support streaming"))
            }
            Some(provider) => Err(anyhow!("Unknown TTS provider: {}", provider)),
            None => Err(anyhow!("No TTS provider configured")),
        }
    }

    async fn synthesize_elevenlabs(&self, text: &str, settings: &VoiceSettings) -> Result<Vec<u8>> {
        let config = &self.config;
        
        let api_key = config.elevenlabs_api_key.as_ref()
            .ok_or_else(|| anyhow!("ElevenLabs API key not configured"))?;
        
        let default_voice = "21m00Tcm4TlvDq8ikWAM".to_string();
        let voice_id = settings.voice_id.as_ref()
            .or(config.elevenlabs_voice_id.as_ref())
            .unwrap_or(&default_voice);
        
        let url = format!(
            "https://api.elevenlabs.io/v1/text-to-speech/{}",
            voice_id
        );
        
        let response = self.client
            .post(&url)
            .header("xi-api-key", api_key)
            .header("Content-Type", "application/json")
            .json(&json!({
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": settings.stability,
                    "similarity_boost": settings.similarity_boost,
                    "style": settings.style,
                    "use_speaker_boost": settings.use_speaker_boost,
                }
            }))
            .send()
            .await?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await?;
            return Err(anyhow!("ElevenLabs API error ({}): {}", status, error_text));
        }
        
        let audio_data = response.bytes().await?;
        Ok(audio_data.to_vec())
    }

    async fn synthesize_openai(&self, text: &str, settings: &VoiceSettings) -> Result<Vec<u8>> {
        let config = &self.config;
        
        let api_key = config.openai_api_key.as_ref()
            .or(config.openai_key.as_ref())
            .ok_or_else(|| anyhow!("OpenAI API key not configured"))?;
        
        let voice = settings.voice_id.as_ref()
            .or(config.openai_voice_id.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("alloy");
        
        let response = self.client
            .post("https://api.openai.com/v1/audio/speech")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": "tts-1",
                "input": text,
                "voice": voice,
                "response_format": "mp3",
                "speed": settings.rate,
            }))
            .send()
            .await?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await?;
            return Err(anyhow!("OpenAI TTS API error ({}): {}", status, error_text));
        }
        
        let audio_data = response.bytes().await?;
        Ok(audio_data.to_vec())
    }

    async fn stream_elevenlabs(&self, text: &str, settings: &VoiceSettings) -> Result<Response> {
        let config = &self.config;
        
        let api_key = config.elevenlabs_api_key.as_ref()
            .ok_or_else(|| anyhow!("ElevenLabs API key not configured"))?;
        
        let default_voice = "21m00Tcm4TlvDq8ikWAM".to_string();
        let voice_id = settings.voice_id.as_ref()
            .or(config.elevenlabs_voice_id.as_ref())
            .unwrap_or(&default_voice);
        
        let url = format!(
            "https://api.elevenlabs.io/v1/text-to-speech/{}/stream",
            voice_id
        );
        
        let response = self.client
            .post(&url)
            .header("xi-api-key", api_key)
            .header("Content-Type", "application/json")
            .json(&json!({
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": settings.stability,
                    "similarity_boost": settings.similarity_boost,
                    "style": settings.style,
                    "use_speaker_boost": settings.use_speaker_boost,
                }
            }))
            .send()
            .await?;
        
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await?;
            return Err(anyhow!("ElevenLabs API error ({}): {}", status, error_text));
        }
        
        Ok(response)
    }
}

// Legacy TTSModule for backward compatibility
pub struct TTSModule {
    engine: TTSEngine,
}

impl TTSModule {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            engine: TTSEngine::with_config(config),
        }
    }

    pub async fn synthesize(&self, text: String, voice_id: Option<String>) -> Result<Vec<u8>> {
        let settings = VoiceSettings {
            voice_id,
            ..Default::default()
        };
        self.engine.synthesize(&text, &settings).await
    }

    pub async fn stream_synthesize(
        &self,
        text: String,
        voice_id: Option<String>,
    ) -> Result<mpsc::Receiver<Result<Vec<u8>>>> {
        let (tx, rx) = mpsc::channel(10);
        let engine = TTSEngine::with_config(Arc::clone(&self.engine.config));
        
        tokio::spawn(async move {
            let settings = VoiceSettings {
                voice_id,
                ..Default::default()
            };
            
            match engine.synthesize(&text, &settings).await {
                Ok(data) => {
                    let _ = tx.send(Ok(data)).await;
                }
                Err(e) => {
                    let _ = tx.send(Err(e)).await;
                }
            }
        });
        
        Ok(rx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tts_engine_creation() {
        let engine = TTSEngine::new(TTSConfig::default());
        let settings = VoiceSettings::default();
        assert!(engine.synthesize("Test", &settings).await.is_err());
    }
}