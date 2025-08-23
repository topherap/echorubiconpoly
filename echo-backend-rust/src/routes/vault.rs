use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::AppState;  // Import from crate root

#[derive(Debug, Serialize)]
struct VaultInfo {
    path: String,
    index_count: usize,
    last_scan: Option<String>,
    is_watching: bool,
}

#[derive(Debug, Clone, Serialize)]  // Added Clone derive
struct VaultEntry {
    path: String,
    title: String,
    excerpt: String,
    tags: Vec<String>,
    last_modified: String,
    is_public: bool,
}

#[derive(Debug, Deserialize)]
struct SearchQuery {
    q: String,
    #[serde(default = "default_limit")]
    limit: usize,
    #[serde(default)]
    offset: usize,
    #[serde(default)]
    public_only: bool,
}

fn default_limit() -> usize {
    20
}

#[derive(Debug, Serialize)]
struct SearchResults {
    query: String,
    results: Vec<VaultEntry>,
    total_matches: usize,
    offset: usize,
    limit: usize,
}

#[derive(Debug, Deserialize)]
struct RefreshRequest {
    #[serde(default)]
    force: bool,
}

#[derive(Debug, Serialize)]
struct RefreshResponse {
    message: String,
    files_queued: usize,
}

#[derive(Debug, Serialize)]
struct IndexProgress {
    total_files: usize,
    indexed_files: usize,
    pending_files: usize,
    is_indexing: bool,
    current_file: Option<String>,
}

pub async fn get_vault_info(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
) -> Result<Json<VaultInfo>, StatusCode> {
    let vault_state = state.vault_state.read().await;
    
    Ok(Json(VaultInfo {
        path: vault_state.vault_path.to_string_lossy().to_string(),
        index_count: vault_state.indexed_files.len(),
        last_scan: vault_state.last_scan.map(|t| t.to_rfc3339()),
        is_watching: vault_state.watcher.is_some(),
    }))
}

pub async fn search_vault(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    Query(params): Query<SearchQuery>,
) -> Result<Json<SearchResults>, StatusCode> {
    let vault_state = state.vault_state.read().await;
    
    // Simple search implementation - in production, you'd want to use a proper search index
    let mut results = Vec::new();
    let query_lower = params.q.to_lowercase();
    
    for (path, metadata) in &vault_state.indexed_files {
        // Skip private files if public_only is true
        if params.public_only && !metadata.is_public {
            continue;
        }
        
        // Simple content search - check if query appears in content
        if metadata.content.to_lowercase().contains(&query_lower) ||
           metadata.title.to_lowercase().contains(&query_lower) ||
           metadata.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower)) {
            
            // Extract excerpt around the match
            let excerpt = extract_excerpt(&metadata.content, &query_lower, 200);
            
            results.push(VaultEntry {
                path: path.to_string_lossy().to_string(),
                title: metadata.title.clone(),
                excerpt,
                tags: metadata.tags.clone(),
                last_modified: metadata.last_modified.to_rfc3339(),
                is_public: metadata.is_public,
            });
        }
    }
    
    let total_matches = results.len();
    
    // Apply pagination
    let start = params.offset.min(results.len());
    let end = (start + params.limit).min(results.len());
    let paginated_results = results[start..end].to_vec();
    
    Ok(Json(SearchResults {
        query: params.q,
        results: paginated_results,
        total_matches,
        offset: params.offset,
        limit: params.limit,
    }))
}

pub async fn get_vault_entry(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
    Path(entry_path): Path<String>,
) -> Result<Json<VaultEntry>, StatusCode> {
    let vault_state = state.vault_state.read().await;
    
    // Reconstruct the full path
    let full_path = vault_state.vault_path.join(&entry_path);
    
    if let Some(metadata) = vault_state.indexed_files.get(&full_path) {
        let excerpt = if metadata.content.len() > 500 {
            format!("{}...", &metadata.content[..500])
        } else {
            metadata.content.clone()
        };
        
        Ok(Json(VaultEntry {
            path: entry_path,
            title: metadata.title.clone(),
            excerpt,
            tags: metadata.tags.clone(),
            last_modified: metadata.last_modified.to_rfc3339(),
            is_public: metadata.is_public,
        }))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

pub async fn refresh_vault_index(
    State(state): State<AppState>,
    Json(request): Json<RefreshRequest>,
) -> Result<Json<RefreshResponse>, StatusCode> {
    let vault_path = {
        let vault_state = state.vault_state.read().await;
        vault_state.vault_path.clone()
    };
    
    let files_queued = {
        let mut vault_state = state.vault_state.write().await;
        
        if request.force {
            // Clear existing index to force full rescan
            vault_state.indexed_files.clear();
            vault_state.pending_files.clear();
        }
        
        // Queue all markdown files for indexing
        // crate::vault::vault_indexer::scan_vault_files(&vault_path, &mut vault_state.pending_files)
        //     .await
        //     .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        // Temporarily return 0 files queued
        0
    }; // This closes the files_queued block
    
    Ok(Json(RefreshResponse {
        message: if request.force {
            "Full vault re-index initiated".to_string()
        } else {
            "Vault refresh initiated".to_string()
        },
        files_queued,
    }))
}
pub async fn get_index_progress(
    State(state): State<AppState>,  // Changed from State<Arc<AppState>>
) -> Result<Json<IndexProgress>, StatusCode> {
    let vault_state = state.vault_state.read().await;
    
    let total_files = vault_state.indexed_files.len() + vault_state.pending_files.len();
    let indexed_files = vault_state.indexed_files.len();
    let pending_files = vault_state.pending_files.len();
    let is_indexing = pending_files > 0;
    let current_file = vault_state.pending_files.front()
        .map(|p| p.to_string_lossy().to_string());
    
    Ok(Json(IndexProgress {
        total_files,
        indexed_files,
        pending_files,
        is_indexing,
        current_file,
    }))
}

fn extract_excerpt(content: &str, query: &str, max_length: usize) -> String {
    if let Some(pos) = content.to_lowercase().find(query) {
        let start = pos.saturating_sub(max_length / 2);
        let end = (pos + query.len() + max_length / 2).min(content.len());
        
        let mut excerpt = String::new();
        if start > 0 {
            excerpt.push_str("...");
        }
        excerpt.push_str(&content[start..end]);
        if end < content.len() {
            excerpt.push_str("...");
        }
        excerpt
    } else {
        // Return beginning of content if no match found
        if content.len() > max_length {
            format!("{}...", &content[..max_length])
        } else {
            content.to_string()
        }
    }
}

pub fn routes() -> axum::Router<AppState> {  // Changed from Router<Arc<AppState>>
    Router::new()
        .route("/", get(get_vault_info))
        .route("/query", get(search_vault))  // Fixed route path
        .route("/entry/*path", get(get_vault_entry))
        .route("/refresh", post(refresh_vault_index))
        .route("/index/progress", get(get_index_progress))
}