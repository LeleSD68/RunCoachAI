
import { GoogleGenAI } from "@google/genai";

export const getGenAI = () => {
    // Safety check: ensure API key is present before instantiation
    if (!process.env.API_KEY) {
        throw new Error("API_KEY_MISSING");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const isAuthError = (e: any): boolean => {
    const msg = (e.message || '').toLowerCase();
    const status = e.status || e.code;
    
    return (
        status === 403 || 
        status === 400 && (msg.includes('key') || msg.includes('api')) || // Covers "API key expired", "API_KEY_INVALID"
        msg.includes('403') || 
        msg.includes('blocked') || 
        msg.includes('permission_denied') ||
        msg.includes('api key must be set')
    );
};

export const isRetryableError = (error: any): boolean => {
    const status = error?.status || error?.code;
    const errorMessage = (error?.message || '').toLowerCase();
    
    // Explicitly exclude Quota/Rate Limit errors from retries to fail fast and inform user
    if (status === 429 || status === 'RESOURCE_EXHAUSTED' || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        return false;
    }

    // Don't retry auth errors automatically in the loop, they need user intervention
    if (isAuthError(error) || errorMessage.includes('api key')) {
        return false;
    }

    return errorMessage.includes('overloaded') || errorMessage.includes('unavailable') || (status === 'UNAVAILABLE') || (status === 503);
};

export const getFriendlyErrorMessage = (error: any): string => {
    const msg = (error?.message || '').toLowerCase();
    const status = error?.status || error?.code;

    if (msg.includes('api_key_missing') || msg.includes('api key must be set')) {
        return "⚠️ Chiave API mancante. Selezionala per continuare.";
    }
    if (status === 429 || status === 'RESOURCE_EXHAUSTED' || msg.includes('quota')) {
        return "⚠️ Quota richieste esaurita. Riprova tra circa 1 minuto.";
    }
    if (isAuthError(error)) {
        return "⚠️ Errore di autenticazione API. Controlla la tua chiave.";
    }
    if (msg.includes('overloaded')) {
        return "⚠️ I server AI sono sovraccarichi. Riprova tra poco.";
    }
    return "⚠️ Si è verificato un errore di connessione.";
};

export async function ensureApiKey() {
    if (window.aistudio) {
        await window.aistudio.openSelectKey();
    }
}

export async function retryWithPolicy<T>(
    operation: () => Promise<T>, 
    handleTokenCount?: (count: number) => void
): Promise<T> {
    try {
        return await operation();
    } catch (e: any) {
        if (isAuthError(e) || e.message === 'API_KEY_MISSING' || e.message?.includes('API Key')) {
            console.warn("API Auth Error. Prompting for new key...", e);
            await ensureApiKey();
            // Retry once after key selection
            return await operation();
        }
        throw e;
    }
}
