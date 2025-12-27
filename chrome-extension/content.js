// --- Constants ---
const API_URL = "https://ingen-ia.vercel.app/api/generate-comment";
const OBSERVER_TARGET = document.body;

// LinkedIn selectors often change, but these are currently reliable wrappers
const POST_SELECTOR = '.feed-shared-update-v2';
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view';

// --- State ---
// We track which posts we've already injected to avoid duplicates
const INJECTED_ATTR = 'data-ingenia-injected';

// --- Observer Setup ---
const observer = new MutationObserver((mutations) => {
    // Optimization: only check if nodes were added
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasAddedNodes) {
        scanAndInject();
    }
});

observer.observe(OBSERVER_TARGET, {
    childList: true,
    subtree: true
});

// Initial scan
scanAndInject();

function scanAndInject() {
    const posts = document.querySelectorAll(POST_SELECTOR);

    posts.forEach(post => {
        if (post.hasAttribute(INJECTED_ATTR)) return;

        // Try to find the action bar (Like, Comment...)
        const actionBar = post.querySelector(ACTION_BAR_SELECTOR);

        if (actionBar) {
            injectButtons(actionBar, post);
            post.setAttribute(INJECTED_ATTR, 'true');
        }
    });
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container';

    // Button 1: Summarize
    const btnSum = createButton('📝', 'Resumir', () => handleAction(postElement, 'summarize', btnSum));

    // Button 2: Comment
    const btnComment = createButton('⚡️', 'Comentar', () => handleAction(postElement, 'comment', btnComment));

    btnContainer.appendChild(btnSum);
    btnContainer.appendChild(btnComment);

    container.appendChild(btnContainer);
}

function createButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-btn';
    btn.innerHTML = `<span class="ingenia-icon">${icon}</span> ${text}`;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop LinkedIn from opening the post detail
        onClick();
    });
    return btn;
}

// --- Action Handler ---
async function handleAction(postElement, type, button) {
    // 1. Get Settings (License Key)
    const store = await chrome.storage.sync.get(['licenseKey']);
    const licenseKey = store.licenseKey;

    if (!licenseKey) {
        alert('⚠️ IngenIA: Falta tu Clave de Licencia.\nPor favor, abre la extensión y pega tu clave desde el Dashboard.');
        return;
    }

    // 2. Extract Text
    const textNode = postElement.querySelector(TEXT_SELECTOR);
    const postText = textNode ? textNode.innerText.trim() : "";

    if (!postText) {
        alert('⚠️ IngenIA: No pude leer el texto de este post.\nIntenta entrar al post completo.');
        return;
    }

    // 3. UI Loading State
    const originalContent = button.innerHTML;
    button.innerHTML = '<div class="ingenia-spinner"></div>';
    button.disabled = true;

    try {
        // 4. Prepare Prompt
        let prompt = postText;
        if (type === 'summarize') {
            prompt = "Por favor, resume brevemente el siguiente post de LinkedIn en español, destacando los puntos clave: " + postText;
        }

        // 5. API Call
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                licenseKey: licenseKey,
                prompt: prompt
            })
        });

        // 6. Handle Response
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Error ${response.status}: ${data.details || 'Unknown error'}`);
        }

        const result = data.result;

        if (type === 'comment') {
            insertCommentIntoLinkedIn(postElement, result);
        } else {
            alert("📋 RESUMEN:\n\n" + result);
        }

    } catch (err) {
        console.error("IngenIA Error:", err);
        alert(`❌ Error: ${err.message}`);
    } finally {
        button.innerHTML = originalContent;
        button.disabled = false;
    }
}

function insertCommentIntoLinkedIn(postElement, text) {
    // 1. Find and click the "Comment" button to open the box
    const commentTrigger = postElement.querySelector('button.comment-button') ||
        postElement.querySelector('button[aria-label*="Comment"]');

    if (commentTrigger) commentTrigger.click();

    // 2. Wait briefly for the editor to appear
    setTimeout(() => {
        // LinkedIn uses a contenteditable div with class .ql-editor (Quill editor)
        const editor = postElement.querySelector('.ql-editor') ||
            postElement.querySelector('div[contenteditable="true"]');

        if (editor) {
            editor.focus();
            // Deprecated but most reliable for rich text editors to trigger events
            document.execCommand('insertText', false, text);

            // Dispatch input event to ensure UI enables the "Post" button
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // Fallback
            console.warn("IngenIA: Could not auto-insert. Copying to clipboard.");
            navigator.clipboard.writeText(text).then(() => {
                alert("✅ Comentario generado y COPIADO al portapapeles.\n(No encontré la caja de texto automática).");
            });
        }
    }, 600); // 600ms delay to allow UI animation
}
