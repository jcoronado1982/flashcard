// src/features/flashcards/useAudioPlayback.js
import { useState, useCallback } from 'react';

const API_URL = 'http://127.0.0.1:8000';
const audioPlayer = new Audio();
const VOICE_POOL = ["Aoede", "Zephyr", "Charon", "Callirrhoe", "Iapetus", "Achernar", "Gacrux"];
const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 5000;
const SYNC_OFFSET = 0.15; // Ajuste de sincronización de resaltado

export function useAudioPlayback({ 
    setAppMessage, 
    setIsAudioLoading, 
    currentDeckName, 
    selectedTone, 
    verbName 
}) {
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [activeAudioText, setActiveAudioText] = useState(null);
    const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

    const playAudio = useCallback(async (originalText) => {
        if (!originalText) return;

        // Si ya está reproduciendo, detener y limpiar
        if (isAudioPlaying && audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            if (audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioPlayer.src);
            }
        }

        // Resetea estados al iniciar
        setHighlightedWordIndex(-1);
        setActiveAudioText(originalText);
        setIsAudioPlaying(true);
        setIsAudioLoading(true);

        const randomVoice = VOICE_POOL[Math.floor(Math.random() * VOICE_POOL.length)];
        const toneToSend = selectedTone?.trim().replace(/:$/, '') || '';
        let audioUrl = null;
        let success = false;
        let res;

        try {
            // --- Bucle de reintentos ---
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    setAppMessage({ text: `⏳ Generando audio... (${attempt}/${MAX_ATTEMPTS})`, isError: false });
                    
                    res = await fetch(`${API_URL}/api/synthesize-speech`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: originalText,
                            voice_name: randomVoice,
                            model_name: 'gemini-2.5-pro-tts',
                            deck: currentDeckName,
                            tone: toneToSend,
                            verb_name: verbName
                        })
                    });

                    if (res.ok) {
                        success = true;
                        break; // Éxito, sal del bucle
                    }
                    
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.detail || `Error ${res.status}`);

                } catch (err) {
                    if (attempt === MAX_ATTEMPTS) throw err; // Lanza error en el último intento
                    setAppMessage({ text: `Reintentando audio... (${attempt}/${MAX_ATTEMPTS})`, isError: true });
                    await new Promise((r) => setTimeout(r, RETRY_DELAY));
                }
            }

            if (!success) throw new Error('No se pudo generar el audio.');

            // --- Procesar y reproducir el audio ---
            const blob = await res.blob();
            audioUrl = URL.createObjectURL(blob);
            audioPlayer.src = audioUrl;

            const words = originalText.trim().split(/\s+/);

            // Handler para actualizar resaltado
            audioPlayer.ontimeupdate = () => {
                const { duration, currentTime } = audioPlayer;
                if (!duration || !isFinite(duration)) return;
                const tPerWord = duration / words.length;
                if (!tPerWord || !isFinite(tPerWord)) return;

                const idx = Math.min(
                    words.length - 1,
                    Math.floor((currentTime + SYNC_OFFSET) / tPerWord)
                );
                setHighlightedWordIndex((p) => (p !== idx ? idx : p));
            };

            // Handler para finalizar
            audioPlayer.onended = () => {
                setIsAudioPlaying(false);
                setAppMessage({ text: 'Audio finalizado.', isError: false });
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setHighlightedWordIndex(-1);
                setActiveAudioText(null);
                setIsAudioLoading(false);
            };

            await audioPlayer.play();
            setAppMessage({ text: '▶️ Reproduciendo...', isError: false });

        } catch (err) {
            console.error('Error en playAudio:', err);
            setAppMessage({ text: `Error: ${err.message}`, isError: true });
            setIsAudioPlaying(false);
            setActiveAudioText(null);
            setHighlightedWordIndex(-1);
            setIsAudioLoading(false);
            if (audioUrl && audioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(audioUrl);
            }
        }
    }, [
        isAudioPlaying, 
        setAppMessage, 
        setIsAudioLoading, 
        currentDeckName, 
        selectedTone, 
        verbName
    ]); // Dependencias del hook

    return {
        playAudio,
        isAudioPlaying,
        activeAudioText,
        highlightedWordIndex
    };
}