export interface ScriptOptions {
  gpuVramGB: number;
  largeModelContext: number; // e.g. 7168 or 8192
  standardModelContext: number; // e.g. 16384
  maxPredictTokens: number; // e.g. 4096
  repeatPenalty: number; // e.g. 1.15
  autoMinifyJson: boolean;
}

export function generateBashScript(options: ScriptOptions = {
  gpuVramGB: 16,
  largeModelContext: 7168,
  standardModelContext: 16384,
  maxPredictTokens: 4096,
  repeatPenalty: 1.15,
  autoMinifyJson: true,
}): string {
  return `#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ArtGenerate (ArtPersona Studio Edition)
# Optimized for NVIDIA GPUs (e.g. RTX 5070 Ti 16GB) & Large Ollama Models (26B-32B)
# Features:
#   1. Dynamic Context & VRAM Safeguard (Never crashes with cudaMalloc OOM)
#   2. Extended Output Budget (Never truncates before final prompt JSON closes)
#   3. On-The-Fly JSON Persona Minifier (Saves ~1,000 whitespace tokens)
#   4. 100% Lossless Prompt Protection (Auto-saves before execution)
#   5. Repetition Penalty to prevent model wandering
#   6. Live ANSI Colored Terminal Streaming (Thinking vs Final Prompt)
#   7. GTK / Zenity CSS Error Cleaner
# ─────────────────────────────────────────────────────────────────────────────

export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"

# Suppress annoying GTK CSS theme parsing warnings from Zenity
exec 2> >(grep -v -E "Gtk-WARNING|Theme parsing error" >&2)

# ─────────────────────────────────────────────
# Storage Directories & Files
# ─────────────────────────────────────────────
CONFIG_DIR="$HOME/.config/ollama_artgenerate"
STYLES_FILE="$CONFIG_DIR/styles.txt"
PERSONAS_FILE="$CONFIG_DIR/personas.txt"

LOG_DIR="$HOME/.ollama_logs"
LOG_FILE="$LOG_DIR/artgenerate.log"
LAST_PROMPT_FILE="$LOG_DIR/last_prompt.txt"
ARCHIVE_DIR="$LOG_DIR/archives"

MAX_LOG_SIZE=$((4 * 1024 * 1024)) # 4 MB

mkdir -p "$CONFIG_DIR" "$LOG_DIR" "$ARCHIVE_DIR"

# Legacy migration
[[ ! -f "$STYLES_FILE" && -f "$HOME/.ollama_styles.txt" ]] && mv "$HOME/.ollama_styles.txt" "$STYLES_FILE"
[[ ! -f "$PERSONAS_FILE" && -f "$HOME/.ollama_personas.txt" ]] && mv "$HOME/.ollama_personas.txt" "$PERSONAS_FILE"

touch "$STYLES_FILE" "$PERSONAS_FILE" "$LOG_FILE" "$LAST_PROMPT_FILE" 2>/dev/null

# ─────────────────────────────────────────────
# Dependency Checks
# ─────────────────────────────────────────────
if ! command -v ollama &> /dev/null; then
    zenity --error --text="❌ Ollama command not found. Please ensure Ollama is active ('ollama serve')." 2>/dev/null
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    zenity --error --text="❌ Python 3 was not found. Please install python3." 2>/dev/null
    exit 1
fi

BASE64_WRAP_OPTION="-w 0"
if ! echo "test" | base64 -w 0 &>/dev/null; then
    if echo "test" | base64 -b 0 &>/dev/null; then
        BASE64_WRAP_OPTION="-b 0"
    else
        BASE64_WRAP_OPTION=""
    fi
fi

# ─────────────────────────────────────────────
# Item Management Utilities
# ─────────────────────────────────────────────
rotate_logs() {
    if command -v find &> /dev/null; then
        find "$LOG_DIR" -maxdepth 1 -name "ArtGenerate_Archive_*.log" -type f -mtime +7 -exec gzip {} \\; -exec mv {}.gz "$ARCHIVE_DIR/" \\; 2>/dev/null
    fi

    [[ ! -f "$LOG_FILE" ]] && return

    local FILE_SIZE=0
    if command -v stat &> /dev/null; then
        FILE_SIZE=$(stat -c %s "$LOG_FILE" 2>/dev/null || stat -f %z "$LOG_FILE" 2>/dev/null)
    fi

    if [[ -z "$FILE_SIZE" || "$FILE_SIZE" -eq 0 ]]; then
        FILE_SIZE=$(wc -c < "$LOG_FILE" 2>/dev/null | tr -d ' ')
    fi

    if [[ "$FILE_SIZE" =~ ^[0-9]+$ ]] && [[ "$FILE_SIZE" -gt "$MAX_LOG_SIZE" ]]; then
        local TIMESTAMP
        TIMESTAMP=$(date +"%a_%b_%d_%Y_%H%M%S")
        local ARCHIVE_FILE="\${LOG_DIR}/ArtGenerate_Archive_\${TIMESTAMP}.log"
        mv "$LOG_FILE" "$ARCHIVE_FILE"
        touch "$LOG_FILE"
        echo "--- Log rotated on $(date +"%a, %b %d, %Y %H:%M:%S"). Previous log archived ---" >> "$LOG_FILE"
    fi
}

add_new_item() {
    local ITEM_TYPE=$1
    local FILE_PATH=$2

    local NAME
    NAME=$(zenity --entry --title="Add New $ITEM_TYPE" --text="Enter the $ITEM_TYPE name:" 2>/dev/null)
    [[ $? -ne 0 || -z "$NAME" ]] && return

    local DESC_PROMPT="Enter the description or system prompt:"
    [[ "$ITEM_TYPE" == "Style" ]] && DESC_PROMPT="(e.g., (3D cg:1.85), (Pixar style:1.3), soft pastel, etc.)"

    local DESC
    DESC=$(zenity --text-info --editable --title="$ITEM_TYPE Description" --width=800 --height=600 --filename=/dev/null --text="$DESC_PROMPT" 2>/dev/null)
    [[ $? -ne 0 || -z "$DESC" ]] && return

    local ENCODED_DESC
    ENCODED_DESC=$(echo "$DESC" | base64 $BASE64_WRAP_OPTION)
    echo "$NAME:::$ENCODED_DESC" >> "$FILE_PATH"

    zenity --info --text="✅ $ITEM_TYPE '$NAME' saved successfully!" 2>/dev/null
}

edit_item() {
    local ITEM_TYPE=$1
    local FILE_PATH=$2
    local NAMES=()

    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        local name="\${line%%:::*}"
        [[ "$name" == "$line" ]] && continue
        NAMES+=("$name")
    done < "$FILE_PATH"

    if [[ \${#NAMES[@]} -eq 0 ]]; then
        zenity --info --text="No \${ITEM_TYPE}s found to edit." 2>/dev/null
        return
    fi

    local TO_EDIT
    TO_EDIT=$(zenity --list --title="Edit $ITEM_TYPE" --column="Select $ITEM_TYPE to Edit" "\${NAMES[@]}" --width=400 --height=400 2>/dev/null)
    [[ -z "$TO_EDIT" ]] && return

    local ENCODED_DESC=""
    local ORIGINAL_LINE=""
    while IFS= read -r line; do
        if [[ "$line" == "$TO_EDIT:::"* ]]; then
            ENCODED_DESC="\${line#$TO_EDIT:::}"
            ORIGINAL_LINE="$line"
            break
        fi
    done < "$FILE_PATH"

    local DECODED_DESC
    DECODED_DESC=$(echo -n "$ENCODED_DESC" | base64 --decode 2>/dev/null)
    [[ -z "$DECODED_DESC" ]] && DECODED_DESC="$ENCODED_DESC"

    local TMP_FILE
    TMP_FILE=$(mktemp)
    echo -n "$DECODED_DESC" > "$TMP_FILE"

    local EDITED
    EDITED=$(zenity --text-info --editable --title="Edit $ITEM_TYPE" --filename="$TMP_FILE" --width=800 --height=600 2>/dev/null)
    if [[ $? -eq 0 ]]; then
        echo -n "$EDITED" > "$TMP_FILE"
    else
        rm -f "$TMP_FILE"
        return
    fi

    local NEW_DESC
    NEW_DESC=$(cat "$TMP_FILE")
    rm -f "$TMP_FILE"

    if [[ -z "$NEW_DESC" ]]; then
        zenity --warning --text="Description is empty. Not saved." 2>/dev/null
        return
    fi

    local NEW_ENCODED
    NEW_ENCODED=$(echo -n "$NEW_DESC" | base64 $BASE64_WRAP_OPTION)
    grep -F -v "$ORIGINAL_LINE" "$FILE_PATH" > "\${FILE_PATH}.tmp"
    echo "\${TO_EDIT}:::\${NEW_ENCODED}" >> "\${FILE_PATH}.tmp"
    mv "\${FILE_PATH}.tmp" "$FILE_PATH"

    zenity --info --text="✅ $ITEM_TYPE '$TO_EDIT' updated successfully!" 2>/dev/null
}

delete_item() {
    local ITEM_TYPE=$1
    local FILE_PATH=$2
    local NAMES=()

    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        local name="\${line%%:::*}"
        [[ "$name" == "$line" ]] && continue
        NAMES+=("$name")
    done < "$FILE_PATH"

    if [[ \${#NAMES[@]} -eq 0 ]]; then
        zenity --info --text="No \${ITEM_TYPE}s found to delete." 2>/dev/null
        return
    fi

    local TO_DELETE
    TO_DELETE=$(zenity --list --title="Delete $ITEM_TYPE" --column="Select $ITEM_TYPE to Delete" "\${NAMES[@]}" --width=400 --height=400 2>/dev/null)
    [[ -z "$TO_DELETE" ]] && return

    zenity --question --text="Are you sure you want to delete '$TO_DELETE'?" --title="Confirm Deletion" 2>/dev/null
    [[ $? -ne 0 ]] && return

    local ORIGINAL_LINE=""
    while IFS= read -r line; do
        if [[ "$line" == "$TO_DELETE:::"* ]]; then
            ORIGINAL_LINE="$line"
            break
        fi
    done < "$FILE_PATH"

    grep -F -v "$ORIGINAL_LINE" "$FILE_PATH" > "\${FILE_PATH}.tmp"
    mv "\${FILE_PATH}.tmp" "$FILE_PATH"

    zenity --info --text="🗑️ $ITEM_TYPE '$TO_DELETE' deleted." 2>/dev/null
}

manage_items() {
    local ITEM_TYPE=$1
    local FILE_PATH=$2

    while true; do
        local ACTION
        ACTION=$(zenity --list --title="Manage \${ITEM_TYPE}s" --column="Action" \\
            "Add New $ITEM_TYPE" "Edit $ITEM_TYPE" "Delete $ITEM_TYPE" \\
            --width=350 --height=250 --cancel-label="Back" 2>/dev/null)

        [[ $? -ne 0 || -z "$ACTION" ]] && return

        case "$ACTION" in
            "Add New $ITEM_TYPE") add_new_item "$ITEM_TYPE" "$FILE_PATH" ;;
            "Edit $ITEM_TYPE") edit_item "$ITEM_TYPE" "$FILE_PATH" ;;
            "Delete $ITEM_TYPE") delete_item "$ITEM_TYPE" "$FILE_PATH" ;;
        esac
    done
}

get_decoded_description() {
    local SEARCH_NAME=$1
    local FILE_PATH=$2
    local ENCODED_DESC=""

    [[ -z "$SEARCH_NAME" ]] && return

    while IFS= read -r line; do
        if [[ "$line" == "$SEARCH_NAME:::"* ]]; then
            ENCODED_DESC="\${line#$SEARCH_NAME:::}"
            break
        fi
    done < "$FILE_PATH"

    if [[ -n "$ENCODED_DESC" ]]; then
        local DECODED_DESC
        DECODED_DESC=$(echo -n "$ENCODED_DESC" | base64 --decode 2>/dev/null)
        if [[ -z "$DECODED_DESC" ]]; then
            echo "$ENCODED_DESC"
        else
            echo "$DECODED_DESC"
        fi
    fi
}

# ─────────────────────────────────────────────
# 1. Model Selection & Dynamic VRAM Calibration
# ─────────────────────────────────────────────
MODELS=()
while IFS= read -r model; do
    if [ \${#MODELS[@]} -eq 0 ]; then
        MODELS+=("TRUE" "$model")
    else
        MODELS+=("FALSE" "$model")
    fi
done < <(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')

if [ \${#MODELS[@]} -eq 0 ]; then
    zenity --error --text="❌ No Ollama models found. Please ensure Ollama is active ('ollama list')." 2>/dev/null
    exit 1
fi

MODEL=$(zenity --list --radiolist --title="1/4: Choose Ollama Model" \\
    --column="Select" --column="Model" "\${MODELS[@]}" --width=560 --height=380 2>/dev/null)

[[ $? -ne 0 || -z "$MODEL" ]] && { echo "❌ Operation cancelled by user."; exit 1; }

# Thinking toggle (Simple 1-click dialog)
zenity --question \\
    --title="Reasoning / Thinking Mode" \\
    --text="Enable 🧠 Deep Thinking Mode for this run?\\n\\n(Recommended for Gemma4, DeepSeek, and reasoning models to think before generating)" \\
    --ok-label="Enable Thinking 🧠" \\
    --cancel-label="Standard (Fast / Direct)" 2>/dev/null

if [[ $? -eq 0 ]]; then
    THINK_ENABLED="true"
else
    THINK_ENABLED="false"
fi

# ── Dynamic Context & VRAM Safeguard Math ────
# For large 26B-32B weights (~14-17GB on disk):
#   - 16384 context needs ~4.8 GB KV cache -> crashes with cudaMalloc 500 error!
#   - 4096 context truncated your JSON prompt mid-output ("camera_tech...").
#   - ${options.largeModelContext} context is the golden sweet spot (~2.0 GB KV cache), fitting both prompt & full output!
shopt -s nocasematch
if [[ "$MODEL" =~ (24b|26b|27b|30b|32b|70b) ]]; then
    OLLAMA_NUM_CTX=${options.largeModelContext}
    OLLAMA_NUM_PREDICT=${options.maxPredictTokens}
    VRAM_PROFILE="Heavy 26B-32B Model (VRAM Safeguard: ${options.largeModelContext} ctx)"
elif [[ "$MODEL" =~ (12b|14b|16b|20b) ]]; then
    OLLAMA_NUM_CTX=12288
    OLLAMA_NUM_PREDICT=${options.maxPredictTokens}
    VRAM_PROFILE="Mid 12B-14B Model (Balanced: 12288 ctx)"
else
    # 2B - 9B Models
    OLLAMA_NUM_CTX=${options.standardModelContext}
    OLLAMA_NUM_PREDICT=${options.maxPredictTokens}
    VRAM_PROFILE="Compact ≤9B Model (Full: ${options.standardModelContext} ctx)"
fi
shopt -u nocasematch

OLLAMA_TEMPERATURE=0.85
OLLAMA_TOP_P=0.95
OLLAMA_TOP_K=64
OLLAMA_REPEAT_PENALTY=${options.repeatPenalty}

# ─────────────────────────────────────────────
# 2. Persona Selection
# ─────────────────────────────────────────────
SELECTED_PERSONA_NAME=""
while true; do
    PERSONA_OPTIONS=("TRUE" "Default (None)" "Generic AI art prompt engineer enhancer.")

    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        name="\${line%%:::*}"
        [[ "$name" == "$line" ]] && continue
        encoded_desc="\${line#$name:::}"
        desc=$(echo -n "$encoded_desc" | base64 --decode 2>/dev/null)
        [[ -z "$desc" ]] && desc="$encoded_desc"
        short_desc=$(echo "$desc" | tr '\\n' ' ' | cut -c 1-120)
        [[ \${#desc} -gt 120 ]] && short_desc+="..."
        PERSONA_OPTIONS+=("FALSE" "$name" "$short_desc")
    done < "$PERSONAS_FILE"

    PERSONA_SELECTION=$(zenity --list --title="2/4: Select Persona (System Prompt)" \\
        --width=960 --height=460 --radiolist --column="Select" --column="Name" --column="Preview" \\
        --extra-button="Manage Personas" --ok-label="Continue" "\${PERSONA_OPTIONS[@]}" 2>/dev/null)

    EXIT_STATUS=$?

    if [[ "$PERSONA_SELECTION" == "Manage Personas" ]]; then
        manage_items "Persona" "$PERSONAS_FILE"
        continue
    elif [[ $EXIT_STATUS -ne 0 ]]; then
        echo "❌ Cancelled."; exit 1
    else
        SELECTED_PERSONA_NAME="$PERSONA_SELECTION"
        break
    fi
done

SELECTED_PERSONA_DESC=""
if [[ "$SELECTED_PERSONA_NAME" != "Default (None)" ]]; then
    SELECTED_PERSONA_DESC=$(get_decoded_description "$SELECTED_PERSONA_NAME" "$PERSONAS_FILE")
fi

# ─────────────────────────────────────────────
# 3. Style Selection
# ─────────────────────────────────────────────
SELECTED_STYLE_NAMES=()
while true; do
    STYLE_CHECKBOXES=()
    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        name="\${line%%:::*}"
        [[ "$name" == "$line" ]] && continue
        encoded_desc="\${line#$name:::}"
        desc=$(echo -n "$encoded_desc" | base64 --decode 2>/dev/null)
        [[ -z "$desc" ]] && desc="$encoded_desc"
        display_desc=$(echo "$desc" | tr '\\n' ' ')
        STYLE_CHECKBOXES+=("FALSE" "$name" "$display_desc")
    done < "$STYLES_FILE"

    STYLE_SELECTION=$(zenity --list --title="3/4: Select Styles (Optional)" \\
        --width=920 --height=460 --checklist --separator="|" --column="Select" --column="Name" --column="Description" \\
        --extra-button="Manage Styles" --ok-label="Continue" "\${STYLE_CHECKBOXES[@]}" 2>/dev/null)

    EXIT_STATUS=$?

    if [[ "$STYLE_SELECTION" == "Manage Styles" ]]; then
        manage_items "Style" "$STYLES_FILE"
        continue
    elif [[ $EXIT_STATUS -ne 0 ]]; then
        echo "❌ Cancelled."; exit 1
    else
        if [[ -n "$STYLE_SELECTION" ]]; then
            IFS="|" read -ra SELECTED_STYLE_NAMES <<< "$STYLE_SELECTION"
        fi
        break
    fi
done

STYLE_TEXT=""
for name in "\${SELECTED_STYLE_NAMES[@]}"; do
    style_desc=$(get_decoded_description "$name" "$STYLES_FILE")
    [[ -n "$style_desc" ]] && STYLE_TEXT+="$style_desc, "
done
STYLE_TEXT=\${STYLE_TEXT%, }

# ─────────────────────────────────────────────
# 4. Base Prompt Input (With Pre-Fill & Zero-Loss)
# ─────────────────────────────────────────────
PREV_PROMPT=""
[[ -f "$LAST_PROMPT_FILE" ]] && PREV_PROMPT=$(cat "$LAST_PROMPT_FILE" 2>/dev/null)

PROMPT=$(zenity --text-info --editable --title="4/4: Base Prompt Input" \\
    --width=800 --height=400 --filename=/dev/null --text="\${PREV_PROMPT:-Describe your base prompt here...}" 2>/dev/null)

[[ $? -ne 0 || -z "$PROMPT" ]] && { echo "❌ No prompt entered. Exiting."; exit 1; }

# IMMEDIATELY BACKUP PROMPT SO IT CAN NEVER BE LOST
echo "$PROMPT" > "$LAST_PROMPT_FILE"

COMBINED_PROMPT="$PROMPT"
[[ -n "$STYLE_TEXT" ]] && COMBINED_PROMPT+=", $STYLE_TEXT"
COMBINED_PROMPT=$(echo "$COMBINED_PROMPT" | sed 's/,\\s*,/,/g' | sed 's/,\\s*$//')

# ─────────────────────────────────────────────
# System Prompt Assembly
# ─────────────────────────────────────────────
if [[ -n "$SELECTED_PERSONA_DESC" && "$SELECTED_PERSONA_NAME" != "Default (None)" ]]; then
    SYSTEM_PROMPT="$SELECTED_PERSONA_DESC"
else
    SYSTEM_PROMPT="You are an expert AI visual artist and prompt engineer. Transform the user's idea and visual styles into an expansive, descriptive, cinematic text-to-image prompt. Return only the final detailed prompt."
fi

# ─────────────────────────────────────────────
# Execution & Live Output Display
# ─────────────────────────────────────────────
rotate_logs
LOG_TIMESTAMP=$(date +"%a, %b %d, %Y %H:%M:%S")
DISPLAY_STYLES=$(IFS=", "; echo "\${SELECTED_STYLE_NAMES[*]:-None}")

echo ""
echo "🎨 ArtGenerate Execution [$LOG_TIMESTAMP]"
echo "───────────────────────────────────────────────────────────────────"
echo "Model:       $MODEL"
echo "Profile:     $VRAM_PROFILE"
echo "Persona:     $SELECTED_PERSONA_NAME"
echo "Styles:      $DISPLAY_STYLES"
echo "Thinking:    $THINK_ENABLED"
echo "Context:     $OLLAMA_NUM_CTX tokens"
echo "Max Predict: $OLLAMA_NUM_PREDICT tokens"
echo "Rep. Penalty:$OLLAMA_REPEAT_PENALTY"
echo "───────────────────────────────────────────────────────────────────"
echo "📝 Raw User Prompt (Safely Preserved):"
echo "$PROMPT"
echo "───────────────────────────────────────────────────────────────────"

TEMP_OUTPUT_FILE=$(mktemp)
trap 'rm -f "$TEMP_OUTPUT_FILE"' EXIT

export ARTGEN_MODEL="$MODEL"
export ARTGEN_SYSTEM="$SYSTEM_PROMPT"
export ARTGEN_PROMPT="$COMBINED_PROMPT"
export ARTGEN_THINK="$THINK_ENABLED"
export ARTGEN_TEMP="$OLLAMA_TEMPERATURE"
export ARTGEN_TOP_P="$OLLAMA_TOP_P"
export ARTGEN_TOP_K="$OLLAMA_TOP_K"
export ARTGEN_NUM_CTX="$OLLAMA_NUM_CTX"
export ARTGEN_NUM_PREDICT="$OLLAMA_NUM_PREDICT"
export ARTGEN_REPEAT_PENALTY="$OLLAMA_REPEAT_PENALTY"
export ARTGEN_OUTFILE="$TEMP_OUTPUT_FILE"

# ─────────────────────────────────────────────
# Python Engine: Minification, Streaming & Fallback
# ─────────────────────────────────────────────
python3 <<'PY'
import json
import os
import sys
import urllib.request
import urllib.error

model = os.environ.get("ARTGEN_MODEL")
system_prompt = os.environ.get("ARTGEN_SYSTEM", "")
user_prompt = os.environ.get("ARTGEN_PROMPT", "")
think_enabled = os.environ.get("ARTGEN_THINK", "false").lower() == "true"
out_filepath = os.environ.get("ARTGEN_OUTFILE")
num_ctx = int(os.environ.get("ARTGEN_NUM_CTX", 7168))
num_predict = int(os.environ.get("ARTGEN_NUM_PREDICT", 4096))
temp = float(os.environ.get("ARTGEN_TEMP", 0.85))
top_p = float(os.environ.get("ARTGEN_TOP_P", 0.95))
top_k = int(os.environ.get("ARTGEN_TOP_K", 64))
repeat_penalty = float(os.environ.get("ARTGEN_REPEAT_PENALTY", 1.15))

# Auto-minify JSON persona if applicable to conserve ~1,000 context tokens
raw_system = system_prompt.strip()
if raw_system.startswith("{") and raw_system.endswith("}"):
    try:
        parsed_json = json.loads(raw_system)
        minified_system = json.dumps(parsed_json, separators=(',', ':'))
        system_prompt = minified_system
        # Inform terminal of compression
        saved_chars = len(raw_system) - len(minified_system)
        if saved_chars > 200:
            sys.stdout.write(f"\\x1b[90m[⚡ Optimized JSON persona: saved ~{saved_chars // 4} context tokens]\\x1b[0m\\n")
    except Exception:
        pass

messages = []
if system_prompt:
    messages.append({"role": "system", "content": system_prompt})
messages.append({"role": "user", "content": user_prompt})

payload = {
    "model": model,
    "messages": messages,
    "stream": True,
    "think": think_enabled,
    "options": {
        "num_ctx": num_ctx,
        "num_predict": num_predict,
        "temperature": temp,
        "top_p": top_p,
        "top_k": top_k,
        "repeat_penalty": repeat_penalty,
        "repeat_last_n": 128
    }
}

req = urllib.request.Request(
    "http://127.0.0.1:11434/api/chat",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

thinking_active = False
final_response_started = False
final_content = []
accumulated_thinking = []

try:
    with urllib.request.urlopen(req, timeout=1800) as response:
        for raw_line in response:
            line = raw_line.decode("utf-8", errors="replace").strip()
            if not line:
                continue
            try:
                chunk = json.loads(line)
            except json.JSONDecodeError:
                continue

            if "error" in chunk:
                sys.stderr.write(f"\\n❌ Ollama API Error: {chunk['error']}\\n")
                sys.exit(1)

            msg = chunk.get("message", {})
            thinking = msg.get("thinking", "") or chunk.get("thinking", "")
            content = msg.get("content", "") or chunk.get("response", "")

            # Stream thinking in cyan/dim gray
            if thinking:
                if not thinking_active:
                    sys.stdout.write("\\x1b[36m🧠 [Thinking / Reasoning Phase]:\\x1b[0m\\n\\x1b[90m")
                    sys.stdout.flush()
                    thinking_active = True
                sys.stdout.write(thinking)
                sys.stdout.flush()
                accumulated_thinking.append(thinking)

            # Stream final prompt output in vibrant green
            if content:
                if thinking_active and not final_response_started:
                    sys.stdout.write("\\x1b[0m\\n\\n\\x1b[32m🎨 [Final Generated Prompt]:\\x1b[0m\\n")
                    sys.stdout.flush()
                    final_response_started = True
                elif not final_response_started:
                    sys.stdout.write("\\x1b[32m🎨 [Final Generated Prompt]:\\x1b[0m\\n")
                    sys.stdout.flush()
                    final_response_started = True

                sys.stdout.write(content)
                sys.stdout.flush()
                final_content.append(content)

            if chunk.get("done", False):
                done_reason = chunk.get("done_reason")
                if done_reason == "length":
                    sys.stdout.write("\\n\\n\\x1b[33m⚠️ Note: Generation reached token context limit. (Output preserved).\\x1b[0m\\n")
                break

    sys.stdout.write("\\x1b[0m\\n")
    sys.stdout.flush()

    result_text = "".join(final_content).strip()
    if not result_text and accumulated_thinking:
        result_text = "".join(accumulated_thinking).strip()

    with open(out_filepath, "w", encoding="utf-8") as f:
        f.write(result_text)

except urllib.error.HTTPError as e:
    err_body = e.read().decode("utf-8", errors="replace")
    sys.stderr.write(f"\n❌ HTTP {e.code} Error: {err_body}\n")
    if "cudaMalloc" in err_body or "resource allocation failed" in err_body:
        sys.stderr.write("\n💡 Diagnosis: VRAM allocation spike. Try lowering num_ctx by 1024 or quitting background GPU processes.\n")
    sys.exit(1)
except urllib.error.URLError as e:
    sys.stderr.write(f"\n❌ Connection Error: {e.reason}. Ensure Ollama is running.\n")
    sys.exit(1)
except Exception as e:
    sys.stderr.write(f"\n❌ Generation Error: {e}\n")
    sys.exit(1)
PY

OLLAMA_STATUS=$?

if [[ "$OLLAMA_STATUS" -ne 0 ]]; then
    zenity --error --title="ArtGenerate Error" --text="Ollama generation hit an error.\\nYour prompt is safely saved to:\\n$LAST_PROMPT_FILE\\nCheck terminal for full details." 2>/dev/null
    exit 1
fi

OLLAMA_RESPONSE=$(cat "$TEMP_OUTPUT_FILE")

# ─────────────────────────────────────────────
# Save Log
# ─────────────────────────────────────────────
{
    echo "--- LOG ENTRY: \${LOG_TIMESTAMP} ---"
    echo "Model:     $MODEL"
    echo "Persona:   $SELECTED_PERSONA_NAME"
    echo "Styles:    $DISPLAY_STYLES"
    echo "Thinking:  $THINK_ENABLED"
    echo "Context:   $OLLAMA_NUM_CTX"
    echo "--- RAW USER PROMPT ---"
    echo "$PROMPT"
    echo "--- COMBINED PROMPT ---"
    echo "$COMBINED_PROMPT"
    echo "--- OLLAMA RESPONSE ---"
    echo "$OLLAMA_RESPONSE"
    echo "--------------------------------------------------"
    echo ""
} >> "$LOG_FILE"

echo "───────────────────────────────────────────────────────────────────"
echo "✅ Generation complete. Full log saved to $LOG_FILE"

if [[ -s "$TEMP_OUTPUT_FILE" ]]; then
    zenity --text-info \\
        --title="ArtGenerate - Finished Prompt" \\
        --filename="$TEMP_OUTPUT_FILE" \\
        --width=900 \\
        --height=580 2>/dev/null
fi

exit 0
`;
}
