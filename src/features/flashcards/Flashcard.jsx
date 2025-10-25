// src/features/flashcards/Flashcard.jsx
import React, { useState, useEffect } from 'react';
import styles from './Flashcard.module.css';

// --- CORRECCIÓN FINAL BASADA EN LOS ERRORES ---
// El error dice que no encuentra 'useAudioPlayback.js', así que debe ser .jsx
import { useAudioPlayback } from './useAudioPlayback.jsx'; 
// El error anterior dijo que no encontraba 'useImageGeneration.jsx', así que debe ser .js
import { useImageGeneration } from './useImageGeneration.js';
// Los componentes son .jsx (esto es correcto)
import CardFront from './CardFront.jsx';
import CardBack from './CardBack.jsx';
// ---------------------------------------------

function Flashcard({
    cardData,
    onOpenIpaModal,
    setAppMessage,
    updateCardImagePath,
    currentDeckName,
    setIsAudioLoading,
    selectedTone
}) {
    // --- ESTADOS LOCALES ---
    const [isFlipped, setIsFlipped] = useState(false);
    const [blurredState, setBlurredState] = useState({});

    // --- HOOK DE AUDIO ---
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

    // --- HOOK DE IMAGEN ---
    const { 
        isImageLoading, 
        imageUrl, 
        imageRef 
    } = useImageGeneration({
        cardData,
        currentDeckName,
        setAppMessage,
        updateCardImagePath
    });

    // Efecto para resetear estados locales cuando la tarjeta cambia
    useEffect(() => {
        if (!cardData) return;
        setIsFlipped(false);
        setBlurredState(
            cardData.definitions?.reduce(
                (acc, _, i) => ({ ...acc, [i]: true }),
                {}
            ) || {}
        );
        setAppMessage({ text: '', isError: false });
    }, [cardData, setAppMessage]);

    // Handler para el texto borroso (se pasa a CardFront)
    const toggleBlur = (index) => {
        setBlurredState((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    if (!cardData) {
        return <div className={styles.flashcardContainer}>Cargando datos...</div>;
    }

    // --- RENDER FINAL ---
    return (
        <div className={styles.flashcardContainer}>
            <div
                className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
                onClick={() => setIsFlipped((p) => !p)} // Controla el volteo
            >
                {/* ==================== CARD FRONT ==================== */}
                <CardFront
                    cardData={cardData}
                    onOpenIpaModal={onOpenIpaModal}
                    playAudio={playAudio}
                    activeAudioText={activeAudioText}
                    highlightedWordIndex={highlightedWordIndex}
                    blurredState={blurredState}
                    toggleBlur={toggleBlur}
                    isImageLoading={isImageLoading}
                    imageUrl={imageUrl}
                    imageRef={imageRef}
                />
                
                {/* ==================== CARD BACK ==================== */}
                <CardBack cardData={cardData} />
                
            </div>
        </div>
    );
}

export default Flashcard;