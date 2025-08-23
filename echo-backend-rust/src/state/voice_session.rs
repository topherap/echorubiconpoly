/*// src/state.rs - Voice session management integration
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::modules::{
    whisper::{WhisperEngine, WhisperConfig},
    tts::{TTSEngine, TTSConfig},
    //voice_streamer::{VoiceStreamer, StreamConfig},
};

pub struct VoiceSessionManager {
    sessions: Arc<RwLock<HashMap<String, Arc<VoiceStreamer>>>>,
    tts: Arc<TTSEngine>,
    cleanup_interval: tokio::time::Duration,
}

impl VoiceSessionManager {
    pub fn new() -> Self {
        let tts_config = TTSConfig::default();
        let tts = Arc::new(TTSEngine::new(tts_config));

        let manager = Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            tts,
            cleanup_interval: tokio::time::Duration::from_secs(300), // 5 minutes
        };

        // Start cleanup task
        let sessions_clone = Arc::clone(&manager.sessions);
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
            loop {
                interval.tick().await;
                // TODO: Implement session cleanup based on age
                let mut sessions = sessions_clone.write().await;
                sessions.retain(|_, _| {
                    // Keep all sessions for now
                    true
                });
            }
        });

        manager
    }

    pub async fn get_or_create_streamer(&self, session_id: &str) -> Arc<VoiceStreamer> {
        let mut sessions = self.sessions.write().await;
        
        if let Some(streamer) = sessions.get(session_id) {
            return Arc::clone(streamer);
        }

        let config = StreamConfig::default();
        let streamer = Arc::new(VoiceStreamer::new(Arc::clone(&self.tts), config));
        sessions.insert(session_id.to_string(), Arc::clone(&streamer));
        
        streamer
    }

    pub async fn remove_streamer(&self, session_id: &str) {
        let mut sessions = self.sessions.write().await;
        sessions.remove(session_id);
    }

    pub async fn get_streamer(&self, session_id: &str) -> Option<Arc<VoiceStreamer>> {
        let sessions = self.sessions.read().await;
        sessions.get(session_id).cloned()
    }

    pub async fn active_sessions(&self) -> usize {
        let sessions = self.sessions.read().await;
        sessions.len()
    }
}

// Extension trait for AppState
impl crate::AppState {
    pub async fn get_voice_streamer(&self, session_id: &str) -> Option<Arc<VoiceStreamer>> {
        if let Some(ref manager) = self.voice_manager {
            manager.get_streamer(session_id).await
        } else {
            None
        }
    }

    pub async fn get_or_create_voice_streamer(&self, session_id: &str) -> Option<Arc<VoiceStreamer>> {
        if let Some(ref manager) = self.voice_manager {
            Some(manager.get_or_create_streamer(session_id).await)
        } else {
            None
        }
    }

    pub async fn remove_voice_session(&self, session_id: &str) {
        if let Some(ref manager) = self.voice_manager {
            manager.remove_streamer(session_id).await
        }
    }
}*/