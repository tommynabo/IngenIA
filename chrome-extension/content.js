// --- Configuration ---
const OBSERVER_TARGET = document.body;
// 'feed-shared-update-v2' is the main wrapper for a post
// 'occludable-update' is another common wrapper.
const POST_SELECTOR = '.feed-shared-update-v2';

const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view';

// Variables
let apiUrl = '';
let licenseKey = '';

// Load settings
chrome.storage.sync.get(['apiUrl', 'licenseKey'], (items) => {
    apiUrl = items.apiUrl || 'https://ingenia-app.vercel.app/api/generate-comment';
    licenseKey = items.licenseKey || '';

    if (!licenseKey) console.warn("IngenIA: No License Key found.");
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
        if (post.dataset.ingeniaInjected) return;

        // Attempt to find the specific action bar (Like, Comment, Share, Send)
        // Selector: .feed-shared-social-action-bar
        let actionBar = post.querySelector('.feed-shared-social-action-bar');

        // Some posts might have different structure.
        if (!actionBar) {
            // Fallback for detail view or different layouts
            actionBar = post.querySelector('.feed-shared-update-v2__action-bar');
        }

        if (!actionBar) return;

        injectButtons(actionBar, post);
        post.dataset.ingeniaInjected = 'true';
    });
}

function injectButtons(container, postElement) {
    // Create a container for OUR buttons
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container';

    // Btn 1
    const btnSummarize = document.createElement('button');
    btnSummarize.className = 'ingenia-btn';
    btnSummarize.innerHTML = '<span class="ingenia-icon">📝</span> Resumir';
    btnSummarize.onclick = (e) => {
        e.stopPropagation(); // Prevent opening post
        handleGenerate(postElement, 'summarize', btnSummarize);
    };

    // Btn 2
    const btnComment = document.createElement('button');
    btnComment.className = 'ingenia-btn';
    btnComment.innerHTML = '<span class="ingenia-icon">⚡️</span> Comentar';
    btnComment.onclick = (e) => {
        e.stopPropagation();
        handleGenerate(postElement, 'comment', btnComment);
    };

    btnContainer.appendChild(btnSummarize);
    btnContainer.appendChild(btnComment);

    // To avoid "messy" overlap, we append it to the END of the action bar.
    // Our CSS will handle exact positioning/margins.
    container.appendChild(btnContainer);
}

async function handleGenerate(postElement, type, button) {
    // Force reload settings just in case
    await new Promise(r => chrome.storage.sync.get(['licenseKey', 'apiUrl'], (items) => {
        licenseKey = items.licenseKey || '';
        apiUrl = items.apiUrl || apiUrl;
        r();
    }));

    if (!licenseKey) {
        alert('IngenIA: ¡Falta tu Clave!\n\nVe al Dashboard de IngenIA, copia tu "Clave de Licencia" y pégala en las opciones de la extensión.');
        return;
    }

    const textEl = postElement.querySelector(TEXT_SELECTOR);
    const postText = textEl ? textEl.innerText : '';

    if (!postText) {
        alert('IngenIA: No pude encontrar el texto del post. (Intenta abrir el post completo)');
        return;
    }

    const originalText = button.innerHTML;
    button.innerHTML = '<div class="ingenia-spinner"></div>';
    button.disabled = true;

    try {
        const promptPrefix = type === 'summarize' ? 'Resumen breve de este post: ' : '';
        const finalPrompt = promptPrefix + postText;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                licenseKey: licenseKey, // Using License Key again
                prompt: finalPrompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Server error');
        }

        const resultText = data.result;

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
    const commentActionBtn = postElement.querySelector('.comment-button') ||
        postElement.querySelector('button[aria-label*="Comment"]');

    if (commentActionBtn) commentActionBtn.click();

    setTimeout(() => {
        const editor = postElement.querySelector('.ql-editor') ||
            postElement.querySelector('div[contenteditable="true"]');

        if (editor) {
            editor.focus();
            document.execCommand('insertText', false, text);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.error("IngenIA: Could not find comment editor.");
            navigator.clipboard.writeText(text).then(() => {
                alert('Comentario copiado. (Pégalo manualmente)');
            });
        }
    }, 500);
}
