// IngenIA V15 - SELECTOR FIX (Script Verified Running)
console.log("🚀 IngenIA V15: SCRIPT RUNNING [Yellow Banner Confirmed]");

// --- 1. VISUAL CHECK (Keep it, user liked seeing it) ---
const status = document.createElement('div');
status.innerText = "IngenIA V15: ONLINE";
status.style.cssText = "position:fixed; top:10px; right:10px; background:#00ff00; color:black; padding:8px 12px; z-index:999999; border-radius:4px; font-weight:bold; font-family:sans-serif; box-shadow:0 2px 10px rgba(0,0,0,0.2); transition:opacity 1s;";
document.body.appendChild(status);
setTimeout(() => { status.style.opacity = '0'; setTimeout(() => status.remove(), 1000) }, 5000);

// --- 2. BROAD SELECTORS (Brute Force) ---
// If specifics fail, we cast a wider net.
const SELECTORS = {
    // Post Container: Standard feed update OR any article OR any activity card
    POST: '.feed-shared-update-v2, article, [data-id], .occludable-update',

    // Action Bar: The flex container with buttons
    // We look for the class explicitly, OR any div that contains "Recomendar" button
    ACTION_BAR: '.feed-shared-social-action-bar, .social-actions-bar, .comment-social-bar',

    // Comment Item
    COMMENT: '.comments-comment-item, .feed-shared-comment-item, article.comment',

    // Reply Button
    REPLY_BTN: 'button.reply-btn, button[aria-label*="Responder"], button[aria-label*="Reply"]'
};

const PROCESSED = new WeakSet();

// --- 3. AGGRESSIVE SCAN LOOP ---
setInterval(scan, 1500); // Check every 1.5s

function scan() {
    // === POST BUTTONS ===
    // Find ALL Action Bars directly. 
    // This is safer than finding post -> then bar, which might fail if post selector is wrong.
    const actionBars = document.querySelectorAll(SELECTORS.ACTION_BAR);

    actionBars.forEach(bar => {
        if (PROCESSED.has(bar)) return;

        // Filter: Must be inside a main feed update (not a comment reply bar)
        // We check if it has a 'Recomendar' or 'Like' button inside
        if (!bar.innerText.match(/Recomendar|Like|Gustar/i)) {
            // Maybe it's a comment action bar?
            // Let's check if it's deeply nested in a comment
            if (bar.closest(SELECTORS.COMMENT)) return;
        }

        // If we contain "Responder" or "Reply", it might be a comment bar acting as a post bar
        if (bar.innerText.match(/Responder|Reply/i)) return;

        // OK, valid post bar
        PROCESSED.add(bar);

        // Inject!
        const group = document.createElement('div');
        group.className = 'ingenia-group';
        group.style.cssText = "display: inline-flex; align-items: center; margin-left: 5px;";

        // Buttons
        const btnS = createBtn('📝 Resumir', () => run(bar, 'summarize', btnS));
        const btnC = createBtn('⚡ Comentar', () => run(bar, 'comment', btnC));

        group.append(btnS, btnC);
        bar.appendChild(group);
    });

    // === RE-SCAN for missed bars using "Brute Text Search" ===
    // In case class names are obfuscated (artdeco-button etc)
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(div => {
        if (PROCESSED.has(div)) return;

        // Does this div contain exactly the text "Recomendar Comentar Compartir Enviar"?
        // It's a heavy check but guarantees finding the bar.
        if (div.innerText.length < 100 && div.innerText.includes('Recomendar') && div.innerText.includes('Comentar')) {
            if (div.querySelector('.ingenia-group')) return; // Already has our buttons
            if (div.closest(SELECTORS.COMMENT)) return; // Is comment

            PROCESSED.add(div);

            const group = document.createElement('div');
            group.className = 'ingenia-group'; // Marker
            group.style.cssText = "display: inline-flex; align-items: center; margin-left: 5px;";

            const btnS = createBtn('📝 Resumir', () => run(div, 'summarize', btnS));
            const btnC = createBtn('⚡ Comentar', () => run(div, 'comment', btnC));
            group.append(btnS, btnC);
            div.appendChild(group);
        }
    });

    // === COMMENT PENCILS ===
    // Find "Responder" buttons directly
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (PROCESSED.has(btn)) return;

        const txt = (btn.innerText || '').toLowerCase().trim();
        if (txt === 'responder' || txt === 'reply') {
            // Must be inside a comment
            const comment = btn.closest(SELECTORS.COMMENT) || btn.closest('article');
            if (!comment) return;

            PROCESSED.add(btn);

            // Check duplications nearby
            if (btn.nextElementSibling?.classList.contains('ingenia-pencil')) return;

            const pencil = document.createElement('button');
            pencil.className = 'ingenia-pencil';
            pencil.innerHTML = '✏️';
            pencil.style.cssText = "background:none; border:none; cursor:pointer; font-size:16px; margin-left:8px; vertical-align:middle;";
            pencil.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                run(comment, 'reply', pencil);
            }

            btn.parentNode.insertBefore(pencil, btn.nextSibling);
        }
    });
}

function createBtn(txt, cb) {
    const b = document.createElement('button');
    b.innerText = txt;
    b.style.cssText = "background:#0a66c2; color:white; border:none; border-radius:16px; padding:4px 10px; margin-left:5px; font-weight:600; font-size:13px; cursor:pointer;";
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); cb(); };
    return b;
}

// --- RUNNER ---
async function run(context, type, btn) {
    if (!chrome?.storage?.sync) return alert("Recarga la página");

    // License
    const k = await chrome.storage.sync.get('licenseKey');
    if (!k.licenseKey) return alert("Falta licencia");

    // Text
    let txt = '';
    // Clone and strip
    let clone = context.closest(SELECTORS.POST) || context.closest(SELECTORS.COMMENT) || context.parentElement;
    if (clone) {
        clone = clone.cloneNode(true);
        clone.querySelectorAll('button, .video, .comments-list').forEach(x => x.remove());
        txt = clone.innerText;
    }

    if (!txt || txt.length < 5) return alert("Texto no encontrado");

    const prompt = type === 'summarize' ? `Resume: ${txt}` : `Responde/Comenta: ${txt}`;

    const old = btn.innerText;
    btn.innerText = "⏳";

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey: k.licenseKey, prompt }, r => {
        btn.innerText = old;
        if (r?.success) showModal(r.result);
        else alert(r?.error || "Error");
    });
}

function showModal(t) {
    const d = document.createElement('div');
    d.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:999999; display:flex; justify-content:center; align-items:center;";
    d.innerHTML = `<div style="background:white; padding:20px; border-radius:10px; width:90%; max-width:500px;"><textarea style="width:100%; height:100px;">${t}</textarea><button onclick="this.parentElement.parentElement.remove()" style="margin-top:10px; padding:5px 10px;">Cerrar</button></div>`;
    document.body.appendChild(d);
}
