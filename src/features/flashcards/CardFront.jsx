// src/features/flashcards/CardFront.jsx
import React from 'react';
import styles from './Flashcard.module.css';
import HighlightedText from './HighlightedText';

// --- 1. RECIBIR LA NUEVA PROP ---
function CardFront({
    cardData,
    onOpenIpaModal,
    playAudio,
    activeAudioText,
    highlightedWordIndex,
    blurredState,
    toggleBlur,
    isImageLoading,
    imageUrl,
    imageRef,
    displayImageForIndex // <-- RECIBIR LA PROP AQUÍ
}) {
    return (
        <div className={styles.cardFront}>
            
            {/* --- 2. MODIFICAR ESTE BOTÓN --- */}
            <button
                className={styles.soundButton}
                onClick={(e) => {
                    e.stopPropagation();
                    playAudio(cardData.name);
                    displayImageForIndex(0); // <-- Muestra la imagen de la primera definición
                }}
            >
                🔊
            </button>

            <h2 className={styles.name}>
                {/* ... (sin cambios) ... */}
                <HighlightedText 
                    text={cardData.name}
                    activeAudioText={activeAudioText}
                    highlightedWordIndex={highlightedWordIndex}
                />
            </h2>

            <div className={styles.phoneticContainer}>
                {/* ... (sin cambios) ... */}
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
                    {cardData.definitions?.map((def, di) => ( // 'di' es el índice de la definición
                        <li key={di}>

                            {/* --- 3. MODIFICAR ESTE BOTÓN --- */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(def.usage_example);
                                    displayImageForIndex(di); // <-- Muestra la imagen para este índice (di)
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
                                {/* ... (sin cambios) ... */}
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
                {/* ... (sin cambios) ... */}
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
    );
}

export default CardFront;