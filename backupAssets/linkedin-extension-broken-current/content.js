// IngenIA V28 - AGGRESSIVE INJECTION THAT WORKS

// Log immediately to verify it's running
window.ingenia_loaded = true;
console.log("🚀 INGENIA V28 LOADED - CHECKING EXECUTION");

// Create a visible indicator
const testDiv = document.createElement('div');
testDiv.id = 'ingenia-test-div';
testDiv.style.cssText = 'position: fixed; bottom: 10px; left: 10px; background: red; color: white; padding: 10px; z-index: 99999; font-size: 12px; border-radius: 4px;';
testDiv.textContent = 'IngenIA V28 Running';
document.documentElement.appendChild(testDiv);
setTimeout(() => testDiv.remove(), 10000);

const processed = new WeakSet();
let lastCheck = 0;

function tryInject() {
    const now = Date.now();
    if (now - lastCheck < 500) return; // Avoid spamming
    lastCheck = now;
    
    console.log("[V28] Checking for articles...");
    
    // Try to get articles
    const articles = document.querySelectorAll('article');
    console.log(`[V28] Found ${articles.length} articles`);
    
    if (articles.length === 0) return;
    
    articles.forEach((article, idx) => {
        try {
            if (processed.has(article)) return;
            
            // Check if visible
            const rect = article.getBoundingClientRect();
            if (rect.height === 0) return;
            
            console.log(`[V28] Processing article ${idx + 1}`);
            
            // Get buttons
            const buttons = article.querySelectorAll('button');
            console.log(`[V28] Found ${buttons.length} buttons in article ${idx + 1}`);
            
            if (buttons.length < 2) return;
            
            // Find parent of last button
            const lastBtn = buttons[buttons.length - 1];
            let parent = lastBtn.parentElement;
            
            if (!parent) return;
            
            // Check if already injected
            if (parent.querySelector('[data-ingenia-injected]')) {
                console.log(`[V28] Already injected in article ${idx + 1}`);
                return;
            }
            
            console.log(`[V28] Creating buttons for article ${idx + 1}`);
            
            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.setAttribute('data-ingenia-injected', 'true');
            wrapper.style.cssText = `
                display: inline-flex;
                gap: 12px;
                margin-left: 8px;
                vertical-align: middle;
            `;
            
            // Comment button
            const btn1 = document.createElement('button');
            btn1.type = 'button';
            btn1.setAttribute('aria-label', 'IngenIA Comment');
            btn1.style.cssText = `
                background: none !important;
                border: none !important;
                cursor: pointer;
                font-size: 16px;
                padding: 8px;
                margin: 0;
                border-radius: 4px;
                transition: background-color 0.2s;
            `;
            btn1.innerHTML = '💬';
            
            btn1.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleClick(article, 'comment');
            }, true);
            
            btn1.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(0,0,0,0.06)';
            });
            
            btn1.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            // Summary button
            const btn2 = document.createElement('button');
            btn2.type = 'button';
            btn2.setAttribute('aria-label', 'IngenIA Summary');
            btn2.style.cssText = `
                background: none !important;
                border: none !important;
                cursor: pointer;
                font-size: 16px;
                padding: 8px;
                margin: 0;
                border-radius: 4px;
                transition: background-color 0.2s;
            `;
            btn2.innerHTML = '📝';
            
            btn2.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleClick(article, 'summarize');
            }, true);
            
            btn2.addEventListener('mouseenter', function() {
                this.style.backgroundColor = 'rgba(0,0,0,0.06)';
            });
            
            btn2.addEventListener('mouseleave', function() {
                this.style.backgroundColor = 'transparent';
            });
            
            wrapper.appendChild(btn1);
            wrapper.appendChild(btn2);
            parent.appendChild(wrapper);
            
            processed.add(article);
            console.log(`[V28] ✅ INJECTED BUTTONS IN ARTICLE ${idx + 1}`);
            
        } catch (e) {
            console.error(`[V28] Error with article ${idx}:`, e.message);
        }
    });
}

// Listen for all possible events
document.addEventListener('scroll', tryInject, { passive: true });
document.addEventListener('click', () => setTimeout(tryInject, 100));
document.addEventListener('DOMContentLoaded', tryInject);
window.addEventListener('load', tryInject);

// Mutation observer - wait for document.body to exist
function startMutationObserver() {
    if (!document.body) {
        setTimeout(startMutationObserver, 100);
        return;
    }
    
    const observer = new MutationObserver(() => {
        setTimeout(tryInject, 300);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

startMutationObserver();

// Aggressive polling
setInterval(tryInject, 800);

// Try immediately
setTimeout(tryInject, 100);
setTimeout(tryInject, 500);
setTimeout(tryInject, 1000);

console.log("[V28] Setup complete");

function handleClick(article, type) {
    console.log(`[V28] Handling ${type} click`);
    
    chrome.storage.sync.get(['licenseKey'], (result) => {
        const key = result.licenseKey;
        if (!key) {
            alert('Por favor configura tu clave de licencia en el popup de IngenIA');
            return;
        }
        
        const text = extractText(article);
        if (!text) {
            alert('No se encontró contenido');
            return;
        }
        
        const prompt = type === 'comment'
            ? `Escribe un comentario profesional en español:\n\n${text}`
            : `Resume en 3 puntos en español:\n\n${text}`;
        
        alert('Generando respuesta...');
        
        chrome.runtime.sendMessage({
            action: 'generate_comment',
            licenseKey: key,
            prompt: prompt
        }, (response) => {
            if (response?.success && response?.result) {
                showModal(response.result);
            } else {
                alert('Error: ' + (response?.error || 'Unknown'));
            }
        });
    });
}

function extractText(article) {
    try {
        const clone = article.cloneNode(true);
        clone.querySelectorAll('button, script, style, img, video, svg').forEach(el => el.remove());
        return clone.innerText?.substring(0, 2000).trim() || '';
    } catch (e) {
        return '';
    }
}

function showModal(result) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999999;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 70vh;
        overflow-y: auto;
        padding: 20px;
    `;
    
    const text = document.createElement('div');
    text.style.cssText = 'white-space: pre-wrap; margin-bottom: 16px; line-height: 1.6; font-size: 14px;';
    text.textContent = result;
    
    const btns = document.createElement('div');
    btns.style.cssText = 'display: flex; gap: 8px;';
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copiar';
    copyBtn.style.cssText = 'padding: 10px 16px; background: #0a66c2; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(result);
        overlay.remove();
    };
    
    const insertBtn = document.createElement('button');
    insertBtn.textContent = '✅ Insertar';
    insertBtn.style.cssText = 'padding: 10px 16px; background: #31a24c; color: white; border: none; border-radius: 4px; cursor: pointer; flex: 1;';
    insertBtn.onclick = () => {
        const input = document.querySelector('textarea, [contenteditable="true"]');
        if (input) {
            if (input.tagName === 'TEXTAREA') input.value = result;
            else input.innerText = result;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        overlay.remove();
    };
    
    btns.appendChild(copyBtn);
    btns.appendChild(insertBtn);
    modal.appendChild(text);
    modal.appendChild(btns);
    overlay.appendChild(modal);
    document.documentElement.appendChild(overlay);
}
