#!/bin/bash

# Directory for models
MODEL_DIR="public/models"
mkdir -p "$MODEL_DIR"

# Base URL for face-api.js weights
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

# List of files to download
FILES=(
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model-shard1"
  "ssd_mobilenetv1_model-shard2"
)

echo "Downloading models to $MODEL_DIR..."

for file in "${FILES[@]}"; do
  echo "Downloading $file..."
  curl -L -o "$MODEL_DIR/$file" "$BASE_URL/$file"
done

echo "Download complete."
