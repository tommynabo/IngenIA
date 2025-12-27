// --- Configuration ---
const OBSERVER_TARGET = document.body;
// Selectors for LinkedIn posts (Update-v2 is standard)
const POST_SELECTOR = '.feed-shared-update-v2';
const ACTION_BAR_SELECTOR = '.feed-shared-update-v2__control-menu-container, .feed-shared-social-action-bar, .feed-shared-update-v2__action-bar'; // Try multiple to find best spot
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text'; // Where the post text lives

// Variables
let apiUrl = '';
let licenseKey = '';

// Load settings
chrome.storage.sync.get(['apiUrl', 'licenseKey'], (items) => {
    apiUrl = items.apiUrl || 'https://ingenia-app.vercel.app/api/generate-comment';
    licenseKey = items.licenseKey || '';
});

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            checkForPosts();
        }
    });
});

observer.observe(OBSERVER_TARGET, {
    childList: true,
    subtree: true
});

// Initial check
checkForPosts();

function checkForPosts() {
    const posts = document.querySelectorAll(POST_SELECTOR);
    posts.forEach(post => {
        // Check if we already injected
        if (post.dataset.ingeniaInjected) return;

        // Find action bar to inject next to
        const actionBar = post.querySelector('.feed-shared-social-action-bar');
        if (!actionBar) return;

        injectButtons(actionBar, post);
        post.dataset.ingeniaInjected = 'true';
    });
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container';

    // Button 1: Summarize (Simple alert for MVP, or separate prompt)
    // For this task, we focus on Comment Generation as per user request flow?
    // User asked for: "boton 1: Resumir", "boton 2: Comentario Ingenioso"

    // Btn 1
    const btnSummarize = document.createElement('button');
    btnSummarize.className = 'ingenia-btn';
    btnSummarize.innerHTML = '<span class="ingenia-icon">📝</span> Resumir';
    btnSummarize.onclick = () => handleGenerate(postElement, 'summarize', btnSummarize);

    // Btn 2
    const btnComment = document.createElement('button');
    btnComment.className = 'ingenia-btn';
    btnComment.innerHTML = '<span class="ingenia-icon">⚡️</span> Comentar';
    btnComment.onclick = () => handleGenerate(postElement, 'comment', btnComment);

    btnContainer.appendChild(btnSummarize);
    btnContainer.appendChild(btnComment);

    // Append to container (usually as first child or after existing)
    container.appendChild(btnContainer);
    // Or prepend?
    // container.prepend(btnContainer);
}

async function handleGenerate(postElement, type, button) {
    if (!licenseKey) {
        alert('IngenIA: Por favor configura tu License Key en el popup de la extensión.');
        return;
    }

    // extract text
    const textEl = postElement.querySelector(TEXT_SELECTOR);
    const postText = textEl ? textEl.innerText : '';

    if (!postText) {
        alert('IngenIA: No pude encontrar el texto del post.');
        return;
    }

    // Loading state
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="ingenia-spinner"></div> Generando...';
    button.disabled = true;

    try {
        const promptPrefix = type === 'summarize' ? 'Summarize this post for me: ' : '';
        const finalPrompt = promptPrefix + postText;

        // Call API
        // Note: Backend expects { userId, prompt }. 
        // We are sending { licenseKey, prompt } from extension.
        // Backend MUST support licenseKey lookup.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseKey: licenseKey, // Sending Key
                prompt: finalPrompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Server error');
        }

        const resultText = data.result; // extracted text

        if (type === 'comment') {
            insertComment(postElement, resultText);
        } else {
            alert("Resumen:\n\n" + resultText);
        }

    } catch (err) {
        console.error(err);
        alert('Error IngenIA: ' + err.message);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

function insertComment(postElement, text) {
    // 1. Find Comment Box. Usually hidden until "Comment" button is clicked.
    // We can try to click the native "Comment" button first to open the box.
    const commentActionBtn = postElement.querySelector('.comment-button') ||
        postElement.querySelector('button[aria-label*="Comment"]');

    if (commentActionBtn) commentActionBtn.click();

    // Wait a bit for React to render the box
    setTimeout(() => {
        // Selector for the editor
        const editor = postElement.querySelector('.ql-editor') ||
            postElement.querySelector('div[contenteditable="true"]');

        if (editor) {
            editor.focus();

            // React 16+ input simulation requires setting value property descriptor or execCommand
            // For contenteditable, document.execCommand('insertText') is most reliable for "typing".
            document.execCommand('insertText', false, text);

            // Trigger generic input event just in case
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.error("IngenIA: Could not find comment editor.");
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(text).then(() => {
                alert('Comentario copiado al portapapeles (No se encontró la caja de texto).');
            });
        }
    }, 500);
}
