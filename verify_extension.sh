#!/bin/bash

# IngenIA Extension Verification Script
# Este script verifica que todos los archivos estén en orden

echo "🔍 VERIFICANDO EXTENSIÓN INGENIA V25..."
echo ""

EXTENSION_PATH="/Users/tomas/Downloads/DOCUMENTOS/ProgramaMary/linkedin-extension"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check files
echo "📋 Verificando archivos requeridos..."

files=(
    "manifest.json"
    "content.js"
    "background.js"
    "popup.html"
    "popup.js"
    "styles.css"
    "icons/icon16.png"
    "icons/icon48.png"
    "icons/icon128.png"
)

all_good=true

for file in "${files[@]}"; do
    if [ -f "$EXTENSION_PATH/$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (FALTA)"
        all_good=false
    fi
done

echo ""
echo "📊 Estadísticas de archivos..."

# Check content.js size and version
if grep -q "V25" "$EXTENSION_PATH/content.js"; then
    echo -e "${GREEN}✓${NC} content.js contiene V25"
else
    echo -e "${RED}✗${NC} content.js NO contiene V25"
    all_good=false
fi

# Check for key functions
echo ""
echo "🔑 Verificando funciones clave en content.js..."

functions=(
    "scanAndInjectPosts"
    "findActionBar"
    "scanAndInjectCommentReplies"
    "injectReplyButton"
    "handlePostAction"
    "extractPostContent"
    "showResultModal"
)

for func in "${functions[@]}"; do
    if grep -q "function $func" "$EXTENSION_PATH/content.js"; then
        echo -e "${GREEN}✓${NC} $func"
    else
        echo -e "${RED}✗${NC} $func (FALTA)"
        all_good=false
    fi
done

# Check CSS selectors
echo ""
echo "🎨 Verificando selectores CSS..."

css_selectors=(
    "data-ingenia-post-buttons"
    "data-ingenia-reply-btn"
)

for selector in "${css_selectors[@]}"; do
    if grep -q "$selector" "$EXTENSION_PATH/styles.css"; then
        echo -e "${GREEN}✓${NC} $selector"
    else
        echo -e "${RED}✗${NC} $selector (FALTA)"
        all_good=false
    fi
done

# Check manifest
echo ""
echo "⚙️  Verificando manifest.json..."

if grep -q '"name": "IngenIA' "$EXTENSION_PATH/manifest.json"; then
    echo -e "${GREEN}✓${NC} Nombre correcto en manifest"
else
    echo -e "${RED}✗${NC} Nombre incorrecto en manifest"
    all_good=false
fi

if grep -q '"manifest_version": 3' "$EXTENSION_PATH/manifest.json"; then
    echo -e "${GREEN}✓${NC} Manifest V3"
else
    echo -e "${RED}✗${NC} No es Manifest V3"
    all_good=false
fi

# Size check
echo ""
echo "📦 Tamaño de archivos..."
cd "$EXTENSION_PATH"
echo -n "content.js: "
wc -l content.js | awk '{print $1 " líneas"}'
echo -n "styles.css: "
wc -l styles.css | awk '{print $1 " líneas"}'
echo -n "background.js: "
wc -l background.js | awk '{print $1 " líneas"}'

# ZIP file
echo ""
echo "📦 ZIP disponible:"
if [ -f "/Users/tomas/Downloads/DOCUMENTOS/ProgramaMary/linkedin-extension-v25.zip" ]; then
    size=$(ls -lh "/Users/tomas/Downloads/DOCUMENTOS/ProgramaMary/linkedin-extension-v25.zip" | awk '{print $5}')
    echo -e "${GREEN}✓${NC} linkedin-extension-v25.zip ($size)"
else
    echo -e "${RED}✗${NC} linkedin-extension-v25.zip NO EXISTE"
    all_good=false
fi

# Final result
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$all_good" = true ]; then
    echo -e "${GREEN}✅ VERIFICACIÓN COMPLETA - TODO ESTÁ EN ORDEN${NC}"
    echo ""
    echo "📖 Próximos pasos:"
    echo "1. Abre chrome://extensions"
    echo "2. Activa 'Modo de desarrollador'"
    echo "3. Haz clic en 'Cargar extensión sin empaquetar'"
    echo "4. Selecciona: $EXTENSION_PATH"
    echo ""
else
    echo -e "${RED}❌ VERIFICACIÓN FALLÓ - Hay problemas${NC}"
    echo ""
    exit 1
fi
