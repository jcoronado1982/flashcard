// src/features/flashcards/Flashcard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Flashcard.module.css'; // Importa el CSS Module

const API_URL = 'http://127.0.0.1:8000';
const audioPlayer = new Audio();

// --- PROP NUEVA 'setIsAudioLoading' AÑADIDA AQUÍ ---
function Flashcard({ cardData, onOpenIpaModal, setAppMessage, updateCardImagePath, currentDeckName, setIsAudioLoading }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true); // Mantiene estado original
    const [imageUrl, setImageUrl] = useState(null);
    const [blurredState, setBlurredState] = useState({});
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [activeAudioText, setActiveAudioText] = useState(null);
    const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

    // Ref para contar intentos de imagen (Sin cambios)
    const imageAttemptCounter = useRef(0);
    const MAX_IMAGE_ATTEMPTS = 3;
    const IMAGE_RETRY_DELAY = 5000; // 5 segundos

    // --- generateAndLoadImage (SIN CAMBIOS) ---
    const generateAndLoadImage = useCallback(async () => {
        if (!cardData) return;
        if (imageAttemptCounter.current >= MAX_IMAGE_ATTEMPTS) {
            setAppMessage({ text: 'Falló la generación de imagen.', isError: true });
            setIsImageLoading(false);
            setImageUrl(null);
            return;
        }
        imageAttemptCounter.current += 1;
        if (!isImageLoading) setIsImageLoading(true);
        setAppMessage({ text: `⏳ Generando imagen... (Intento ${imageAttemptCounter.current}/${MAX_IMAGE_ATTEMPTS})`, isError: false });
        try {
            const def = cardData.definitions[0];
            const prompt = `Generate a single, clear, educational illustration for the phrasal verb "${cardData.name}" meaning "${def.meaning}". Context: "${def.usage_example}". Style: Photorealistic, bright, daylight. No text or labels.`;
            const response = await fetch(`${API_URL}/api/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index: cardData.id,
                    def_index: 0,
                    prompt,
                    deck: currentDeckName,
                    force_generation: cardData.force_generation
                })
            });
            if (!response.ok) {
                if (response.status === 404 && !cardData.force_generation) {
                    setAppMessage({ text: 'Imagen no encontrada (generación desactivada).', isError: false });
                    setImageUrl(null);
                    setIsImageLoading(false);
                    return;
                }
                const errorData = await response.json().catch(() => ({ detail: 'Error desconocido en API de imagen.' }));
                throw new Error(errorData.detail || `Error ${response.status} en API de imagen.`);
            }
            const data = await response.json();
            if (!data || !data.path) {
                throw new Error("Respuesta de API válida pero sin ruta de imagen.");
            }
            const newImagePath = `${API_URL}${data.path}?t=${Date.now()}`;
            updateCardImagePath(cardData.id, data.path);
            setImageUrl(newImagePath);
            setAppMessage({ text: '¡Imagen cargada!', isError: false });
            setIsImageLoading(false);
        } catch (error) {
            console.error(`Intento ${imageAttemptCounter.current} de imagen fallido:`, error);
            setImageUrl(null);
            if (imageAttemptCounter.current < MAX_IMAGE_ATTEMPTS) {
                setTimeout(generateAndLoadImage, IMAGE_RETRY_DELAY);
            } else {
                setAppMessage({ text: `Error de imagen: ${error.message}`, isError: true });
                setIsImageLoading(false);
            }
        }
    }, [cardData, currentDeckName, setAppMessage, updateCardImagePath]); // Quitada isImageLoading de deps


    // --- useEffect (SIN CAMBIOS) ---
    useEffect(() => {
        if (!cardData) return;
        setIsFlipped(false);
        setIsImageLoading(true);
        setImageUrl(null);
        setBlurredState(cardData.definitions ? cardData.definitions.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}) : {});
        setActiveAudioText(null);
        setHighlightedWordIndex(-1);
        setAppMessage({ text: '', isError: false });
        imageAttemptCounter.current = 0; // Resetear contador al cambiar tarjeta

        if (cardData.imagePath) {
            const fullPath = `${API_URL}${cardData.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                setImageUrl(fullPath);
                setIsImageLoading(false);
            };
            img.onerror = () => {
                console.warn(`Error al cargar ${fullPath}. Llamando a generateAndLoadImage...`);
                // NO llamar a updateCardImagePath(null) aquí para evitar bucle
                generateAndLoadImage();
            };
        } else {
            generateAndLoadImage();
        }
    }, [cardData, updateCardImagePath, generateAndLoadImage]);


    // --- FUNCIÓN playAudio (MODIFICADA CON REINTENTOS Y BLOQUEO) ---
    const playAudio = useCallback(async (text) => {
        if (!text) return;
        if (isAudioPlaying && audioPlayer.src) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            audioPlayer.ontimeupdate = null;
            audioPlayer.onended = null;
            audioPlayer.onerror = null;
             // Revocar URL anterior si existe y es un blob URL
             if (audioPlayer.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioPlayer.src);
            }
        }
        setHighlightedWordIndex(-1);
        setActiveAudioText(text);
        setIsAudioPlaying(true); // Estado visual local

        // --- INICIO LÓGICA DE BLOQUEO Y REINTENTO ---
        setIsAudioLoading(true); // ¡Bloquea los controles de App!
        const MAX_ATTEMPTS = 3;
        const RETRY_DELAY = 5000; // 5 segundos
        let response;
        let success = false;
        let audioUrl = null;
        // --- FIN LÓGICA DE BLOQUEO Y REINTENTO ---

        try {
            // --- INICIO BUCLE DE REINTENTO ---
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    setAppMessage({ text: `⏳ Cargando audio... (Intento ${attempt}/${MAX_ATTEMPTS})`, isError: false });

                    response = await fetch(`${API_URL}/api/synthesize-speech`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text,
                           // voice_name: "Aoede", // O la voz que prefieras
                            voice_name: "Puck", // O la voz que prefieras
                            model_name: "gemini-2.5-pro-tts", // O el modelo
                            deck: currentDeckName // Pasar el deck actual
                        })
                    });

                    if (response.ok) {
                        success = true;
                        break; // ¡Éxito! Sal del bucle.
                    }

                    // Si no fue .ok, es un error de API
                    const errorData = await response.json().catch(() => ({ detail: `Error HTTP ${response.status}` }));
                    throw new Error(errorData.detail || 'Error de API');

                } catch (networkOrApiError) {
                    // Atrapa errores de red (fetch failed) O el 'throw' de arriba
                    console.warn(`Intento ${attempt} de audio fallido: ${networkOrApiError.message}`);
                    if (attempt === MAX_ATTEMPTS) {
                        // Si es el último intento, relanza el error para el 'catch' principal
                        throw networkOrApiError;
                    }
                    // Espera antes del siguiente intento
                    setAppMessage({ text: `Reintentando audio en ${RETRY_DELAY/1000}s... (Intento ${attempt}/${MAX_ATTEMPTS})`, isError: true });
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }
            // --- FIN BUCLE DE REINTENTO ---

            if (!success) {
                // Si todos los intentos fallaron
                throw new Error('Fallaron todos los intentos de carga de audio.');
            }

            // Si tuvimos éxito
            const audioBlob = await response.blob();
            audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            const words = text.trim().split(/\s+/);
            const SYNC_OFFSET = 0.15;

            // Listener para resaltar palabras mientras suena
            audioPlayer.ontimeupdate = () => {
                const { duration, currentTime } = audioPlayer;
                if (!duration || !isFinite(duration) || words.length === 0) return;
                const timePerWord = duration / words.length;
                if (!timePerWord || !isFinite(timePerWord)) return;
                const currentWordIdx = Math.min(words.length - 1, Math.max(0, Math.floor((currentTime + SYNC_OFFSET) / timePerWord)));
                // Solo actualizar si el índice cambió
                setHighlightedWordIndex(prevIndex => prevIndex !== currentWordIdx ? currentWordIdx : prevIndex);
            };

            // Listener para cuando termina el audio
            audioPlayer.onended = () => {
                setIsAudioPlaying(false);
                setAppMessage({ text: 'Audio finalizado.', isError: false });
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setHighlightedWordIndex(-1);
                setActiveAudioText(null);
                audioPlayer.ontimeupdate = null;
                audioPlayer.onerror = null;
                setIsAudioLoading(false); // ¡Desbloquea los controles!
            };

            // Listener para errores del elemento <audio>
            audioPlayer.onerror = (e) => {
                console.error("Error del elemento Audio:", e);
                setIsAudioPlaying(false);
                setAppMessage({ text: 'Error al reproducir audio.', isError: true });
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setHighlightedWordIndex(-1);
                setActiveAudioText(null);
                audioPlayer.ontimeupdate = null;
                audioPlayer.onended = null;
                setIsAudioLoading(false); // ¡Desbloquea los controles!
            };

            // Intenta reproducir
            try {
                await audioPlayer.play();
                setAppMessage({ text: '▶️ Reproduciendo...', isError: false });
            } catch (playError) {
                console.error("Error al llamar a audioPlayer.play():", playError);
                if(audioPlayer.onerror) audioPlayer.onerror(playError); // Llama al handler de error manualmente
            }

        } catch (error) { // Error final del fetch (después de reintentos)
            console.error("Error en playAudio (final):", error);
            setAppMessage({ text: `Error de audio: ${error.message}`, isError: true });
            setIsAudioPlaying(false);
            setActiveAudioText(null);
            setHighlightedWordIndex(-1);
            // Limpia listeners por si acaso
            audioPlayer.ontimeupdate = null;
            audioPlayer.onended = null;
            audioPlayer.onerror = null;
            setIsAudioLoading(false); // ¡Desbloquea los controles!
             // Limpiar URL si se creó antes del error final
            if (audioUrl && audioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(audioUrl);
            }
        }
    // Dependencias actualizadas para incluir setIsAudioLoading y currentDeckName
    }, [isAudioPlaying, setAppMessage, setIsAudioLoading, currentDeckName]);


    if (!cardData) return <div className={styles.flashcardContainer}>Cargando datos...</div>; // Mensaje claro

    const toggleBlur = (index) => setBlurredState(prev => ({ ...prev, [index]: !prev[index] }));

    // --- RENDERIZADO JSX (SIN CAMBIOS) ---
    return (
        <div className={styles.flashcardContainer}>
            <div className={`${styles.card} ${isFlipped ? styles.flipped : ''}`} onClick={() => setIsFlipped(p => !p)}>

                {/* --- CARD FRONT --- */}
                <div className={styles.cardFront}>
                    <button className={styles.soundButton} onClick={(e) => { e.stopPropagation(); playAudio(cardData.name); }}>🔊</button>
                    <h2 className={styles.name}>
                        {cardData.name?.split(' ').map((word, index) => (
                            <span key={index} className={activeAudioText === cardData.name && highlightedWordIndex === index ? styles.highlightedWord : ''}>
                                {word}{' '}
                            </span>
                        ))}
                    </h2>
                    <div className={styles.phoneticContainer}>
                        <p className={styles.phonetic}>{cardData.phonetic}</p>
                        <button className={styles.ipaChartBtn} onClick={(e) => { e.stopPropagation(); onOpenIpaModal(); }}>📖</button>
                    </div>
                    <div className={styles.allExamplesContainer}>
                        <ul>
                            {cardData.definitions?.map((def, defIndex) => (
                                <li key={defIndex}>
                                    <button onClick={(e) => { e.stopPropagation(); playAudio(def.usage_example); }}>🔊</button>
                                    <div className={blurredState[defIndex] ? styles.blurredText : ''} onClick={(e) => { e.stopPropagation(); toggleBlur(defIndex); }}>
                                        {def.usage_example?.split(' ').map((word, wordIndex) => (
                                            <span key={wordIndex} className={activeAudioText === def.usage_example && highlightedWordIndex === wordIndex ? styles.highlightedWord : ''}>
                                                {word}{' '}
                                            </span>
                                        ))}
                                    </div>
                                    {!blurredState[defIndex] && (
                                        <span className={styles.customTooltip}>{def.pronunciation_guide_es}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className={styles.imagePlaceholder}>
                        {isImageLoading ? (
                            <img src="/loading.gif" alt="Cargando..." style={{ width: '100px', height: '100px' }} />
                        ) : (
                            imageUrl ? (
                                <img className={`${styles.image} ${styles.imageVisible}`} src={imageUrl} alt={cardData.name || 'Flashcard image'} />
                            ) : (
                                <div className={styles.noImagePlaceholder}>Imagen no disponible</div>
                            )
                        )}
                    </div>
                </div>

                {/* --- CARD BACK --- */}
                <div className={styles.cardBack}>
                    {cardData.definitions?.map((def, index) => (
                        <div key={index} className={styles.definitionBlockBack}>
                            <p className={styles.meaningSentence}>
                                <span className={styles.phrasalVerbBack}>{cardData.name}</span> significa <strong className={styles.meaningBack}>{def.meaning}</strong>
                            </p>
                            <p
                                className={styles.usageExampleEn}
                                dangerouslySetInnerHTML={{ __html: `"${def.usage_example ? def.usage_example.replace(new RegExp(`\\b(${cardData.name})\\b`, 'gi'), `<strong>$1</strong>`) : ''}"` }}
                            />
                            {def.alternative_example && (
                                <p className={styles.alternativeExample}><em>Alternativa:</em> "{def.alternative_example}"</p>
                            )}
                            <p className={styles.usageExampleEs}>{def.usage_example_es}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Flashcard;