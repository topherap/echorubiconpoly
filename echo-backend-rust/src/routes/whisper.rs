// src/modules/whisper.rs
use std::process::Command;
use tokio::fs;
use crate::Error;

pub async fn transcribe(file_path: &str, is_basic: bool) -> Result<String, Error> {
    if is_basic {
        transcribe_local(file_path).await
    } else {
        transcribe_openai(file_path).await
    }
}

async fn transcribe_local(file_path: &str) -> Result<String, Error> {
    let whisper_path = std::env::var("WHISPER_CLI_PATH")
        .unwrap_or_else(|_| "whisper".to_string());
    
    let output = Command::new(&whisper_path)
        .args(&[
            "--model", "base",
            "--output_format", "txt",
            "--output_dir", "/tmp",
            file_path
        ])
        .output()
        .map_err(|e| Error::Internal(format!("Whisper CLI failed: {}", e)))?;

    if !output.status.success() {
        return Err(Error::Internal(format!(
            "Whisper CLI error: {}", 
            String::from_utf8_lossy(&output.stderr)
        )));
    }

    // Read the generated .txt file
    let base_name = std::path::Path::new(file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| Error::Internal("Invalid file path".into()))?;
    
    let txt_path = format!("/tmp/{}.txt", base_name);
    let text = fs::read_to_string(&txt_path).await
        .map_err(|e| Error::Internal(format!("Failed to read transcription: {}", e)))?;
    
    // Cleanup
    let _ = fs::remove_file(&txt_path).await;
    
    Ok(text.trim().to_string())
}

async fn transcribe_openai(file_path: &str) -> Result<String, Error> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| Error::Internal("OPENAI_API_KEY not configured".into()))?;
    
    let file_data = fs::read(file_path).await
        .map_err(|e| Error::Internal(format!("Failed to read audio file: {}", e)))?;
    
    let client = reqwest::Client::new();
    let form = reqwest::multipart::Form::new()
        .part("file", reqwest::multipart::Part::bytes(file_data)
            .file_name("audio.wav")
            .mime_str("audio/wav").unwrap())
        .text("model", "whisper-1");
    
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| Error::Internal(format!("OpenAI API request failed: {}", e)))?;
    
    let result: serde_json::Value = response.json().await
        .map_err(|e| Error::Internal(format!("Failed to parse OpenAI response: {}", e)))?;
    
    result["text"].as_str()
        .ok_or_else(|| Error::Internal("No text in OpenAI response".into()))
        .map(|s| s.to_string())
}