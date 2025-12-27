const API_URL = "https://ingen-ia.vercel.app/api/generate-comment";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "generate_comment" || request.action === "test_connection") {
        handleApiCall(request)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));

        return true; // Keep the message channel open for async response
    }
});

async function handleApiCall(request) {
    try {
        const { licenseKey, prompt } = request;

        if (!licenseKey) {
            throw new Error("Falta la Clave de Licencia.");
        }

        // For "test_connection", we might just want to ping or send a dummy prompt
        const finalPrompt = prompt || "Ping test connection";

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                licenseKey: licenseKey,
                prompt: finalPrompt
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server Error: ${response.status}`);
        }

        return { success: true, result: data.result };

    } catch (error) {
        console.error("IngenIA Background Error:", error);
        return { success: false, error: error.message };
    }
}
