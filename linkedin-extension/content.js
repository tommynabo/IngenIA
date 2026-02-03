// [IngenIA] V13 - CLEAN REBUILD
// Re-implemented from scratch based on December Backup logic + 2026 Selectors

console.log('🚀 IngenIA: Extension Loaded (V13 Phoenix)');

// --- TRACKING ---
// We use WeakSets to ensure we never inject twice into the same DOM element
const processedPosts = new WeakSet();
const processedComments = new WeakSet();

// --- LOOP ---
// Simple, robust polling. No complex observers that might miss things.
setInterval(() => {
    scanPosts();
    scanComments();
}, 2000); // Check every 2 seconds

// --- 1. POSTS LOGIC ---
function scanPosts() {
    // We want the buttons "al lado del Recomendar" (Next to Like button)
    // The container for that is .feed-shared-social-action-bar
    const actionBars = document.querySelectorAll('.feed-shared-social-action-bar');

    actionBars.forEach(bar => {
        if (processedPosts.has(bar)) return;

        // VERIFY: Is this a Main Post? (Not a comment, not a confusing element)
        const postContainer = bar.closest('.feed-shared-update-v2');
        if (!postContainer) return; // Skip if not inside a standard feed post

        // VERIFY: Avoid injecting into comment action bars (which sometimes look similar)
        if (bar.closest('.comments-comment-item')) return;

        // SUCCESS: It's a post action bar. Mark it.
        processedPosts.add(bar);

        // CREATE BUTTONS
        const container = document.createElement('div');
        container.className = 'ingenia-post-actions';
        // Flex style to sit nicely with other buttons
        container.style.cssText = `
            display: inline-flex;
            align-items: center;
            margin-left: 8px;
            vertical-align: middle;
        `;

        const btnSummary = createIngeniaButton('📝', 'Resumir', () => runAction(postContainer, 'summarize', btnSummary));
        const btnComment = createIngeniaButton('⚡', 'Comentar', () => runAction(postContainer, 'comment', btnComment));

        container.appendChild(btnSummary);
        container.appendChild(btnComment);

        // INJECT: Append to the end of the action bar
        bar.appendChild(container);
        console.log('✅ IngenIA: Added Post Buttons');
    });
}

// --- 2. COMMENTS LOGIC ---
function scanComments() {
    // We want ONE pencil next to "Responder" (Reply)
    // First, find all comment items
    const comments = document.querySelectorAll('.comments-comment-item, .comments-comment-entity, [data-type="comment"]');

    comments.forEach(comment => {
        if (processedComments.has(comment)) return;

        // Find the "Responder" / "Reply" button logic
        // It's usually a <button> or <span> with text "Responder"
        // We look DEEP inside the comment for it.
        const allButtons = comment.querySelectorAll('button, span[role="button"]');
        let replyBtn = null;

        for (const btn of allButtons) {
            const txt = (btn.innerText || '').toLowerCase().trim();
            // Check text match exactly
            if (txt === 'responder' || txt === 'reply' || txt === 'reply to') {
                replyBtn = btn;
                break;
            }
        }

        if (replyBtn) {
            // Found the specific reply button for this comment.
            processedComments.add(comment);

            // Double check: does it already have a pencil?
            if (replyBtn.parentNode.querySelector('.ingenia-pencil')) return;

            // Create Pencil
            const pencil = document.createElement('button');
            pencil.className = 'ingenia-pencil';
            pencil.innerHTML = '✏️';
            pencil.title = 'Generar respuesta con IA';
            // Reset button styles to look like an icon
            pencil.style.cssText = `
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 16px;
                margin-left: 8px;
                padding: 4px;
                vertical-align: middle;
            `;

            pencil.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                runAction(comment, 'reply', pencil);
            };

            // INJECT: Immediately after the Reply button
            // If the Reply button is in a list item <li>, inject in the <li>? No, safer to inject in the button's parent
            if (replyBtn.parentNode) {
                // Insert after
                replyBtn.parentNode.insertBefore(pencil, replyBtn.nextSibling);
                console.log('✅ IngenIA: Added Pencil');
            }
        }
    });
}

// --- UI HELPERS ---
function createIngeniaButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.innerHTML = `<span style="margin-right:4px">${icon}</span>${text}`;
    // LinkedIn Button Style Replica (Blue pill)
    btn.style.cssText = `
        background-color: #0a66c2;
        color: white;
        border: none;
        border-radius: 16px;
        padding: 5px 12px;
        margin-right: 8px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto;
        font-size: 14px;
        line-height: 20px;
        transition: background-color 0.15s;
    `;

    // Hover effect
    btn.onmouseenter = () => btn.style.backgroundColor = '#004182';
    btn.onmouseleave = () => btn.style.backgroundColor = '#0a66c2';

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    };
    return btn;
}

// --- ACTION LOGIC (The "Brain") ---
async function runAction(contextElement, type, uiElement) {
    // 1. Context Check
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        alert('⚠️ Extensión desconectada. Recarga la página.');
        return;
    }

    // 2. Get License Key (User requested: "Toma la licencia")
    let licenseKey = null;
    try {
        const data = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = data.licenseKey;
    } catch (e) {
        console.error(e);
    }

    if (!licenseKey) {
        alert('⚠️ Configura tu clave de licencia en la extensión primero.');
        return;
    }

    // 3. Extract Text (User requested: "Toma el prompt dentro de cada persona")
    // Note: We extract the text CONTENT. The "Prompt" logic happens here or on server.
    // Based on previous versions, we send a 'prompt' string TO the background.

    let extractedText = '';

    // TEXT STRATEGY: Look for standard text classes
    // Common text container classes in 2026
    const selectors = [
        '.feed-shared-update-v2__description',
        '.update-components-text',
        '.feed-shared-text-view',
        '[class*="comment-item__main-content"]',
        '[data-test-id="main-feed-activity-card__commentary"]' // Sometimes used
    ];

    // Try finding text node
    let textNode = contextElement.querySelector(selectors.join(', '));

    if (textNode) {
        extractedText = textNode.innerText;
    } else {
        // Fallback: Clone and Strip
        // This handles cases where we can't find specific class
        const clone = contextElement.cloneNode(true);
        // Remove known noise (buttons, nested comments)
        const noise = clone.querySelectorAll('button, .video-player, .comments-comments-list, .feed-shared-social-action-bar');
        noise.forEach(n => n.remove());
        extractedText = clone.innerText;
    }

    extractedText = extractedText.replace(/\s+/g, ' ').trim(); // Clean whitespace

    if (extractedText.length < 5) {
        alert('⚠️ No encontré texto suficiente para analizar.');
        return;
    }

    // 4. Construct Prompt (The "Prompt" logic)
    let promptToSend = '';

    // Try to find author name for better context
    let authorName = 'el autor';
    const authorEl = contextElement.querySelector('.update-components-actor__name, .feed-shared-actor__name, .comments-post-meta__name-text');
    if (authorEl) authorName = authorEl.innerText.split('\n')[0].trim();

    if (type === 'summarize') {
        promptToSend = `Resume esta publicación de LinkedIn de forma breve y estructurada (puntos clave). Autor: ${authorName}.\n\nTexto:\n${extractedText}`;
    } else if (type === 'reply') {
        promptToSend = `Genera una respuesta profesional y empática para este comentario de LinkedIn. Autor: ${authorName}.\n\nComentario:\n${extractedText}\n\nInstrucciones: Tono cercano pero experto. Menciona al autor si es relevante.`;
    } else {
        // 'comment' (on a post)
        promptToSend = `Genera un comentario profesional y de valor para esta publicación de LinkedIn. Autor: ${authorName}.\n\nPost:\n${extractedText}\n\nInstrucciones: Aporta una idea interesante o valida el punto. Sé conciso.`;
    }

    // 5. Send to Background
    const originalText = uiElement.innerText;
    uiElement.innerText = '⏳';
    uiElement.disabled = true;

    chrome.runtime.sendMessage({
        action: 'generate_comment',
        licenseKey: licenseKey,
        prompt: promptToSend
    }, (response) => {
        uiElement.innerText = originalText; // Restore button text? Or keeping icon is fine.
        uiElement.innerHTML = originalText; // Restore full HTML (icon + text)
        uiElement.disabled = false;

        if (chrome.runtime.lastError) {
            alert('❌ Error de conexión: ' + chrome.runtime.lastError.message);
            return;
        }

        if (response && response.success) {
            // SUCCESS: Show Modal
            showResultModal(response.result, contextElement);
        } else {
            alert('❌ Error del servidor: ' + (response?.error || 'Desconocido'));
        }
    });
}

// --- MODAL (Clean implementation) ---
function showResultModal(text, contextElement) {
    // Remove if exists
    const old = document.getElementById('ingenia-modal-v13');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ingenia-modal-v13';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 100000;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(2px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white; width: 500px; max-width: 90%;
        padding: 24px; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        display: flex; flex-direction: column; gap: 16px;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto;
    `;

    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0; font-size:18px; color:#333;">✨ Resultado Generado</h3>
            <button id="ing-close" style="background:none; border:none; font-size:20px; cursor:pointer; color:#666;">&times;</button>
        </div>
        <textarea id="ing-text" style="
            width: 100%; height: 150px; padding: 12px;
            border: 1px solid #ddd; border-radius: 8px;
            font-size: 14px; line-height: 1.5; resize: vertical;
            font-family: inherit; color: #333;
        ">${text}</textarea>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
            <button id="ing-copy" style="
                padding: 8px 16px; border: 1px solid #0a66c2; background: white;
                color: #0a66c2; border-radius: 20px; font-weight: 600; cursor: pointer;
            ">Copiar</button>
            <button id="ing-insert" style="
                padding: 8px 16px; border: none; background: #0a66c2;
                color: white; border-radius: 20px; font-weight: 600; cursor: pointer;
            ">Insertar</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Handlers
    const close = () => overlay.remove();
    modal.querySelector('#ing-close').onclick = close;

    modal.querySelector('#ing-copy').onclick = () => {
        const txt = modal.querySelector('#ing-text').value;
        navigator.clipboard.writeText(txt);
        const btn = modal.querySelector('#ing-copy');
        btn.innerText = '¡Copiado!';
        setTimeout(() => btn.innerText = 'Copiar', 2000);
    };

    modal.querySelector('#ing-insert').onclick = () => {
        const txt = modal.querySelector('#ing-text').value;
        insertText(contextElement, txt);
        close();
    };

    // Close on click outside
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function insertText(contextElement, text) {
    // 1. Find Editor
    let editor = contextElement.querySelector('.ql-editor') ||
        contextElement.querySelector('[contenteditable="true"]');

    // 2. Open if missing (Reply/Comment button click)
    if (!editor) {
        // Find reply/comment button
        const actionBtn = Array.from(contextElement.querySelectorAll('button')).find(b => {
            const t = b.innerText.toLowerCase();
            return t.includes('responder') || t.includes('reply') || t.includes('comentar');
        });

        if (actionBtn) {
            actionBtn.click();
            // Wait for editor
            setTimeout(() => {
                editor = contextElement.querySelector('.ql-editor') ||
                    contextElement.querySelector('[contenteditable="true"]') ||
                    document.activeElement;
                if (editor && editor.isContentEditable) {
                    pasteToEditor(editor, text);
                } else {
                    navigator.clipboard.writeText(text);
                    alert('Texto copiado al portapapeles (abre el editor manual)');
                }
            }, 500);
            return;
        }
    }

    if (editor) {
        pasteToEditor(editor, text);
    } else {
        navigator.clipboard.writeText(text);
        alert('Texto copiado (no encontré editor)');
    }
}

function pasteToEditor(editor, text) {
    editor.focus();
    // Modern execCommand replacement or fallback
    const success = document.execCommand('insertText', false, text);
    if (!success) {
        editor.innerText = text;
    }
    // Trigger events for React
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
}
