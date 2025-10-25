// src/features/flashcards/Flashcard.jsx
import React, { useState, useEffect } from 'react';
import styles from './Flashcard.module.css';
import { useAudioPlayback } from './useAudioPlayback.jsx';
import { useImageGeneration } from './useImageGeneration.js';
import CardFront from './CardFront.jsx';
import CardBack from './CardBack.jsx';

function Flashcard({
    // ... (todas las props existentes)
    cardData, onOpenIpaModal, setAppMessage, updateCardImagePath, 
    currentDeckName, setIsAudioLoading, selectedTone
}) {
    
    const [isFlipped, setIsFlipped] = useState(false);
    const [blurredState, setBlurredState] = useState({});

    // Hook de Audio (sin cambios)
    const { 
        playAudio, 
        activeAudioText, 
        highlightedWordIndex 
    } = useAudioPlayback({
        // ...props
        setAppMessage, setIsAudioLoading, currentDeckName, selectedTone, verbName: cardData?.name
    });

    // --- 1. MODIFICAR ESTA LÍNEA ---
    // Obtenemos la nueva función del hook de imagen
    const { 
        isImageLoading, 
        imageUrl, 
        imageRef,
        displayImageForIndex // <-- OBTENER LA NUEVA FUNCIÓN
    } = useImageGeneration({
        // ...props
        cardData, currentDeckName, setAppMessage, updateCardImagePath
    });

    // useEffect (sin cambios)
    useEffect(() => {
        if (!cardData) return;
        setIsFlipped(false);
        setBlurredState(
            cardData.definitions?.reduce((acc, _, i) => ({ ...acc, [i]: true }), {}) || {}
        );
        setAppMessage({ text: '', isError: false });
    }, [cardData, setAppMessage]);

    const toggleBlur = (index) => {
        setBlurredState((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    if (!cardData) {
        return <div className={styles.flashcardContainer}>Cargando datos...</div>;
    }

    return (
        <div className={styles.flashcardContainer}>
            <div
                className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
                onClick={() => setIsFlipped((p) => !p)}
            >
                {/* --- 2. MODIFICAR ESTA SECCIÓN --- */}
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
                    displayImageForIndex={displayImageForIndex} // <-- PASAR LA FUNCIÓN A CardFront
                />
                
                <CardBack cardData={cardData} />
                
            </div>
        </div>
    );
}

export default Flashcard;