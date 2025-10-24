// src/features/flashcards/Flashcard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Flashcard.module.css'; // Importa el CSS Module

const API_URL = 'http://127.0.0.1:8000';
const audioPlayer = new Audio();

// --- LISTA DE VOCES PARA SELECCIÓN ALEATORIA ---
/*
const VOICE_POOL = [
    "Aoede"
];
*/
const VOICE_POOL = [
    "Aoede", "Zephyr", "Charon", "Callirrhoe", 
    "Iapetus", "Achernar", "Gacrux"
];

// --- FIN LISTA DE VOCES ---

// --- CAMBIO 1: Añadir 'selectedTone' a las props ---
function Flashcard({ cardData, onOpenIpaModal, setAppMessage, updateCardImagePath, currentDeckName, setIsAudioLoading, selectedTone }) {
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

    // --- generateAndLoadImage (TU CÓDIGO ORIGINAL - SIN CAMBIOS) ---
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
    }, [cardData, currentDeckName, setAppMessage, updateCardImagePath]);


    // --- useEffect (TU CÓDIGO ORIGINAL - SIN CAMBIOS) ---
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


    // --- FUNCIÓN playAudio (MODIFICADA para usar selectedTone) ---
    const playAudio = useCallback(async (originalText) => { // Cambiado 'text' a 'originalText'
        if (!originalText) return;
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
        setActiveAudioText(originalText); // Usar originalText para highlight
        setIsAudioPlaying(true); // Estado visual local

        // --- LÓGICA DE SELECCIÓN ALEATORIA DE VOZ (COMO ESTABA ANTES DE LOS CAMBIOS) ---
        const randomVoice = VOICE_POOL[Math.floor(Math.random() * VOICE_POOL.length)];
        
        // --- CAMBIO 2: USAR selectedTone ---
        // Concatenamos el tono seleccionado con el texto original para el envío
        const textToSend = selectedTone + originalText; 
        // --- FIN CAMBIO 2 ---

        // (Lógica de bloqueo y reintentos SIN CAMBIOS)
        setIsAudioLoading(true); // ¡Bloquea los controles de App!
        const MAX_ATTEMPTS = 3;
        const RETRY_DELAY = 5000; // 5 segundos
        let response;
        let success = false;
        let audioUrl = null;

        try {
            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    setAppMessage({ text: `⏳ Cargando audio... (Intento ${attempt}/${MAX_ATTEMPTS})`, isError: false });

                    response = await fetch(`${API_URL}/api/synthesize-speech`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            // --- CAMBIO 3: ENVIAR textToSend (CON TONO) ---
                            text: textToSend,
                            // --- FIN CAMBIO 3 ---
                            voice_name: randomVoice, // Voz aleatoria
                            model_name: "gemini-2.5-pro-tts",
                            deck: currentDeckName // Pasar el deck actual
                        })
                    });

                    if (response.ok) { success = true; break; }
                    const errorData = await response.json().catch(() => ({ detail: `Error HTTP ${response.status}` }));
                    throw new Error(errorData.detail || 'Error de API');

                } catch (networkOrApiError) {
                    console.warn(`Intento ${attempt} de audio fallido: ${networkOrApiError.message}`);
                    if (attempt === MAX_ATTEMPTS) { throw networkOrApiError; }
                    setAppMessage({ text: `Reintentando audio en ${RETRY_DELAY/1000}s... (Intento ${attempt}/${MAX_ATTEMPTS})`, isError: true });
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                }
            }

            if (!success) { throw new Error('Fallaron todos los intentos de carga de audio.'); }

            const audioBlob = await response.blob();
            audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            // IMPORTANTE: Usamos originalText para el split de las palabras, NO textToSend (para el highlight)
            const words = originalText.trim().split(/\s+/); 
            const SYNC_OFFSET = 0.15;

            audioPlayer.ontimeupdate = () => { /* ... lógica highlight ... */
                 const { duration, currentTime } = audioPlayer;
                 if (!duration || !isFinite(duration) || words.length === 0) return;
                 const timePerWord = duration / words.length;
                 if (!timePerWord || !isFinite(timePerWord)) return;
                 const currentWordIdx = Math.min(words.length - 1, Math.max(0, Math.floor((currentTime + SYNC_OFFSET) / timePerWord)));
                 setHighlightedWordIndex(prevIndex => prevIndex !== currentWordIdx ? currentWordIdx : prevIndex);
            };
            audioPlayer.onended = () => { /* ... lógica onended ... */
                setIsAudioPlaying(false); setAppMessage({ text: 'Audio finalizado.', isError: false }); if (audioUrl) URL.revokeObjectURL(audioUrl); setHighlightedWordIndex(-1); setActiveAudioText(null); audioPlayer.ontimeupdate = null; audioPlayer.onerror = null; setIsAudioLoading(false);
            };
            audioPlayer.onerror = (e) => { /* ... lógica onerror ... */
                 console.error("Error del elemento Audio:", e); setIsAudioPlaying(false); setAppMessage({ text: 'Error al reproducir audio.', isError: true }); if (audioUrl) URL.revokeObjectURL(audioUrl); setHighlightedWordIndex(-1); setActiveAudioText(null); audioPlayer.ontimeupdate = null; audioPlayer.onended = null; setIsAudioLoading(false);
            };

            try { await audioPlayer.play(); setAppMessage({ text: '▶️ Reproduciendo...', isError: false }); }
            catch (playError) { console.error("Error al llamar a audioPlayer.play():", playError); if(audioPlayer.onerror) audioPlayer.onerror(playError); }

        } catch (error) { // Error final
             console.error("Error en playAudio (final):", error); setAppMessage({ text: `Error de audio: ${error.message}`, isError: true }); setIsAudioPlaying(false); setActiveAudioText(null); setHighlightedWordIndex(-1); audioPlayer.ontimeupdate = null; audioPlayer.onended = null; audioPlayer.onerror = null; setIsAudioLoading(false); if (audioUrl && audioUrl.startsWith('blob:')) { URL.revokeObjectURL(audioUrl); }
        }
    // --- CAMBIO 4: AÑADIR selectedTone A DEPENDENCIAS ---
    }, [isAudioPlaying, setAppMessage, setIsAudioLoading, currentDeckName, selectedTone]);


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
                        {cardData.name?.split(' ').map((word, index) => ( <span key={index} className={activeAudioText === cardData.name && highlightedWordIndex === index ? styles.highlightedWord : ''}>{word}{' '}</span> ))}
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
                                        {def.usage_example?.split(' ').map((word, wordIndex) => ( <span key={wordIndex} className={activeAudioText === def.usage_example && highlightedWordIndex === wordIndex ? styles.highlightedWord : ''}>{word}{' '}</span> ))}
                                    </div>
                                    {!blurredState[defIndex] && ( <span className={styles.customTooltip}>{def.pronunciation_guide_es}</span> )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className={styles.imagePlaceholder}>
                        {isImageLoading ? ( <img src="/loading.gif" alt="Cargando..." style={{ width: '100px', height: '100px' }} /> ) : ( imageUrl ? ( <img className={`${styles.image} ${styles.imageVisible}`} src={imageUrl} alt={cardData.name || 'Flashcard image'} /> ) : ( <div className={styles.noImagePlaceholder}>Imagen no disponible</div> ) )}
                    </div>
                </div>
                {/* --- CARD BACK --- */}
                <div className={styles.cardBack}>
                    {cardData.definitions?.map((def, index) => (
                        <div key={index} className={styles.definitionBlockBack}>
                            <p className={styles.meaningSentence}><span className={styles.phrasalVerbBack}>{cardData.name}</span> significa <strong className={styles.meaningBack}>{def.meaning}</strong></p>
                            <p className={styles.usageExampleEn} dangerouslySetInnerHTML={{ __html: `"${def.usage_example ? def.usage_example.replace(new RegExp(`\\b(${cardData.name})\\b`, 'gi'), `<strong>$1</strong>`) : ''}"` }} />
                            {def.alternative_example && ( <p className={styles.alternativeExample}><em>Alternativa:</em> "{def.alternative_example}"</p> )}
                            <p className={styles.usageExampleEs}>{def.usage_example_es}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Flashcard;