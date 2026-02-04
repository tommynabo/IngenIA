// --- Constants ---
const OBSERVER_TARGET = document.body;
// Wrapper typically used by LinkedIn feed updates
const POST_SELECTOR = '.feed-shared-update-v2, div[data-urn], .occludable-update';
// New target: The bar with "100 likes - 20 comments"
const DETAILS_SELECTOR = '.social-details-social-counts, .feed-shared-social-counts, .social-details-social-activity';
// Fallback: Action bar if counts are missing (e.g. 0 likes/comments)
const ACTION_BAR_SELECTOR = '.feed-shared-social-action-bar, .social-actions-button-bar, .comment-social-action-bar, .feed-shared-social-actions';
const TEXT_SELECTOR = '.feed-shared-update-v2__description, .update-components-text, .feed-shared-text-view, .feed-shared-inline-show-more-text';
const AUTHOR_SELECTOR = '.update-components-actor__name, .feed-shared-actor__name, .update-components-actor__title';

// --- Comment Selectors ---
const COMMENT_SELECTOR = '.comments-comment-item, .feed-shared-comment-item, article.comments-comment-item';
const COMMENT_ACTIONS_SELECTOR = '.comments-comment-social-bar__actions, .feed-shared-comment-social-bar__actions, .social-action-bar';
const COMMENT_TEXT_SELECTOR = '.comments-comment-item__main-content, .feed-shared-comment-item__comment-content, .comments-comment-item-content-body';
const COMMENT_AUTHOR_SELECTOR = '.comments-post-meta__name-text, .comments-comment-meta__description-title';

// --- State ---
const INJECTED_ATTR = 'data-ingenia-injected';

// --- Observer ---
const observer = new MutationObserver((mutations) => {
    // Throttled scan or just scan on every mutation if performance allows. 
    scanAndInject();
});

observer.observe(OBSERVER_TARGET, { childList: true, subtree: true });

// Initial scan
scanAndInject();
// Run regularly to handle infinite scroll (Standard feed behavior)
setInterval(scanAndInject, 1500);

function scanAndInject() {
    // Buttons for Posts
    injectPostButtons();
    // Buttons for Comments
    injectCommentButtons();
}

// --- Logic for Posts (Summarize / Comment) ---
function injectPostButtons() {
    const posts = document.querySelectorAll(POST_SELECTOR);

    posts.forEach(post => {
        if (post.getAttribute(INJECTED_ATTR) === 'true') return;

        // STRATEGY 1: Social Counts Bar (Best for Single Post / High Engagement)
        const countsBar = post.querySelector(DETAILS_SELECTOR);

        if (countsBar) {
            injectButtons(countsBar, post, false); // false = not specific row
            post.setAttribute(INJECTED_ATTR, 'true');
            return;
        }

        // STRATEGY 2: Fallback for Feedback (Dedicated Row)
        // If we can't find the counts bar, we create our own row at the bottom.
        // We look for the action bar just to know WHERE to insert (after it).
        const actionBar = post.querySelector(ACTION_BAR_SELECTOR);

        if (actionBar) {
            // Create a dedicated footer row
            const feedRow = document.createElement('div');
            feedRow.className = 'ingenia-feed-row';

            // Insert AFTER the action bar
            if (actionBar.parentNode) {
                // actionBar.parentNode.insertBefore(feedRow, actionBar.nextSibling); 
                // Using insertBefore nextSibling is safer than append if there are other footer items
                actionBar.insertAdjacentElement('afterend', feedRow);

                injectButtons(feedRow, post, true); // true = is dedicated row
                post.setAttribute(INJECTED_ATTR, 'true');
            }
        }
    });
}

// --- Logic for Comments (Reply Pencil) ---
function injectCommentButtons() {
    // Strategy A: Find specific buttons (Best native feel)
    const allButtons = document.querySelectorAll('button, .artdeco-button');
    allButtons.forEach(btn => {
        if (btn.dataset.ingeniaHandled) return;

        const rawText = btn.innerText || "";
        const text = rawText.toLowerCase().trim();
        const label = (btn.getAttribute('aria-label') || "").toLowerCase();
        const spanText = btn.querySelector('.artdeco-button__text') ? btn.querySelector('.artdeco-button__text').innerText.toLowerCase().trim() : "";

        const isReply = text === 'responder' || text === 'reply' ||
            spanText === 'responder' || spanText === 'reply' ||
            label.includes('reply to') || label.includes('responder a') ||
            label === 'responder' || label === 'reply';

        if (isReply) {
            const commentItem = btn.closest(COMMENT_SELECTOR) ||
                btn.closest('.feed-shared-comment-item') ||
                btn.closest('article');

            if (commentItem) {
                injectReplyButtonDirectly(btn, commentItem);
                btn.dataset.ingeniaHandled = 'true';
                // Mark comment as handled too so Strategy B doesn't double up
                commentItem.setAttribute(INJECTED_ATTR, 'true');
            }
        }
    });

    // Strategy B: Iterate comments directly (Fallback for missed buttons)
    const comments = document.querySelectorAll(COMMENT_SELECTOR);
    comments.forEach(comment => {
        if (comment.hasAttribute(INJECTED_ATTR)) return;

        // Try to inject in the meta/header area
        const metaArea = comment.querySelector('.comments-comment-meta') ||
            comment.querySelector('.feed-shared-comment-meta') ||
            comment.querySelector('.comments-comment-item__main-content'); // Worst case fallback to content

        if (metaArea) {
            const iaBtn = createButton('✏️', '', () => handleAction(comment, 'reply', iaBtn));
            iaBtn.className = 'ingenia-btn-mini ingenia-fallback-reply';
            iaBtn.title = "Generar respuesta (Fallback)";
            iaBtn.style.marginLeft = "8px";
            iaBtn.style.verticalAlign = "middle";

            // Append to header/meta
            metaArea.appendChild(iaBtn);
            comment.setAttribute(INJECTED_ATTR, 'true');
        }
    });
}

function injectReplyButtonDirectly(referenceBtn, commentContext) {
    // Create mini button
    const iaBtn = createButton('✏️', '', () => handleAction(commentContext, 'reply', iaBtn));
    iaBtn.className = 'ingenia-btn-mini';
    iaBtn.title = "Generar respuesta con IA";

    // Inject specifically AFTER the reference button (The Reply button)
    referenceBtn.insertAdjacentElement('afterend', iaBtn);
}

function injectButtons(container, postElement) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'ingenia-btn-container-small';

    // Style: Inline flex to sit nicely in the bar
    btnContainer.style.cssText = 'display: inline-flex; gap: 6px; margin-left: auto; align-items: center; order: 999;';

    // Summarize
    const btnSum = createButton('📝', 'Resumir', () => handleAction(postElement, 'summarize', btnSum));
    // Comment
    const btnComment = createButton('⚡️', 'Comentar', () => handleAction(postElement, 'comment', btnComment));

    btnContainer.appendChild(btnSum);
    btnContainer.appendChild(btnComment);
    container.appendChild(btnContainer);
}

function createButton(icon, text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'ingenia-btn';
    // Use flex layout inside if needed, but innerHTML is fine for now.
    btn.innerHTML = `<span class="ingenia-icon">${icon}</span> <span class="ingenia-text">${text}</span>`;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// --- Action Handler ---
async function handleAction(element, type, button) {
    // 1. Auth Check
    let licenseKey;
    try {
        const store = await chrome.storage.sync.get(['licenseKey']);
        licenseKey = store.licenseKey;
    } catch (e) {
        showToast("⚠️ Extensión desconectada. Recarga la página.");
        return;
    }

    if (!licenseKey) {
        showModal('Falta Clave', 'Configura tu clave en la extensión.');
        return;
    }

    // 2. Extract Text
    let selector = TEXT_SELECTOR;
    if (type === 'reply') selector = COMMENT_TEXT_SELECTOR;

    // Attempt standard + fallback
    const textNode = element.querySelector(selector) || element.innerText;
    let text = "";
    if (typeof textNode === 'string') text = textNode;
    else if (textNode) text = textNode.innerText;

    if (!text || text.length < 5) {
        // Retry parent if text is empty (sometimes structure varies)
        text = element.innerText;
    }

    text = text.trim();
    if (!text) {
        showToast("❌ No encontré texto.");
        return;
    }

    // 3. UI Loading
    const oldContent = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;

    // 4. Prompt Logic
    let promptPrefix = "";
    if (type === 'summarize') promptPrefix = "Resume este post de LinkedIn en español (bullet points): ";
    if (type === 'comment') promptPrefix = "Genera un comentario profesional y cercano para este post: ";
    if (type === 'reply') promptPrefix = "Genera una respuesta breve y amable para este comentario: ";

    const finalPrompt = promptPrefix + "\n\n" + text;

    try {
        const response = await sendMessage({
            action: 'generate_comment',
            licenseKey: licenseKey,
            prompt: finalPrompt
        });

        if (response.success) {
            const actions = [
                { label: 'Copiar', primary: true, onClick: () => copyText(response.result) }
            ];

            // Add "Insert" button if we can find an editor
            if (type === 'comment' || type === 'reply') {
                actions.unshift({
                    label: 'Insertar',
                    primary: true,
                    onClick: () => insertText(element, response.result)
                });
            }

            showModal('Resultado IA', response.result, actions);
        } else {
            showModal('Error', response.error);
        }
    } catch (err) {
        showModal('Error Critico', err.message);
    } finally {
        button.innerHTML = oldContent;
        button.disabled = false;
    }
}

function sendMessage(payload) {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage(payload, r => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError.message);
                else resolve(r);
            });
        } catch (e) { reject("Contexto perdido. Recarga (F5)."); }
    });
}

// --- Utils ---
function copyText(txt) {
    navigator.clipboard.writeText(txt);
    showToast("¡Copiado!");
}

function insertText(context, text) {
    // Strategy: Find closest 'reply' or 'comment' button to open editor, then find editor.
    // This is complex on LinkedIn. Best effort:
    // 1. If it's a post, click 'Comment' button.
    // 2. If it's a reply, click 'Reply' button.

    let triggerBtn = context.querySelector('.comment-button') || // Post comment
        context.querySelector('.reply-action') ||   // Comment reply
        context.querySelector('button[aria-label*="Reply"]');

    if (triggerBtn) triggerBtn.click();

    setTimeout(() => {
        const editor = document.activeElement.classList.contains('ql-editor') ?
            document.activeElement :
            context.querySelector('.ql-editor');

        if (editor) {
            editor.focus();
            document.execCommand('insertText', false, text);
        } else {
            copyText(text);
            showToast("No encontré el editor. Texto copiado.");
        }
    }, 500);
}

// --- UI ---
function showToast(msg) {
    const d = document.createElement('div');
    d.innerText = msg;
    d.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#333;color:#fff;padding:10px;border-radius:5px;z-index:99999;';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3000);
}

function showModal(title, content, btns) {
    let ol = document.querySelector('.ingenia-overlay');
    if (ol) ol.remove();

    ol = document.createElement('div');
    ol.className = 'ingenia-overlay';
    ol.innerHTML = `
    <div class="ingenia-modal-box">
        <div class="header">
            <h3>${title}</h3>
            <button onclick="this.closest('.ingenia-overlay').remove()">×</button>
        </div>
        <div class="body">${formatContent(content)}</div>
        <div class="footer" id="modal-footer"></div>
    </div>`;

    const ft = ol.querySelector('#modal-footer');
    btns.forEach(b => {
        const btn = document.createElement('button');
        btn.innerText = b.label;
        btn.onclick = () => { if (b.onClick) b.onClick(); ol.remove(); };

        // Premium Button Styling (Inline to ensure it overrides)
        if (b.primary) {
            btn.style.cssText = "background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;";
            btn.onmouseover = () => btn.style.background = "#2563eb";
            btn.onmouseout = () => btn.style.background = "#3b82f6";
        } else {
            btn.style.cssText = "background: transparent; color: #94a3b8; border: 1px solid #475569; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;";
            btn.onmouseover = () => { btn.style.background = "#334155"; btn.style.color = "white"; };
            btn.onmouseout = () => { btn.style.background = "transparent"; btn.style.color = "#94a3b8"; };
        }

        ft.appendChild(btn);
    });

    document.body.appendChild(ol);
}

// Helper for formatting
function formatContent(text) {
    // Simple bolding and paragraph breaks
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}
