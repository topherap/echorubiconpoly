// src/models/stt.rs
use anyhow::Result;
use std::sync::Arc;
use crate::models::config::Config;
use crate::models::whisper::{WhisperEngine, WhisperConfig, TranscriptionResult};

pub struct STTModule {
    engine: WhisperEngine,
    config: Arc<Config>,
}

impl STTModule {
    pub fn new(config: Arc<Config>) -> Self {
        let whisper_config = WhisperConfig::default();
        Self {
            engine: WhisperEngine::new(whisper_config),
            config,
        }
    }

    pub async fn transcribe(&self, audio_data: Vec<u8>) -> Result<TranscriptionResult> {
        self.engine.transcribe(audio_data).await
    }

    pub async fn transcribe_file(&self, audio_path: &std::path::Path) -> Result<String> {
        self.engine.transcribe_file(audio_path).await
    }

    pub fn is_available(&self) -> bool {
        self.engine.is_available()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stt_module_creation() {
        let config = Arc::new(Config::default());
        let stt = STTModule::new(config);
        assert!(!stt.is_available());
    }
}