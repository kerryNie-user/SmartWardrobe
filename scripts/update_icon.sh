#!/bin/bash

# Check if image path is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_source_image>"
    exit 1
fi

SOURCE_IMG="$1"

if [ ! -f "$SOURCE_IMG" ]; then
    echo "Error: File '$SOURCE_IMG' not found."
    exit 1
fi

# Define project root (assuming script is run from project root or scripts dir)
# We'll try to find the root by looking for 'App' directory
if [ -d "App" ]; then
    PROJECT_ROOT="."
elif [ -d "../App" ]; then
    PROJECT_ROOT=".."
else
    echo "Error: Could not find project root. Please run from project root or scripts directory."
    exit 1
fi

RES_DIR="$PROJECT_ROOT/App/AndroidApp/app/src/main/res"
WEB_DIR="$PROJECT_ROOT/App/AndroidApp/app/src/main"

# Check if sips is installed (macOS default)
if ! command -v sips &> /dev/null; then
    echo "Error: 'sips' command not found. This script requires macOS."
    exit 1
fi

echo "Processing icon from: $SOURCE_IMG"

# Function to resize and save
resize_icon() {
    local size=$1
    local dest_dir=$2
    local filename=$3
    
    # Create directory if not exists
    mkdir -p "$dest_dir"
    
    # Resize
    sips -z $size $size "$SOURCE_IMG" --out "$dest_dir/$filename" > /dev/null
    echo "Generated ${size}x${size} icon at $dest_dir/$filename"
}

# Generate Android Icons
resize_icon 48 "$RES_DIR/mipmap-mdpi" "ic_launcher.png"
resize_icon 48 "$RES_DIR/mipmap-mdpi" "ic_launcher_round.png"

resize_icon 72 "$RES_DIR/mipmap-hdpi" "ic_launcher.png"
resize_icon 72 "$RES_DIR/mipmap-hdpi" "ic_launcher_round.png"

resize_icon 96 "$RES_DIR/mipmap-xhdpi" "ic_launcher.png"
resize_icon 96 "$RES_DIR/mipmap-xhdpi" "ic_launcher_round.png"

resize_icon 144 "$RES_DIR/mipmap-xxhdpi" "ic_launcher.png"
resize_icon 144 "$RES_DIR/mipmap-xxhdpi" "ic_launcher_round.png"

resize_icon 192 "$RES_DIR/mipmap-xxxhdpi" "ic_launcher.png"
resize_icon 192 "$RES_DIR/mipmap-xxxhdpi" "ic_launcher_round.png"

# Generate Web Icon
resize_icon 512 "$WEB_DIR" "ic_launcher-web.png"

echo "Icon update complete!"
