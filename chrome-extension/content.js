// --- Configuration ---
const OBSERVER_TARGET = document.body;
const POST_SELECTOR = '.feed-shared-update-v2';
const ACTION_BAR_SELECTOR = '.feed-shared-update-v2__control-menu-container, .feed-shared-social-action-bar, .feed-shared-update-v2__action-bar';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text';

// Variables
let apiUrl = '';
let email = '';

// Load settings
chrome.storage.sync.get(['apiUrl', 'email'], (items) => {
    apiUrl = items.apiUrl || 'https://ingenia-app.vercel.app/api/generate-comment';
    email = items.email || '';
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

        // Find action bar to inject next to
        // Trying slightly different selector to place it better
        const actionBar = post.querySelector('.feed-shared-social-action-bar');
        if (!actionBar) return;

        injectButtons(actionBar, post);
        post.dataset.ingeniaInjected = 'true';
    });
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container';

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

    // Append after the container to not break flex layout of action bar
    container.appendChild(btnContainer);
}

async function handleGenerate(postElement, type, button) {
    if (!email) {
        // CORRECT ERROR MESSAGE
        alert('IngenIA: Por favor configura tu EMAIL en el popup de la extensión.');
        return;
    }

    const textEl = postElement.querySelector(TEXT_SELECTOR);
    const postText = textEl ? textEl.innerText : '';

    if (!postText) {
        alert('IngenIA: No pude encontrar el texto del post.');
        return;
    }

    const originalText = button.innerHTML;
    button.innerHTML = '<div class="ingenia-spinner"></div>';
    button.disabled = true;

    try {
        const promptPrefix = type === 'summarize' ? 'Summarize this post for me: ' : '';
        const finalPrompt = promptPrefix + postText;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email, // Sending Email
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
                alert('Comentario copiado al portapapeles.');
            });
        }
    }, 500);
}
