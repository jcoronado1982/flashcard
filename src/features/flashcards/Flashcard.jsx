// src/features/flashcards/Flashcard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Flashcard.module.css';
import { useAudioPlayback } from './useAudioPlayback'; // <-- 1. IMPORTAR HOOK
import HighlightedText from './HighlightedText'; // <-- 2. IMPORTAR COMPONENTE

const API_URL = 'http://127.0.0.1:8000';

function Flashcard({cardData,onOpenIpaModal,setAppMessage,updateCardImagePath,currentDeckName,setIsAudioLoading,selectedTone}) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState(null);
    const [blurredState, setBlurredState] = useState({});

    const imageRef = useRef(null);
    const imageAttempts = useRef({});
    const MAX_IMAGE_ATTEMPTS = 3;
    const IMAGE_RETRY_DELAY = 5000;

    // --- 3. USAR EL HOOK DE AUDIO ---
    // Le pasamos las props que necesita y nos devuelve la lógica
    const { 
        playAudio, 
        activeAudioText, 
        highlightedWordIndex 
    } = useAudioPlayback({
        setAppMessage,
        setIsAudioLoading,
        currentDeckName,
        selectedTone,
        verbName: cardData?.name
    });
    // ¡Toda la lógica de audio y resaltado ya no está aquí!
    // ------------------------------------

    // ---------- GENERAR Y CARGAR IMAGEN (Esta lógica se queda aquí por ahora) ----------
    const generateAndLoadImage = useCallback(
        async (defIndex = 0) => {
            if (!cardData || !cardData.definitions?.[defIndex]) return;

            if (!imageAttempts.current[defIndex])
                imageAttempts.current[defIndex] = 0;
            if (imageAttempts.current[defIndex] >= MAX_IMAGE_ATTEMPTS) {
                setAppMessage({
                    text: `Fallaron todos los intentos para imagen def ${defIndex + 1}`,
                    isError: true
                });
                setIsImageLoading(false);
                return;
            }

            imageAttempts.current[defIndex]++;
            setIsImageLoading(true);
            setAppMessage({
                text: `⏳ Cargando imagen (Def ${defIndex + 1})...`,
                isError: false
            });

            try {
                const def = cardData.definitions[defIndex];
                const prompt = `Generate a single, clear, educational illustration for the phrasal verb "${cardData.name}" meaning "${def.meaning}". Context: "${def.usage_example}". Style: Photorealistic, bright, daylight. No text or labels.`;

                const res = await fetch(`${API_URL}/api/generate-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        index: cardData.id,
                        def_index: defIndex,
                        prompt,
                        deck: currentDeckName,
                        force_generation: !def.imagePath
                    })
                });

                if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
                const data = await res.json();
                if (!data?.path) throw new Error("Sin ruta de imagen");

                const fullPath = `${API_URL}${data.path}?t=${Date.now()}`;
                updateCardImagePath(cardData.id, data.path, defIndex);

                if (imageRef.current) {
                    imageRef.current.src = fullPath;
                }
                setImageUrl((prev) => prev || fullPath);

                setIsImageLoading(false);
                setAppMessage({
                    text: `¡Imagen (Def ${defIndex + 1}) lista!`,
                    isError: false
                });
            } catch (err) {
                console.warn(`Error imagen def ${defIndex}:`, err);
                if (imageAttempts.current[defIndex] < MAX_IMAGE_ATTEMPTS) {
                    setTimeout(() => generateAndLoadImage(defIndex), IMAGE_RETRY_DELAY);
                } else {
                    setAppMessage({
                        text: `Error final: ${err.message}`,
                        isError: true
                    });
                    setIsImageLoading(false);
                }
            }
        },
        [cardData, currentDeckName, setAppMessage, updateCardImagePath]
    );

    // ---------- CARGAR IMAGEN INICIAL ----------
    useEffect(() => {
        if (!cardData) return;
        setIsFlipped(false);
        setIsImageLoading(true);
        setImageUrl(null);
        setBlurredState(
            cardData.definitions?.reduce(
                (acc, _, i) => ({ ...acc, [i]: true }),
                {}
            ) || {}
        );
        // Ya no reseteamos activeAudioText o highlightedWordIndex aquí, el hook lo maneja
        setAppMessage({ text: '', isError: false });
        imageAttempts.current = {};

        const first = cardData.definitions?.[0];
        if (first?.imagePath) {
            const fullPath = `${API_URL}${first.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                if (imageRef.current) imageRef.current.src = fullPath;
                setImageUrl(fullPath);
                setIsImageLoading(false);
            };
            img.onerror = () => generateAndLoadImage(0);
        } else generateAndLoadImage(0);
    }, [cardData, currentDeckName, generateAndLoadImage, setAppMessage]);

    if (!cardData)
        return <div className={styles.flashcardContainer}>Cargando datos...</div>;

    const toggleBlur = (i) =>
        setBlurredState((p) => ({ ...p, [i]: !p[i] }));

    // ---------- RENDER ----------
    return (
        <div className={styles.flashcardContainer}>
            <div
                className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
                onClick={() => setIsFlipped((p) => !p)}
            >
                <div className={styles.cardFront}>
                    <button
                        className={styles.soundButton}
                        onClick={(e) => {
                            e.stopPropagation();
                            playAudio(cardData.name); // <-- 4. SIMPLEMENTE LLAMAR A LA FUNCIÓN DEL HOOK
                        }}
                    >
                        🔊
                    </button>

                    <h2 className={styles.name}>
                        {/* 5. USAR EL NUEVO COMPONENTE */}
                        <HighlightedText 
                            text={cardData.name}
                            activeAudioText={activeAudioText}
                            highlightedWordIndex={highlightedWordIndex}
                        />
                    </h2>

                    <div className={styles.phoneticContainer}>
                        <p className={styles.phonetic}>{cardData.phonetic}</p>
                        <button
                            className={styles.ipaChartBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenIpaModal();
                            }}
                        >
                            📖
                        </button>
                    </div>

                    <div className={styles.allExamplesContainer}>
                        <ul>
                            {cardData.definitions?.map((def, di) => (
                                <li key={di}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playAudio(def.usage_example); // <-- 6. SIMPLEMENTE LLAMAR A LA FUNCIÓN DEL HOOK
                                        }}
                                    >
                                        🔊
                                    </button>
                                    <div
                                        className={blurredState[di] ? styles.blurredText : ''}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleBlur(di);
                                        }}
                                    >
                                        {/* 7. USAR EL NUEVO COMPONENTE */}
                                        <HighlightedText 
                                            text={def.usage_example}
                                            activeAudioText={activeAudioText}
                                            highlightedWordIndex={highlightedWordIndex}
                                        />
                                    </div>
                                    {!blurredState[di] && (
                                        <span className={styles.customTooltip}>
                                            {def.pronunciation_guide_es}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className={styles.imagePlaceholder}>
                        {isImageLoading ? (
                            <img
                                src="/loading.gif"
                                alt="Cargando..."
                                style={{ width: '100px', height: '100px' }}
                            />
                        ) : (
                            <img
                                ref={imageRef}
                                className={`${styles.image} ${styles.imageVisible}`}
                                src={imageUrl}
                                alt={cardData.name || 'Flashcard image'}
                            />
                        )}
                    </div>
                </div>

                {/* --- CARD BACK (Sin cambios) --- */}
                <div className={styles.cardBack}>
                    {cardData.definitions?.map((def, i) => (
                        <div key={i} className={styles.definitionBlockBack}>
                            <p className={styles.meaningSentence}>
                                <span className={styles.phrasalVerbBack}>
                                    {cardData.name}
                                </span>{' '}
                                significa{' '}
                                <strong className={styles.meaningBack}>
                                    {def.meaning}
                                </strong>
                            </p>
                            <p
                                className={styles.usageExampleEn}
                                dangerouslySetInnerHTML={{
                                    __html: `"${def.usage_example
                                        ?.replace(
                                            new RegExp(`\\b(${cardData.name})\\b`, 'gi'),
                                            '<strong>$1</strong>'
                                        )}" `
                                }}
                            />
                            {def.alternative_example && (
                                <p className={styles.alternativeExample}>
                                    <em>Alternativa:</em> "{def.alternative_example}"
                                </p>
                            )}
                            <p className={styles.usageExampleEs}>
                                {def.usage_example_es}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Flashcard;