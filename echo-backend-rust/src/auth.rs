// auth.rs - Enhanced authentication module

use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Extension,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

// Claims attached to JWT tokens
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,           // user email
    pub exp: usize,            // expiration timestamp
    pub is_dev: bool,          // development access flag
    pub features: Vec<String>, // feature flags (e.g., ["chat", "streaming", "premium"])
}

impl Claims {
    /// Check if user has a specific feature enabled
    pub fn has_feature(&self, feature: &str) -> bool {
        self.is_dev || self.features.contains(&"*".to_string()) || self.features.contains(&feature.to_string())
    }
}

// Error responses for auth failures
#[derive(Debug)]
pub enum AuthError {
    MissingToken,
    InvalidToken,
    ExpiredToken,
    InsufficientPermissions,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::MissingToken => (StatusCode::UNAUTHORIZED, "Missing authorization token"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid authorization token"),
            AuthError::ExpiredToken => (StatusCode::UNAUTHORIZED, "Token has expired"),
            AuthError::InsufficientPermissions => (StatusCode::FORBIDDEN, "Insufficient permissions"),
        };
        
        (status, message).into_response()
    }
}

/// Extract and validate JWT from Authorization header
pub fn extract_token(headers: &header::HeaderMap) -> Result<String, AuthError> {
    headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| {
            if value.starts_with("Bearer ") {
                Some(value[7..].to_string())
            } else {
                None
            }
        })
        .ok_or(AuthError::MissingToken)
}

/// Decode JWT token into claims
pub fn decode_token(token: &str, secret: &[u8]) -> Result<Claims, AuthError> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| {
        if e.kind() == &jsonwebtoken::errors::ErrorKind::ExpiredSignature {
            AuthError::ExpiredToken
        } else {
            AuthError::InvalidToken
        }
    })
}

/// Middleware that requires valid authentication
pub async fn require_auth(
    Extension(jwt_secret): Extension<Arc<Vec<u8>>>,
    mut req: Request,
    next: Next,
) -> Result<Response, AuthError> {
    // Extract token from Authorization header
    let token = extract_token(req.headers())?;
    
    // Decode and validate token
    let claims = decode_token(&token, &jwt_secret)?;
    
    // Attach claims to request extensions for downstream handlers
    req.extensions_mut().insert(claims);
    
    Ok(next.run(req).await)
}

/// Generate a JWT token for the given claims
pub fn generate_token(claims: &Claims, secret: &[u8]) -> Result<String, jsonwebtoken::errors::Error> {
    encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(secret),
    )
}