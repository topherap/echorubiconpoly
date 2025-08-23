use anyhow::{anyhow, Result};
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use tokio::sync::mpsc;
use crate::models::config::Config;

pub struct TTSModule {
    client: Client,
    config: Arc<Config>,
}

impl TTSModule {
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }

    pub async fn synthesize(&self, text: String, voice_id: Option<String>) -> Result<Vec<u8>> {
        let config = &self.config;
        
        match config.tts_provider.as_deref() {
            Some("elevenlabs") => self.synthesize_elevenlabs(text, voice_id).await,
            Some("openai") => self.synthesize_openai(text, voice_id).await,
            Some(provider) => Err(anyhow!("Unknown TTS provider: {}", provider)),
            None => Err(anyhow!("No TTS provider configured")),
        }
    }

    async fn synthesize_elevenlabs(&self, text: String, voice_id: Option<String>) -> Result<Vec<u8>> {
        let config = &self.config;
        
        let api_key = config.elevenlabs_api_key.as_ref()
            .ok_or_else(|| anyhow!("ElevenLabs API key not configured"))?;
        
        // FIXED: Create owned String for default voice to avoid lifetime issues
        let default_voice = "21m00Tcm4TlvDq8ikWAM".to_string();
        let voice_id = voice_id.as_ref()
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
                    "stability": 0.5,
                    "similarity_boost": 0.5
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

    async fn synthesize_openai(&self, text: String, voice_id: Option<String>) -> Result<Vec<u8>> {
        let config = &self.config;
        
        let api_key = config.openai_api_key.as_ref()
            .ok_or_else(|| anyhow!("OpenAI API key not configured"))?;
        
        let voice = voice_id.unwrap_or_else(|| "alloy".to_string());
        
        let response = self.client
            .post("https://api.openai.com/v1/audio/speech")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&json!({
                "model": "tts-1",
                "input": text,
                "voice": voice,
                "response_format": "mp3"
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

    pub async fn stream_synthesize(
        &self,
        text: String,
        voice_id: Option<String>,
    ) -> Result<mpsc::Receiver<Result<Vec<u8>>>> {
        let (tx, rx) = mpsc::channel(10);
        let config = Arc::clone(&self.config);
        let client = self.client.clone();
        
        tokio::spawn(async move {
            let result = match config.tts_provider.as_deref() {
                Some("elevenlabs") => {
                    stream_elevenlabs(client, config, text, voice_id).await
                }
                Some("openai") => {
                    // OpenAI doesn't support streaming TTS yet, so we'll send the whole thing
                    let tts = TTSModule::new(config);
                    match tts.synthesize(text, voice_id).await {
                        Ok(data) => {
                            let _ = tx.send(Ok(data)).await;
                            Ok(())
                        }
                        Err(e) => Err(e),
                    }
                }
                Some(provider) => Err(anyhow!("Unknown TTS provider: {}", provider)),
                None => Err(anyhow!("No TTS provider configured")),
            };
            
            if let Err(e) = result {
                let _ = tx.send(Err(e)).await;
            }
        });
        
        Ok(rx)
    }
}

async fn stream_elevenlabs(
    client: Client,
    config: Arc<Config>,
    text: String,
    voice_id: Option<String>,
) -> Result<()> {
    let api_key = config.elevenlabs_api_key.as_ref()
        .ok_or_else(|| anyhow!("ElevenLabs API key not configured"))?;
    
    // FIXED: Create owned String for default voice to avoid lifetime issues
    let default_voice = "21m00Tcm4TlvDq8ikWAM".to_string();
    let voice_id = voice_id.as_ref()
        .or(config.elevenlabs_voice_id.as_ref())
        .unwrap_or(&default_voice);
    
    let url = format!(
        "https://api.elevenlabs.io/v1/text-to-speech/{}/stream",
        voice_id
    );
    
    let response = client
        .post(&url)
        .header("xi-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }))
        .send()
        .await?;
    
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await?;
        return Err(anyhow!("ElevenLabs API error ({}): {}", status, error_text));
    }
    
    // Note: Actual streaming implementation would process chunks here
    // For now, this is a placeholder
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tts_module_creation() {
        let config = Arc::new(Config::default());
        let tts = TTSModule::new(config);
        assert!(tts.synthesize("Test".to_string(), None).await.is_err());
    }
}