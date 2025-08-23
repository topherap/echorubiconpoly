use axum::{
    extract::{Extension, Json},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tower_sessions::Session;

#[derive(Deserialize)]
pub struct UnlockRequest {
    passphrase: String,
}

#[derive(Serialize)]
pub struct AuthStatus {
    authenticated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
}

#[derive(Serialize)]
pub struct UnlockResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    first_run: Option<bool>,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub fn routes() -> Router<crate::AppState> {
    Router::new()
        .route("/status", get(auth_status))
        .route("/unlock", post(unlock))
        .route("/logout", post(logout))
}

async fn auth_status(session: Session) -> impl IntoResponse {
    let authenticated = session
        .get::<bool>("authenticated")
        .await
        .unwrap_or(Some(false))
        .unwrap_or(false);

    Json(AuthStatus {
        authenticated,
        session_id: if authenticated {
            session.id().map(|id| id.to_string())
        } else {
            None
        },
    })
}

async fn unlock(
    session: Session,
    Extension(pool): Extension<SqlitePool>,
    Json(payload): Json<UnlockRequest>,
) -> impl IntoResponse {
    // Check if first run
    let existing: Option<(String,)> = sqlx::query_as("SELECT hash FROM auth WHERE id = 1")
        .fetch_optional(&pool)
        .await
        .unwrap_or(None);

    match existing {
        None => {
            // First run - set passphrase
            let hashed = match hash(&payload.passphrase, DEFAULT_COST) {
                Ok(h) => h,
                Err(_) => {
                    return (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        Json(ErrorResponse {
                            error: "Failed to hash passphrase".to_string(),
                        }),
                    )
                        .into_response();
                }
            };

            if let Err(_) = sqlx::query("INSERT INTO auth (id, hash) VALUES (1, ?)")
                .bind(&hashed)
                .execute(&pool)
                .await
            {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: "Failed to save passphrase".to_string(),
                    }),
                )
                    .into_response();
            }

            let _ = session.insert("authenticated", true).await;
            
            Json(UnlockResponse {
                success: true,
                first_run: Some(true),
            })
            .into_response()
        }
        Some((hash_str,)) => {
            // Validate passphrase
            match verify(&payload.passphrase, &hash_str) {
                Ok(true) => {
                    let _ = session.insert("authenticated", true).await;
                    Json(UnlockResponse {
                        success: true,
                        first_run: None,
                    })
                    .into_response()
                }
                _ => (
                    StatusCode::UNAUTHORIZED,
                    Json(ErrorResponse {
                        error: "Invalid passphrase".to_string(),
                    }),
                )
                    .into_response(),
            }
        }
    }
}

async fn logout(session: Session) -> impl IntoResponse {
    session.flush().await;
    Json(serde_json::json!({ "success": true }))
}