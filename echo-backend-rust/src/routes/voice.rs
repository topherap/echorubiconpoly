use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    response::{Json, Response, IntoResponse},
    routing::post,
    Router,
    body::Bytes,
};
use axum::response::sse::{Event, Sse};
use futures::stream::Stream;
use std::convert::Infallible;
use std::pin::Pin;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tracing::{info, error};

use crate::{
    models::config::Config,
    models::{stt::STTModule, tts::TTSModule},
    AppState,
};

#[derive(Debug, Serialize)]
struct TranscriptionResponse {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration: Option<f32>,
}

#[derive(Debug, Deserialize)]
struct TTSRequest {
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    voice_id: Option<String>,
    #[serde(default)]
    stream: bool,
}

#[derive(Debug, Serialize)]
struct TTSResponse {
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    audio_url: Option<String>,
}

pub async fn transcribe_audio(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    mut multipart: Multipart,
) -> Result<Json<TranscriptionResponse>, StatusCode> {
    let mut audio_data = Vec::new();
    let mut file_name = None;

    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let name = field.name().map(|s| s.to_string());
        
        if name.as_deref() == Some("audio") || name.as_deref() == Some("file") {
            file_name = field.file_name().map(|s| s.to_string());
            audio_data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?.to_vec();
            break;
        }
    }

    if audio_data.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    info!("Received audio file: {:?}, size: {} bytes", file_name, audio_data.len());

    let runtime_state = state.runtime_state.read().await;
    let config = Arc::new(runtime_state.config.clone());
    drop(runtime_state);

    let stt = STTModule::new(config);

    match stt.transcribe(audio_data).await {
        Ok(result) => {
            info!("Transcription successful: {}", result.text);
            Ok(Json(TranscriptionResponse {
                text: result.text,
                language: result.language,
                duration: Some(result.duration),
            }))
        }
        Err(e) => {
            error!("Transcription failed: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

pub async fn synthesize_speech(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    Json(request): Json<TTSRequest>,
) -> Result<Response, StatusCode> {
    info!("TTS request: {:?}", request);

    let runtime_state = state.runtime_state.read().await;
    let config = Arc::new(runtime_state.config.clone());
    drop(runtime_state);

    let tts = TTSModule::new(config);

    if request.stream {
        match tts.stream_synthesize(request.text, request.voice_id).await {
            Ok(mut audio_rx) => {
                let stream = async_stream::stream! {
                    while let Some(chunk_result) = audio_rx.recv().await {
                        match chunk_result {
                            Ok(chunk) => {
                                let encoded = base64::encode(&chunk);
                                yield Ok::<_, Infallible>(
                                    Event::default()
                                        .data(encoded)
                                        .event("audio")
                                );
                            }
                            Err(e) => {
                                yield Ok::<_, Infallible>(
                                    Event::default()
                                        .data(format!("Error: {}", e))
                                        .event("error")
                                );
                                break;
                            }
                        }
                    }
                    
                    yield Ok::<_, Infallible>(
                        Event::default()
                            .data("complete")
                            .event("done")
                    );
                };

                let sse_stream: Sse<Pin<Box<dyn Stream<Item = Result<Event, Infallible>> + Send>>> = 
                    Sse::new(Box::pin(stream));
                
                Ok(sse_stream.into_response())
            }
            Err(e) => {
                error!("TTS streaming failed: {}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    } else {
        match tts.synthesize(request.text, request.voice_id).await {
            Ok(audio_data) => {
                info!("TTS synthesis successful, size: {} bytes", audio_data.len());
                
                Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", "audio/mpeg")
                    .body(axum::body::Body::from(audio_data))
                    .unwrap()
                    .into_response())
            }
            Err(e) => {
                error!("TTS synthesis failed: {}", e);
                Err(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

pub async fn update_voice_settings(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    Json(settings): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    info!("Updating voice settings: {:?}", settings);

    let mut runtime_state = state.runtime_state.write().await;
    
    if let Some(provider) = settings.get("stt_provider").and_then(|v| v.as_str()) {
        runtime_state.config.stt_provider = Some(provider.to_string());
    }
    
    if let Some(provider) = settings.get("tts_provider").and_then(|v| v.as_str()) {
        runtime_state.config.tts_provider = Some(provider.to_string());
    }
    
    if let Some(voice_id) = settings.get("elevenlabs_voice_id").and_then(|v| v.as_str()) {
        runtime_state.config.elevenlabs_voice_id = Some(voice_id.to_string());
    }

    if let Err(e) = runtime_state.save_config().await {
        error!("Failed to save config: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    drop(runtime_state);

    Ok(Json(serde_json::json!({
        "message": "Voice settings updated successfully",
        "settings": settings
    })))
}

pub async fn stream_audio_test(
    State(_state): State<AppState>,  // Changed from State<Arc<AppState>>
) -> Result<impl IntoResponse, StatusCode> {
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Vec<u8>>(10);

    tokio::spawn(async move {
        for _i in 0..10 {
            let chunk = vec![0u8; 1024];
            if tx.send(chunk).await.is_err() {
                break;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
    });

    let stream = async_stream::stream! {
        while let Some(chunk) = rx.recv().await {
            let encoded = base64::encode(&chunk);
            yield Ok::<_, Infallible>(
                Event::default()
                    .data(encoded)
                    .event("audio")
            );
        }
        
        yield Ok::<_, Infallible>(
            Event::default()
                .data("complete")
                .event("done")
        );
    };

    Ok(Sse::new(stream).into_response())
}

pub async fn get_voice_status(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
) -> Result<Json<serde_json::Value>, StatusCode> {
    let runtime_state = state.runtime_state.read().await;
    let config = &runtime_state.config;

    Ok(Json(serde_json::json!({
        "stt": {
            "provider": config.stt_provider,
            "configured": config.stt_provider.is_some()
        },
        "tts": {
            "provider": config.tts_provider,
            "configured": config.tts_provider.is_some(),
            "voice_id": config.elevenlabs_voice_id
        }
    })))
}

pub async fn test_voice_pipeline(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    mut multipart: Multipart,
) -> Result<Response, StatusCode> {
    let mut audio_data = Vec::new();
    
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let name = field.name().map(|s| s.to_string());
        
        if name.as_deref() == Some("audio") || name.as_deref() == Some("file") {
            audio_data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?.to_vec();
            break;
        }
    }

    if audio_data.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let runtime_state = state.runtime_state.read().await;
    let config = Arc::new(runtime_state.config.clone());
    drop(runtime_state);

    let stt = STTModule::new(config.clone());
    let tts = TTSModule::new(config);

    let transcription = stt.transcribe(audio_data).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let audio_response = tts.synthesize(transcription.text.clone(), None).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "audio/mpeg")
        .header("X-Transcription", transcription.text)
        .body(axum::body::Body::from(audio_response))
        .unwrap()
        .into_response())
}

// Voice streaming endpoint
pub async fn voice_stream(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    // Create a simple test stream
    let stream = async_stream::stream! {
        for i in 0..10 {
            yield Ok(Event::default()
                .data(format!("Voice data chunk {}", i))
                .event("voice"));
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }
        yield Ok(Event::default().data("complete").event("done"));
    };
    
    Sse::new(stream)
}

// Voice-to-voice conversion endpoint
pub async fn voice_to_voice(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    body: Bytes,
) -> Result<impl IntoResponse, StatusCode> {
    // Get STT module
    let runtime_state = state.runtime_state.read().await;
    let config = Arc::new(runtime_state.config.clone());
    drop(runtime_state);
    
    let stt = STTModule::new(config.clone());
    let tts = TTSModule::new(config);
    
    // Transcribe the input audio
    let transcription = stt.transcribe(body.to_vec()).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Synthesize the response
    let audio_response = tts.synthesize(transcription.text.clone(), None).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Return audio with transcription in header
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "audio/mpeg")
        .header("X-Transcription", transcription.text)
        .body(axum::body::Body::from(audio_response))
        .unwrap())
}

pub fn routes() -> Router<AppState> {  // Changed from Router<Arc<AppState>>
    Router::new()
        .route("/voice/transcribe", post(transcribe_audio))
        .route("/voice/synthesize", post(synthesize_speech))
        .route("/voice/settings", post(update_voice_settings))
        .route("/voice/stream-test", post(stream_audio_test))
        .route("/voice/status", axum::routing::get(get_voice_status))
        .route("/voice/test-pipeline", post(test_voice_pipeline))
}

// Export the routes function with the old name for compatibility
pub fn voice_routes() -> axum::Router<crate::AppState> {  // Changed from Router<Arc<crate::AppState>>
    use axum::routing::{get, post};
    
    Router::new()
        .route("/input", post(transcribe_audio))    // Changed from /transcribe
        .route("/speak", post(synthesize_speech))   // Changed from /synthesize
        .route("/stream/:id", get(voice_stream))    // Changed from /stream
        .route("/voice-to-voice", post(voice_to_voice))
}