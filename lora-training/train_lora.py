import json
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import (
    LoraConfig,
    get_peft_model,
    TaskType,
    prepare_model_for_kbit_training
)

# Load dataset
def load_dataset_from_jsonl(file_path):
    data = []
    with open(file_path, 'r') as f:
        for line in f:
            item = json.loads(line)
            # Format for training
            text = f"### Instruction:\n{item['instruction']}\n\n### Response:\n{item['output']}"
            data.append({"text": text})
    return Dataset.from_list(data)

# Model configuration
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"  # Only 2GB  # Change to your base model
output_dir = "./sovereign_spine_lora"

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(model_name)
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

# LoRA configuration
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.1,
    bias="none",
    task_type=TaskType.CAUSAL_LM
)

# Prepare model
model = prepare_model_for_kbit_training(model)
model = get_peft_model(model, lora_config)

# Load and tokenize dataset
dataset = load_dataset_from_jsonl("sovereign_spine.jsonl")

def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        truncation=True,
        padding=True,
        max_length=512
    )

tokenized_dataset = dataset.map(tokenize_function, batched=True)

# Training arguments
training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    warmup_steps=100,
    logging_steps=10,
    save_steps=100,
    save_strategy="steps",  # Removed evaluation_strategy
    fp16=True,
    push_to_hub=False,
)

# Create trainer
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    tokenizer=tokenizer,
    data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
)

# Train
print("Starting Sovereign Spine LoRA training...")
trainer.train()

# Save the final model
trainer.save_model(output_dir)
print(f"Training complete! LoRA saved to {output_dir}")