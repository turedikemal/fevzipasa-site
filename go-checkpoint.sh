#!/bin/bash

# Checkpoint Management Script for Fevzipaşa Site
# Usage: ./go-checkpoint.sh <CHECKPOINT_NAME>

set -e

# Define checkpoints mapping
declare -A CHECKPOINTS=(
    ["GEÇMİŞE_YOLCULUK"]="61b2bb8"
    ["ANİMASYON1"]="1274ae9"
    ["KATILIMCILAR"]="8f04813"
    ["İLK_RESTART"]="0979558"
    ["İNİTİAL"]="08bdb2d"
)

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored status
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if checkpoint name provided
if [ $# -eq 0 ]; then
    print_error "No checkpoint name provided"
    echo ""
    echo "Available checkpoints:"
    for checkpoint in "${!CHECKPOINTS[@]}"; do
        echo "  - $checkpoint (${CHECKPOINTS[$checkpoint]})"
    done
    exit 1
fi

CHECKPOINT_NAME="$1"

# Check if checkpoint exists
if [ -z "${CHECKPOINTS[$CHECKPOINT_NAME]}" ]; then
    print_error "Unknown checkpoint: $CHECKPOINT_NAME"
    echo ""
    echo "Available checkpoints:"
    for checkpoint in "${!CHECKPOINTS[@]}"; do
        echo "  - $checkpoint (${CHECKPOINTS[$checkpoint]})"
    done
    exit 1
fi

COMMIT_HASH="${CHECKPOINTS[$CHECKPOINT_NAME]}"

echo ""
print_status "Starting checkpoint restoration: $CHECKPOINT_NAME ($COMMIT_HASH)"
echo ""

# Step 1: Git reset
print_status "Step 1/5: Resetting to commit $COMMIT_HASH"
if git reset --hard "$COMMIT_HASH"; then
    print_success "Git reset completed"
else
    print_error "Git reset failed"
    exit 1
fi
echo ""

# Step 2: Remove .next directory
print_status "Step 2/5: Cleaning .next directory"
if [ -d ".next" ]; then
    rm -rf .next
    print_success ".next directory removed"
else
    print_warning ".next directory not found (skipping)"
fi
echo ""

# Step 3: Force push to remote
print_status "Step 3/5: Force pushing to origin/claude/project-thread-82rh0h"
if git push -f origin HEAD:claude/project-thread-82rh0h; then
    print_success "Force push completed"
else
    print_warning "Force push failed or branch does not exist - continuing anyway"
fi
echo ""

# Step 4: Kill dev server if running
print_status "Step 4/5: Checking for running dev server"
if pgrep -f "npm run dev" > /dev/null; then
    print_warning "Dev server is running, attempting to kill it..."
    pkill -f "npm run dev" || print_warning "Could not kill dev server"
    sleep 2
    print_success "Dev server stopped"
else
    print_warning "No running dev server found (skipping)"
fi
echo ""

# Step 5: Restart dev server
print_status "Step 5/5: Restarting npm run dev"
if npm run dev &; then
    print_success "Dev server started in background"
    sleep 2
    echo ""
    print_success "Checkpoint restoration complete!"
    echo ""
    print_status "Server PID: $!"
else
    print_error "Failed to start dev server"
    exit 1
fi

echo ""
print_status "Checkpoint: $CHECKPOINT_NAME"
print_status "Commit: $COMMIT_HASH"
print_status "Restoration completed at $(date +'%Y-%m-%d %H:%M:%S')"
echo ""
