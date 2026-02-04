// --- Floating Dashboard with SIMPLE Click Memory ---

// 1. INJECT STYLES
const css = `
#ingenia-dashboard {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 300px;
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    border: 1px solid #334155;
    z-index: 2147483647; 
    font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: ingeniaSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes ingeniaSlideIn { to { opacity: 1; transform: translateY(0); } }
.ingenia-header { display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
.ingenia-title { font-weight: 700; font-size: 14px; color: #f8fafc; display: flex; align-items: center; gap: 8px; }
.ingenia-status { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444; transition: all 0.3s; }
.ingenia-status.active { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
.ingenia-target { font-size: 12px; color: #94a3b8; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ingenia-actions { display: flex; gap: 8px; }
.ingenia-btn { flex: 1; border: none; border-radius: 6px; padding: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.ingenia-btn-secondary { background: rgba(255,255,255,0.05); color: #cbd5e1; border: 1px solid #475569; }
.ingenia-btn-secondary:hover { background: rgba(255,255,255,0.1); color: white; }
.ingenia-btn-primary { background: #0a66c2; color: white; }
.ingenia-btn-primary:hover { background: #004182; }
`;

function injectStyles() {
    if (document.getElementById('ingenia-styles')) return;
    const style = document.createElement('style');
    style.id = 'ingenia-styles';
    style.textContent = css;
    document.head.appendChild(style);
}

// 2. STATE - THE KEY TO SUCCESS
// We store the element the user last clicked on. Simple.
let lastClickedElement = null;

// 3. DASHBOARD
function createDashboard() {
    if (document.getElementById('ingenia-dashboard')) return;
    const div = document.createElement('div');
    div.id = 'ingenia-dashboard';
    div.innerHTML = `
        <div class="ingenia-header">
            <div class="ingenia-title">
                <span class="ingenia-status" id="ingenia-status-dot"></span>
                IngenIA Panel
            </div>
        </div>
        <div class="ingenia-target" id="ingenia-target-text">Haz clic en un post...</div>
        <div class="ingenia-actions">
            <button class="ingenia-btn ingenia-btn-secondary" id="btn-summarize">📝 Resumir</button>
            <button class="ingenia-btn ingenia-btn-primary" id="btn-comment">💬 Comentar</button>
        </div>
    `;
    document.body.appendChild(div);
    document.getElementById('btn-summarize').onclick = () => runAction('summarize');
    document.getElementById('btn-comment').onclick = () => runAction('comment');
}

// 4. CLICK MEMORY
// This is the simplest possible approach: record EVERY click.
function initClickMemory() {
    document.addEventListener('click', function (e) {
        // Ignore clicks on OUR dashboard
        if (e.target.closest('#ingenia-dashboard')) return;

        // Save the clicked element
        lastClickedElement = e.target;
        console.log("IngenIA: Click stored on:", lastClickedElement);

        // Try to show feedback
        const dot = document.getElementById('ingenia-status-dot');
        const txt = document.getElementById('ingenia-target-text');
        if (dot) { dot.classList.add('active'); dot.style.background = '#4ade80'; }
        if (txt) txt.innerText = "Post capturado ✓";

    }, true); // Capture phase to get ALL clicks
}

// 5. TEXT EXTRACTION - Walk up and around
function extractTextFromClick(el) {
    if (!el) return null;

    console.log("IngenIA: Extracting text starting from:", el);

    // Strategy 1: If the clicked element itself has lots of text
    if (el.innerText && el.innerText.length > 50) {
        return el.innerText;
    }

    // Strategy 2: Walk up the tree to find a big text container
    let current = el;
    let levels = 0;
    while (current && current.tagName !== 'BODY' && levels < 15) {
        // Check if this container has substantial text
        const text = current.innerText || "";
        if (text.length > 100) {
            console.log("IngenIA: Found text at level", levels, text.substring(0, 50) + "...");
            return text;
        }
        current = current.parentElement;
        levels++;
    }

    // Strategy 3: Search for text in siblings
    current = el.parentElement;
    if (current) {
        const text = current.innerText || "";
        if (text.length > 50) return text;
    }

    return null;
}

// 6. ACTION
async function runAction(type) {
    if (!lastClickedElement) {
        alert("⚠️ Primero haz clic en el post (en el texto o en 'Ver más').");
        return;
    }

    const btn = document.getElementById(type === 'summarize' ? 'btn-summarize' : 'btn-comment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // Extract text from last clicked position
    let text = extractTextFromClick(lastClickedElement);

    if (!text || text.length < 20) {
        alert("No pude extraer texto suficiente. Intenta hacer clic directamente en el texto del post.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    // Clean up
    text = text.replace(/ver más|see more|mostrar menos|show less/gi, "").trim();

    // Truncate if too long
    if (text.length > 3000) text = text.substring(0, 3000);

    const { licenseKey } = await chrome.storage.sync.get(['licenseKey']);
    if (!licenseKey) {
        alert("Configura tu licencia primero.");
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
    }

    const prompt = type === 'summarize'
        ? "Resume esto en español (bullet points): " + text
        : "Genera un comentario profesional y cercano para este post de LinkedIn: " + text;

    try {
        const res = await new Promise(resolve => chrome.runtime.sendMessage({
            action: 'generate_comment', licenseKey, prompt
        }, resolve));

        if (res && res.success) {
            navigator.clipboard.writeText(res.result);
            showModal(type === 'summarize' ? "Resumen" : "Comentario Sugerido", res.result);
        } else {
            alert("Error: " + (res?.error || "Respuesta vacía"));
        }
    } catch (e) {
        console.error(e);
        alert("Error de conexión con la extensión.");
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// --- MODAL ---
function showModal(title, text) {
    const existing = document.getElementById('ingenia-modal');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = 'ingenia-modal';
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999999;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);";
    div.innerHTML = `
        <div style="background:#1e293b;width:600px;max-width:90%;padding:25px;border-radius:12px;color:white;font-family:sans-serif;box-shadow:0 25px 50px rgba(0,0,0,0.5);border:1px solid #334155;">
            <h3 style="margin-top:0;font-size:18px;border-bottom:1px solid #334155;padding-bottom:10px;margin-bottom:15px;">${title}</h3>
            <div style="background:#0f172a;padding:20px;border-radius:8px;max-height:400px;overflow:auto;white-space:pre-wrap;line-height:1.6;color:#cbd5e1;font-size:15px;">${text}</div>
            <div style="text-align:right;margin-top:20px;">
                <button onclick="this.closest('#ingenia-modal').remove()" style="padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Cerrar (Copiado ✓)</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
}

// Start
injectStyles();
createDashboard();
initClickMemory();
console.log("IngenIA: Click Memory System Ready 🎯");
