// IngenIA V18 - DIRECT TEXT INJECTION
// No more class hunting. Find "Recomendar" text, inject next to it.
console.log("🚀 IngenIA V18: Direct Injection Active");

// --- DIAGNOSTIC BANNER ---
const banner = document.createElement('div');
banner.id = 'ing-banner';
banner.innerText = "✅ IngenIA V18";
banner.style.cssText = "position:fixed; top:10px; right:10px; background:lime; color:black; padding:5px 10px; z-index:999999; border-radius:4px; font-weight:bold; font-size:12px;";
document.body.appendChild(banner);
setTimeout(() => banner.remove(), 4000);

// --- STATE ---
const done = new WeakSet();

// --- FAST LOOP ---
setInterval(findAndInject, 500);

function findAndInject() {
    // =====================================================
    // STRATEGY: Find ANY element containing text "Recomendar"
    // Then inject buttons AFTER its parent row.
    // =====================================================

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent.trim();

        // === POST BUTTONS ===
        // We're looking for the "Recomendar" text node
        if (text === 'Recomendar' || text === 'Like') {
            const parent = node.parentElement;
            if (!parent || done.has(parent)) continue;

            // Skip if inside a comment
            if (parent.closest('.comments-comment-item')) continue;

            // Find the row/container - usually the parent's parent (button -> li -> ul)
            // Or the grandparent flex container
            let container = parent.parentElement?.parentElement || parent.parentElement;

            // Check if already injected
            if (container && !container.querySelector('.ing-btns')) {
                done.add(parent);

                // Create our buttons
                const group = document.createElement('span');
                group.className = 'ing-btns';
                group.style.cssText = 'display:inline-flex; align-items:center; margin-left:12px;';

                group.innerHTML = `
                    <button class="ing-sum" style="background:#0a66c2; color:white; border:none; border-radius:4px; padding:5px 12px; margin-right:6px; font-weight:600; font-size:13px; cursor:pointer;">📝 Resumir</button>
                    <button class="ing-com" style="background:#0a66c2; color:white; border:none; border-radius:4px; padding:5px 12px; font-weight:600; font-size:13px; cursor:pointer;">⚡ Comentar</button>
                `;

                // Get the post for context later
                const post = container.closest('.feed-shared-update-v2') || container.closest('article') || container.closest('[data-urn]');

                group.querySelector('.ing-sum').onclick = (e) => { e.stopPropagation(); runAction(post, 'summarize', e.target); };
                group.querySelector('.ing-com').onclick = (e) => { e.stopPropagation(); runAction(post, 'comment', e.target); };

                // Inject AT THE END of the container row
                container.appendChild(group);
                console.log('[V18] Injected post buttons');
            }
        }

        // === COMMENT PENCIL ===
        if (text === 'Responder' || text === 'Reply') {
            const parent = node.parentElement;
            if (!parent || done.has(parent)) continue;

            // Must be in a comment
            const comment = parent.closest('.comments-comment-item') || parent.closest('article');
            if (!comment) continue;

            // Check no duplicate
            if (parent.nextElementSibling?.classList?.contains('ing-pencil')) continue;

            done.add(parent);

            const pencil = document.createElement('span');
            pencil.className = 'ing-pencil';
            pencil.innerText = ' ✏️';
            pencil.style.cssText = 'cursor:pointer; font-size:14px; margin-left:6px;';
            pencil.onclick = (e) => { e.stopPropagation(); runAction(comment, 'reply', pencil); };

            parent.after(pencil);
            console.log('[V18] Injected pencil');
        }
    }
}

// --- ACTION ---
async function runAction(context, type, btn) {
    if (!chrome?.storage?.sync) return alert("Recarga la página");

    const { licenseKey } = await chrome.storage.sync.get('licenseKey');
    if (!licenseKey) return alert("Configura tu licencia");

    // Get text
    let txt = '';
    if (context) {
        const clone = context.cloneNode(true);
        clone.querySelectorAll('button, .comments-comment-list').forEach(n => n.remove());
        txt = clone.innerText.substring(0, 1000);
    }

    if (!txt) return alert("No hay texto");

    const prompt = type === 'summarize'
        ? `Resume brevemente: ${txt}`
        : type === 'reply'
            ? `Responde a este comentario: ${txt}`
            : `Comenta en este post: ${txt}`;

    const orig = btn.innerText;
    btn.innerText = '⏳';

    chrome.runtime.sendMessage({ action: 'generate_comment', licenseKey, prompt }, r => {
        btn.innerText = orig;
        if (r?.success) showModal(r.result, context);
        else alert(r?.error || 'Error');
    });
}

// --- MODAL ---
function showModal(text, context) {
    document.getElementById('ing-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ing-modal';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:999999; display:flex; justify-content:center; align-items:center;';

    overlay.innerHTML = `
        <div style="background:white; padding:20px; border-radius:12px; width:500px; max-width:90%; font-family:sans-serif;">
            <h3 style="margin-top:0;">Resultado</h3>
            <textarea id="ing-text" style="width:100%; height:120px; padding:10px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px;">${text}</textarea>
            <div style="display:flex; justify-content:flex-end; gap:8px;">
                <button id="ing-copy" style="padding:8px 16px; border:1px solid #0a66c2; background:white; color:#0a66c2; border-radius:20px; cursor:pointer;">Copiar</button>
                <button id="ing-insert" style="padding:8px 16px; background:#0a66c2; color:white; border:none; border-radius:20px; cursor:pointer;">Insertar</button>
                <button id="ing-close" style="padding:8px 16px; background:#eee; border:none; border-radius:20px; cursor:pointer;">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#ing-close').onclick = () => overlay.remove();
    overlay.querySelector('#ing-copy').onclick = () => {
        navigator.clipboard.writeText(text);
        overlay.querySelector('#ing-copy').innerText = '✓ Copiado';
    };
    overlay.querySelector('#ing-insert').onclick = () => {
        insertText(text, context);
        overlay.remove();
    };
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
}

function insertText(text, context) {
    // Find editor or open it
    let ed = document.querySelector('.ql-editor') || document.querySelector('[contenteditable="true"]');

    if (!ed && context) {
        const btn = [...context.querySelectorAll('button')].find(b =>
            b.innerText.toLowerCase().includes('responder') ||
            b.innerText.toLowerCase().includes('comentar')
        );
        if (btn) {
            btn.click();
            setTimeout(() => {
                ed = document.querySelector('.ql-editor') || document.activeElement;
                if (ed) { ed.focus(); document.execCommand('insertText', false, text); }
            }, 500);
            return;
        }
    }

    if (ed) { ed.focus(); document.execCommand('insertText', false, text); }
    else { navigator.clipboard.writeText(text); alert('Copiado al portapapeles'); }
}
