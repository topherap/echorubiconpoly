// src/main.rs - Complete updated version wsqlxstore::newith vault integration and session support
use axum::{
    extract::{Query, Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::{Json, Sse},
    routing::{get, post},
    Extension, Router,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use anyhow::Result;
use chrono;
use argon2::{Argon2, PasswordHash, PasswordVerifier, PasswordHasher};
use argon2::password_hash::{SaltString, rand_core::OsRng};
use tower_sessions::{Expiry, SessionManagerLayer};
use tower_sessions::MemoryStore;
use sqlx::SqlitePool;
use crate::state::vault_state::{VaultConfig, VaultStructure};

mod auth;
mod routes;
mod features;
mod models;
mod state;
mod vault;

use auth::{generate_token, require_auth, Claims};
use state::{RuntimeState, RuntimeConfig, VaultState};
use models::{
    llm::{LLMModule, LLMProvider},
    whisper::{WhisperEngine, WhisperConfig},
    tts::{TTSEngine, TTSConfig},
};

// Application state with vault support
#[derive(Clone)]
pub struct AppState {
    pub jwt_secret: Arc<Vec<u8>>,
    pub users: Arc<RwLock<HashMap<String, UserData>>>,
    pub messages: Arc<RwLock<Vec<EchoMessage>>>,
    pub whisper: Option<Arc<WhisperEngine>>,
    pub tts: Option<Arc<TTSEngine>>,
    pub runtime_state: Arc<RwLock<RuntimeState>>,
    pub vault_state: Arc<RwLock<VaultState>>,
}

impl AppState {
    pub async fn save_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        let runtime_state = self.runtime_state.read().await;
        runtime_state.save_config().await?;
        Ok(())
    }
}

// User data structure
#[derive(Clone, Debug)]
struct UserData {
    password_hash: String,
    features: Vec<String>,
}

// Echo message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EchoMessage {
    pub id: u64,
    pub content: String,
    pub timestamp: i64,
    pub user_id: String,
}

// Request/Response structures
#[derive(Deserialize)]
pub struct EchoRequest {
    pub message: String,
}

#[derive(Serialize)]
pub struct EchoResponse {
    pub echo: String,
    pub timestamp: i64,
    pub message_id: u64,
}

#[derive(Deserialize)]
pub struct StreamQuery {
    pub filter: Option<String>,
}

#[derive(Deserialize)]
pub struct SignupRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub username: String,
}

// Custom error type for voice functionality
#[derive(Debug)]
pub enum Error {
    BadRequest(String),
    Forbidden(String),
    Internal(String),
}

impl axum::response::IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            Error::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            Error::Forbidden(msg) => (StatusCode::FORBIDDEN, msg),
            Error::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };
        
        (status, Json(serde_json::json!({
            "error": message
        }))).into_response()
    }
}

// Health check endpoint
async fn health() -> Json<Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "echo-rubicon",
        "version": "0.3.0",
        "features": {
            "voice": true,
            "streaming": true,
            "vault": true,
            "llm": true
        }
    }))
}

// Signup endpoint
async fn signup(
    State(state): State<AppState>,
    Json(payload): Json<SignupRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let mut users = state.users.write().await;
    
    // Check if user already exists
    if users.contains_key(&payload.username) {
        return Err(StatusCode::CONFLICT);
    }
    
    // Hash password
    let argon2 = Argon2::default();
    let salt = SaltString::generate(&mut OsRng);
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .to_string();
    
    // Create user with voice features
    users.insert(
        payload.username.clone(),
        UserData {
            password_hash,
            features: vec![
                "chat".to_string(), 
                "streaming".to_string(),
                "voice-basic".to_string()
            ],
        },
    );
    
    // Generate token
    let claims = Claims {
        sub: payload.username.clone(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
        is_dev: false,
        features: vec![
            "chat".to_string(), 
            "streaming".to_string(),
            "voice-basic".to_string()
        ],
    };
    
    let token = generate_token(&claims, &state.jwt_secret)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(AuthResponse {
        token,
        username: payload.username,
    }))
}

// Login endpoint
async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let users = state.users.read().await;
    
    // Find user
    let user_data = users.get(&payload.username).ok_or(StatusCode::UNAUTHORIZED)?;
    
    // Verify password
    let argon2 = Argon2::default();
    let parsed_hash = PasswordHash::new(&user_data.password_hash)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    argon2
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    
    // Generate token
    let claims = Claims {
        sub: payload.username.clone(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
        is_dev: false,
        features: user_data.features.clone(),
    };
    
    let token = generate_token(&claims, &state.jwt_secret)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(AuthResponse {
        token,
        username: payload.username,
    }))
}

// Echo endpoint - requires authentication
async fn echo_message(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<EchoRequest>,
) -> Result<Json<EchoResponse>, StatusCode> {
    let timestamp = chrono::Utc::now().timestamp();
    let message_id = timestamp as u64;
    
    let echo_msg = EchoMessage {
        id: message_id,
        content: payload.message.clone(),
        timestamp,
        user_id: claims.sub,
    };
    
    // Store the message
    {
        let mut messages = state.messages.write().await;
        messages.push(echo_msg);
    }
    
    let response = EchoResponse {
        echo: format!("Echo: {}", payload.message),
        timestamp,
        message_id,
    };
    
    Ok(Json(response))
}

// Get messages endpoint - requires authentication
async fn get_messages(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Json<Vec<EchoMessage>> {
    let messages = state.messages.read().await;
    Json(messages.clone())
}

// SSE stream endpoint - requires authentication
async fn message_stream(
    State(state): State<AppState>,
    Query(params): Query<StreamQuery>,
    Extension(_claims): Extension<Claims>,
) -> Sse<impl futures::Stream<Item = Result<axum::response::sse::Event, std::convert::Infallible>> + Send> {
    let messages = state.messages.clone();
    let filter = params.filter;
    
    let stream = async_stream::stream! {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));
        
        loop {
            interval.tick().await;
            
            let messages_guard = messages.read().await;
            let latest_messages: Vec<_> = messages_guard
                .iter()
                .rev()
                .take(10)
                .filter(|msg| {
                    if let Some(ref f) = filter {
                        msg.content.contains(f)
                    } else {
                        true
                    }
                })
                .cloned()
                .collect();
            
            drop(messages_guard);
            
            if !latest_messages.is_empty() {
                let event_data = serde_json::to_string(&latest_messages).unwrap_or_default();
                let event = axum::response::sse::Event::default()
                    .event("messages")
                    .data(event_data);
                
                yield Ok(event);
            }
        }
    };
    
    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(std::time::Duration::from_secs(30))
            .text("keep-alive"),
    )
}

// Admin endpoint - requires admin features
async fn admin_stats(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Result<Json<Value>, StatusCode> {
    // Check if user has admin feature
    if !claims.has_feature("admin") {
        return Err(StatusCode::FORBIDDEN);
    }
    
    let messages = state.messages.read().await;
    let total_messages = messages.len();
    let unique_users = messages
        .iter()
        .map(|m| &m.user_id)
        .collect::<std::collections::HashSet<_>>()
        .len();
    
    // Add voice session stats if available
    let voice_sessions = 0; // Placeholder since voice_manager is commented out
    
    Ok(Json(serde_json::json!({
        "total_messages": total_messages,
        "unique_users": unique_users,
        "active_voice_sessions": voice_sessions,
        "service": "echo-rubicon-admin"
    })))
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();
    
    // Generate JWT secret
    let jwt_secret = Arc::new(
        std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string())
            .into_bytes(),
    );
    
    // Load or create config
    let config = RuntimeConfig::load_or_create("config.json").await?;
    println!("🚀 Server starting on port {}", config.server_port);

    // Initialize runtime state
    let runtime_state = Arc::new(RwLock::new(RuntimeState::new(config.clone())));

    // Initialize vault state
    println!("📁 Initializing vault system...");
    let vault_config = VaultConfig {
        vault_path: config.vault_path.clone().unwrap_or_else(|| "vault".to_string()),
        vault_structure: VaultStructure {
            public: config.vault_structure.as_ref()
                .map(|vs| vs.public.clone())
                .unwrap_or_else(|| "Public".to_string()),
            private: config.vault_structure.as_ref()
                .map(|vs| vs.private.clone())
                .unwrap_or_else(|| "Private".to_string()),
        },
    };
    let vault_state = VaultState::initialize(&vault_config).await?;
    let vault_state = Arc::new(RwLock::new(vault_state));
    println!("✅ Vault initialized at: {}", vault_config.vault_path);

    // Initialize voice components
    let whisper = if std::env::var("ENABLE_VOICE").unwrap_or_else(|_| "true".to_string()) == "true" {
        println!("🎤 Initializing Whisper engine...");
        let config = WhisperConfig::default();
        Some(Arc::new(WhisperEngine::new(config)))
    } else {
        None
    };
    
    let tts = if std::env::var("ENABLE_VOICE").unwrap_or_else(|_| "true".to_string()) == "true" {
        println!("🔊 Initializing TTS engine...");
        let config = TTSConfig::default();
        Some(Arc::new(TTSEngine::new(config)))
    } else {
        None
    };
    
    // Create application state
    let app_state = AppState {
        jwt_secret: jwt_secret.clone(),
        users: Arc::new(RwLock::new(HashMap::new())),
        messages: Arc::new(RwLock::new(Vec::new())),
        whisper,
        tts,
        runtime_state,
        vault_state,
    };

    // Create SQLite connection pool for sessions
    // Create SQLite connection pool for sessions
let db_path = "sqlite:echo_sessions.db?mode=rwc";
let pool = sqlx::sqlite::SqlitePoolOptions::new()
    .max_connections(5)
    .connect(db_path)
    .await
    .expect("Failed to create session database pool");

    // Run auth migration
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    
    // Create session store
    use tower_sessions::MemoryStore;
    let session_store = MemoryStore::default();
// No migration needed for memory store

    let session_layer = SessionManagerLayer::new(session_store)
        .with_secure(false)
        .with_expiry(Expiry::OnInactivity(tower_sessions::cookie::time::Duration::hours(24)));

    // Build the router
    let app = Router::new()
        // Public routes
        .route("/health", get(health))
        .route("/signup", post(signup))
        .route("/login", post(login))
        // Protected routes
        .route("/echo", post(echo_message))
        .route("/messages", get(get_messages))
        .route("/stream", get(message_stream))
        .route("/admin/stats", get(admin_stats))
        // LLM routes
        .nest("/llm", routes::llm::routes())
        // Vault routes
        .nest("/vault", routes::vault::routes())
        // Voice routes
        .nest("/voice", routes::voice::voice_routes())
        // Auth routes
        .nest("/api/auth", routes::auth::routes())
        // Apply auth middleware to protected routes
        .layer(middleware::from_fn_with_state(
            app_state.clone(),
            |state: State<AppState>, req: Request, next: Next| async move {
                // Skip auth for public routes
                let path = req.uri().path();
                if path == "/health" 
                    || path == "/signup" 
                    || path == "/login"
                    || path.starts_with("/llm/")
                    || path.starts_with("/vault/") {
                    return Ok(next.run(req).await);
                }
                
                // Apply auth middleware
                let jwt_secret = state.jwt_secret.clone();
                require_auth(Extension(jwt_secret), req, next).await
            },
        ))
        .layer(CorsLayer::permissive())
        .layer(session_layer)
        .layer(Extension(jwt_secret))
        .layer(Extension(pool))
        .with_state(app_state);
    
    // Get port from config or environment
    let port = config.server_port;
    let addr = format!("0.0.0.0:{}", port);
    
    println!("\n🚀 Echo Rubicon server starting on {}", addr);
    println!("🎙️  Voice features: {}", if std::env::var("ENABLE_VOICE").unwrap_or_else(|_| "true".to_string()) == "true" { "ENABLED" } else { "DISABLED" });
    println!("\n📚 Available endpoints:");
    println!("\n🔐 Auth endpoints:");
    println!("   - POST /signup - Create new account");
    println!("   - POST /login - Authenticate");
    println!("\n💬 Core endpoints:");
    println!("   - POST /echo - Echo a message");
    println!("   - GET  /messages - Get message history");
    println!("   - GET  /stream - SSE message stream");
    println!("\n🧠 LLM endpoints:");
    println!("   - GET  /llm/models - List available models");
    println!("   - POST /llm/use - Set active model");
    println!("   - POST /llm/conversation - Multi-model conversation");
    println!("   - GET  /llm/status - Model status");
    println!("\n📂 Vault endpoints:");
    println!("   - GET  /vault/query - Query vault documents");
    println!("   - GET  /vault/index/progress - Indexing progress");
    println!("\n🎤 Voice endpoints:");
    println!("   - POST /voice/input - Transcribe audio");
    println!("   - POST /voice/speak - Text-to-speech");
    println!("   - GET  /voice/stream/:id - Real-time audio streaming");
    println!("   - GET  /voice/voices - List available voices");
    println!("\n🛠️  Admin endpoints:");
    println!("   - GET  /admin/stats - Server statistics (requires admin role)");
    println!("\n");
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;
    
    Ok(())
}