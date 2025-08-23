// src/vault/vault_indexer.rs
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use regex::Regex;
use walkdir::WalkDir;
use meilisearch_sdk::{Client, Index};
use meilisearch_sdk::search::Selectors;
use tokio::sync::RwLock;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub path: PathBuf,
    pub title: String,
    pub content: String,
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub tags: Vec<String>,
    pub links: Vec<String>,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
    pub word_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStats {
    pub total_notes: usize,
    pub total_words: usize,
    pub tag_counts: HashMap<String, usize>,
    pub recent_notes: Vec<Note>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub title: String,
    pub content: String,
    pub score: f32,
}

pub struct VaultIndexer {
    vault_path: PathBuf,
    client: Client,
    index: Index,
    notes_cache: Arc<RwLock<HashMap<String, Note>>>,
}

impl VaultIndexer {
    pub async fn new(vault_path: impl AsRef<Path>) -> Result<Self, Box<dyn std::error::Error>> {
        let vault_path = vault_path.as_ref().to_path_buf();
        
        // Initialize MeiliSearch client with correct API key
        let client = Client::new("http://localhost:7700", Some("HfcjPnJMXnoXpF3iFk24_M-phz95JesleVwcyOqCaY"));
        
        // Create or get the vault-notes index
        let uid = "vault-notes";
        let index = match client.get_index(uid).await {
            Ok(index) => index,
            Err(_) => {
                // Index doesn't exist, create it
                let task = client.create_index(uid, Some("id")).await?;
                client.wait_for_task(task, None, None).await?;
                client.index(uid)
            }
        };
        
        // Configure index settings
        let searchable_attributes = vec!["title", "content", "tags"];
        index.set_searchable_attributes(&searchable_attributes).await?;
        
        let filterable_attributes = vec!["tags", "modified", "path"];
        index.set_filterable_attributes(&filterable_attributes).await?;
        
        let sortable_attributes = vec!["modified", "created", "word_count"];
        index.set_sortable_attributes(&sortable_attributes).await?;
        
        Ok(Self {
            vault_path,
            client,
            index,
            notes_cache: Arc::new(RwLock::new(HashMap::new())),
        })
    }
    
    pub async fn spawn_background(vault_path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        Self::new(vault_path).await
    }
    
    pub async fn full_index(&self) -> Result<VaultStats, Box<dyn std::error::Error>> {
        let mut notes = Vec::new();
        let mut total_words = 0;
        let mut tag_counts: HashMap<String, usize> = HashMap::new();
        
        // Clear existing documents
        self.index.delete_all_documents().await?;
        
        // Collect all notes to index
        let mut documents = Vec::new();
        
        // Walk through all markdown files
        for entry in WalkDir::new(&self.vault_path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "md"))
        {
            if let Ok(note) = self.parse_note(entry.path()).await {
                // Update tag counts
                for tag in &note.tags {
                    *tag_counts.entry(tag.clone()).or_insert(0) += 1;
                }
                
                total_words += note.word_count;
                
                // Create document for MeiliSearch
                let doc = self.note_to_document(&note);
                documents.push(doc);
                notes.push(note);
            }
        }
        
        // Batch index all documents
        if !documents.is_empty() {
            let task = self.index.add_documents(&documents, Some("id")).await?;
            self.client.wait_for_task(task, None, None).await?;
        }
        
        // Update cache
        {
            let mut cache = self.notes_cache.write().await;
            cache.clear();
            for note in &notes {
                cache.insert(note.id.clone(), note.clone());
            }
        }
        
        // Sort by modified date for recent notes
        notes.sort_by(|a, b| b.modified.cmp(&a.modified));
        let recent_notes = notes.iter().take(10).cloned().collect();
        
        Ok(VaultStats {
            total_notes: notes.len(),
            total_words,
            tag_counts,
            recent_notes,
        })
    }
    
    pub async fn parse_note(&self, path: &Path) -> Result<Note, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(path)?;
        let metadata = fs::metadata(path)?;
        
        // Parse frontmatter
        let (frontmatter, body) = self.extract_frontmatter(&content);
        
        // Extract title from frontmatter or first heading
        let title = frontmatter.get("title")
            .and_then(|v| v.as_str())
            .map(String::from)
            .or_else(|| self.extract_first_heading(&body))
            .unwrap_or_else(|| path.file_stem().unwrap_or_default().to_string_lossy().to_string());
        
        // Extract tags from frontmatter and content
        let mut tags = self.extract_tags_from_frontmatter(&frontmatter);
        tags.extend(self.extract_hashtags(&body));
        tags.sort();
        tags.dedup();
        
        // Extract wiki links
        let links = self.extract_links(&body);
        
        // Calculate word count
        let word_count = body.split_whitespace().count();
        
        // Generate ID from path
        let id = self.path_to_id(path);
        
        Ok(Note {
            id,
            path: path.to_path_buf(),
            title,
            content: body,
            frontmatter,
            tags,
            links,
            created: metadata.created()?.into(),
            modified: metadata.modified()?.into(),
            word_count,
        })
    }
    
    async fn index_note(&self, note: &Note) -> Result<(), Box<dyn std::error::Error>> {
        let doc = self.note_to_document(note);
        
        // Add or update the document
        let task = self.index.add_documents(&[doc], Some("id")).await?;
        self.client.wait_for_task(task, None, None).await?;
        
        Ok(())
    }
    
    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<Note>, Box<dyn std::error::Error>> {
        let results = self.index
            .search()
            .with_query(query)
            .with_limit(limit)
            .with_attributes_to_highlight(Selectors::Some(&["title", "content"]))
            .execute::<serde_json::Value>()
            .await?;
        
        let cache = self.notes_cache.read().await;
        let mut notes = Vec::new();
        
        for hit in results.hits {
            if let Some(id) = hit.result["id"].as_str() {
                if let Some(note) = cache.get(id) {
                    notes.push(note.clone());
                }
            }
        }
        
        Ok(notes)
    }
    
    pub async fn get_note_by_path(&self, path: &Path) -> Option<Note> {
        let id = self.path_to_id(path);
        let cache = self.notes_cache.read().await;
        cache.get(&id).cloned()
    }
    
    pub async fn update_note(&self, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        let note = self.parse_note(path).await?;
        
        // Update cache
        {
            let mut cache = self.notes_cache.write().await;
            cache.insert(note.id.clone(), note.clone());
        }
        
        // Re-index
        self.index_note(&note).await?;
        
        Ok(())
    }
    
    // Helper methods
    
    fn extract_frontmatter(&self, content: &str) -> (HashMap<String, serde_json::Value>, String) {
        let re = Regex::new(r"^---\n(.*?)\n---\n(.*)").unwrap();
        
        if let Some(captures) = re.captures(content) {
            let yaml_str = captures.get(1).map_or("", |m| m.as_str());
            let body = captures.get(2).map_or("", |m| m.as_str());
            
            match serde_yaml::from_str::<HashMap<String, serde_json::Value>>(yaml_str) {
                Ok(frontmatter) => (frontmatter, body.to_string()),
                Err(_) => (HashMap::new(), content.to_string()),
            }
        } else {
            (HashMap::new(), content.to_string())
        }
    }
    
    fn extract_first_heading(&self, content: &str) -> Option<String> {
        let re = Regex::new(r"^#+\s+(.+)$").unwrap();
        content.lines()
            .find_map(|line| re.captures(line))
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().to_string())
    }
    
    fn extract_tags_from_frontmatter(&self, frontmatter: &HashMap<String, serde_json::Value>) -> Vec<String> {
        frontmatter.get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .map(String::from)
                    .collect()
            })
            .unwrap_or_default()
    }
    
    fn extract_hashtags(&self, content: &str) -> Vec<String> {
        let re = Regex::new(r"#(\w+)").unwrap();
        re.captures_iter(content)
            .filter_map(|cap| cap.get(1))
            .map(|m| m.as_str().to_string())
            .collect()
    }
    
    fn extract_links(&self, content: &str) -> Vec<String> {
        let re = Regex::new(r"\[\[([^\]]+)\]\]").unwrap();
        re.captures_iter(content)
            .filter_map(|cap| cap.get(1))
            .map(|m| m.as_str().to_string())
            .collect()
    }
    
    fn path_to_id(&self, path: &Path) -> String {
        path.strip_prefix(&self.vault_path)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/")
            .replace(".md", "")
    }
    
    fn note_to_document(&self, note: &Note) -> serde_json::Value {
        serde_json::json!({
            "id": note.id,
            "path": note.path.to_string_lossy(),
            "title": note.title,
            "content": note.content,
            "tags": note.tags,
            "links": note.links,
            "created": note.created.timestamp(),
            "modified": note.modified.timestamp(),
            "word_count": note.word_count,
            "frontmatter": note.frontmatter,
        })
    }
}

// Standalone function for scanning vault files
pub async fn scan_vault_files(
    vault_path: &Path, 
    pending_files: &mut std::collections::VecDeque<PathBuf>
) -> Result<usize, Box<dyn std::error::Error>> {
    let mut count = 0;
    
    for entry in WalkDir::new(vault_path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "md"))
    {
        pending_files.push_back(entry.path().to_path_buf());
        count += 1;
    }
    
    Ok(count)
}