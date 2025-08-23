// src/modules/voice_streamer.rs
use tokio::sync::{mpsc, broadcast, Mutex};
use tokio::time::{sleep, Duration};
use std::sync::Arc;
use futures::StreamExt;
use bytes::Bytes;

use crate::modules::tts::{TTSEngine, VoiceSettings, VoiceTier};
use crate::Error;

#[derive(Debug, Clone)]
pub struct StreamConfig {
    pub buffer_size: usize,
    pub punctuation_delay_ms: u64,
    pub max_chunk_size: usize,
    pub voice_settings: VoiceSettings,
}

impl Default for StreamConfig {
    fn default() -> Self {
        Self {
            buffer_size: 5,
            punctuation_delay_ms: 50,
            max_chunk_size: 150,
            voice_settings: VoiceSettings::default(),
        }
    }
}

#[derive(Debug)]
struct TokenBuffer {
    tokens: Vec<String>,
    current_chunk: String,
}

impl TokenBuffer {
    fn new() -> Self {
        Self {
            tokens: Vec::new(),
            current_chunk: String::new(),
        }
    }

    fn add_token(&mut self, token: &str) {
        self.tokens.push(token.to_string());
        self.current_chunk.push_str(token);
    }

    fn should_flush(&self, config: &StreamConfig) -> bool {
        // Flush on punctuation
        if self.current_chunk.chars().any(|c| ".!?:;".contains(c)) {
            return true;
        }

        // Flush on buffer size
        if self.tokens.len() >= config.buffer_size {
            return true;
        }

        // Flush on chunk size limit
        if self.current_chunk.len() >= config.max_chunk_size {
            return true;
        }

        false
    }

    fn flush(&mut self) -> String {
        let chunk = self.current_chunk.clone();
        self.tokens.clear();
        self.current_chunk.clear();
        chunk.trim().to_string()
    }
}

pub struct VoiceStreamer {
    tts: Arc<TTSEngine>,
    config: StreamConfig,
    audio_tx: broadcast::Sender<Bytes>,
    control_tx: mpsc::Sender<StreamControl>,
    control_rx: Arc<Mutex<mpsc::Receiver<StreamControl>>>,
}

#[derive(Debug, Clone)]
pub enum StreamControl {
    Pause,
    Resume,
    Stop,
    UpdateSettings(VoiceSettings),
}

impl VoiceStreamer {
    pub fn new(tts: Arc<TTSEngine>, config: StreamConfig) -> Self {
        let (audio_tx, _) = broadcast::channel(1024);
        let (control_tx, control_rx) = mpsc::channel(32);

        Self {
            tts,
            config,
            audio_tx,
            control_tx: control_tx.clone(),
            control_rx: Arc::new(Mutex::new(control_rx)),
        }
    }

    pub async fn process_token_stream(
        &self,
        mut token_rx: mpsc::Receiver<String>,
    ) -> Result<(), Error> {
        let mut buffer = TokenBuffer::new();
        let mut is_paused = false;
        let mut should_stop = false;

        // Clone config for thread-safe updates
        let config = Arc::new(Mutex::new(self.config.clone()));
        let config_clone = Arc::clone(&config);

        // Spawn control handler
        let control_rx = Arc::clone(&self.control_rx);
        tokio::spawn(async move {
            let mut rx = control_rx.lock().await;
            while let Some(control) = rx.recv().await {
                match control {
                    StreamControl::UpdateSettings(settings) => {
                        let mut cfg = config_clone.lock().await;
                        cfg.voice_settings = settings;
                    }
                    _ => {} // Other controls handled in main loop
                }
            }
        });

        loop {
            // Check control messages
            if let Ok(control) = self.control_tx.try_recv() {
                match control {
                    StreamControl::Pause => is_paused = true,
                    StreamControl::Resume => is_paused = false,
                    StreamControl::Stop => should_stop = true,
                    _ => {}
                }
            }

            if should_stop {
                break;
            }

            if is_paused {
                sleep(Duration::from_millis(100)).await;
                continue;
            }

            // Process tokens
            tokio::select! {
                Some(token) = token_rx.recv() => {
                    buffer.add_token(&token);

                    let current_config = config.lock().await.clone();
                    if buffer.should_flush(&current_config) {
                        let text = buffer.flush();
                        if !text.is_empty() {
                            if let Err(e) = self.synthesize_and_broadcast(text, &current_config.voice_settings).await {
                                eprintln!("TTS synthesis error: {:?}", e);
                            }
                            
                            // Add natural pause after punctuation
                            if text.chars().any(|c| ".!?".contains(c)) {
                                sleep(Duration::from_millis(current_config.punctuation_delay_ms)).await;
                            }
                        }
                    }
                }
                _ = sleep(Duration::from_millis(500)) => {
                    // Timeout - flush any remaining tokens
                    let text = buffer.flush();
                    if !text.is_empty() {
                        let current_config = config.lock().await.clone();
                        if let Err(e) = self.synthesize_and_broadcast(text, &current_config.voice_settings).await {
                            eprintln!("TTS synthesis error: {:?}", e);
                        }
                    }
                }
            }
        }

        // Final flush
        let text = buffer.flush();
        if !text.is_empty() {
            let current_config = config.lock().await.clone();
            if let Err(e) = self.synthesize_and_broadcast(text, &current_config.voice_settings).await {
                eprintln!("Final TTS synthesis error: {:?}", e);
            }
        }

        Ok(())
    }

    async fn synthesize_and_broadcast(
        &self,
        text: String,
        settings: &VoiceSettings,
    ) -> Result<(), Error> {
        match settings.tier {
            VoiceTier::Basic => {
                // Basic tier: synthesize full chunk
                let audio = self.tts.synthesize(&text, settings).await?;
                let _ = self.audio_tx.send(Bytes::from(audio));
            }
            VoiceTier::Pro | VoiceTier::Creator => {
                // Pro/Creator: use streaming synthesis
                match self.tts.synthesize_stream(&text, settings).await {
                    Ok(mut response) => {
                        // Stream audio chunks as they arrive
                        let stream = response.bytes_stream();
                        let mut stream = std::pin::pin!(stream);
                        
                        while let Some(chunk) = stream.next().await {
                            match chunk {
                                Ok(bytes) => {
                                    let _ = self.audio_tx.send(bytes);
                                }
                                Err(e) => {
                                    eprintln!("Error streaming chunk: {:?}", e);
                                }
                            }
                        }
                    }
                    Err(_) => {
                        // Fallback to non-streaming
                        let audio = self.tts.synthesize(&text, settings).await?;
                        let _ = self.audio_tx.send(Bytes::from(audio));
                    }
                }
            }
        }

        Ok(())
    }

    pub fn subscribe_audio(&self) -> broadcast::Receiver<Bytes> {
        self.audio_tx.subscribe()
    }

    pub async fn send_control(&self, control: StreamControl) -> Result<(), Error> {
        self.control_tx.send(control).await
            .map_err(|_| Error::Internal("Failed to send control message".into()))
    }
}

// Voice queue for non-streaming playback
pub struct VoiceQueue {
    queue: Arc<Mutex<Vec<Vec<u8>>>>,
    playback_tx: mpsc::Sender<Vec<u8>>,
    playback_rx: Arc<Mutex<mpsc::Receiver<Vec<u8>>>>,
}

impl VoiceQueue {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel(32);
        Self {
            queue: Arc::new(Mutex::new(Vec::new())),
            playback_tx: tx,
            playback_rx: Arc::new(Mutex::new(rx)),
        }
    }

    pub async fn enqueue(&self, audio: Vec<u8>) {
        let mut queue = self.queue.lock().await;
        queue.push(audio);
        
        if queue.len() == 1 {
            // Start playback if this is the first item
            if let Some(audio) = queue.get(0) {
                let _ = self.playback_tx.send(audio.clone()).await;
            }
        }
    }

    pub async fn get_next(&self) -> Option<Vec<u8>> {
        let mut rx = self.playback_rx.lock().await;
        rx.recv().await
    }

    pub async fn clear(&self) {
        let mut queue = self.queue.lock().await;
        queue.clear();
    }

    pub async fn advance(&self) {
        let mut queue = self.queue.lock().await;
        if !queue.is_empty() {
            queue.remove(0);
            if let Some(audio) = queue.get(0) {
                let _ = self.playback_tx.send(audio.clone()).await;
            }
        }
    }
}
