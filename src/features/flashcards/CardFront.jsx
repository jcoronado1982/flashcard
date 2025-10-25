// src/features/flashcards/CardFront.jsx
import React from 'react';
import styles from './Flashcard.module.css';
import HighlightedText from './HighlightedText';
import noImage from '../../assets/noImage.png'; // <-- 1. IMPORTAR LA IMAGEN

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
    displayImageForIndex
}) {
    return (
        <div className={styles.cardFront}>
            {/* ... (Botón de sonido, h2, phoneticContainer, allExamplesContainer - sin cambios) ... */}

            <button
                className={styles.soundButton}
                onClick={(e) => {
                    e.stopPropagation();
                    playAudio(cardData.name);
                    displayImageForIndex(0); 
                }}
            >
                🔊
            </button>

            <h2 className={styles.name}>
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
                                    playAudio(def.usage_example);
                                    displayImageForIndex(di);
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

            {/* --- ¡AQUÍ ESTÁ LA MODIFICACIÓN! --- */}
            <div className={styles.imagePlaceholder}>
                {isImageLoading ? (
                    // Caso 1: Estamos cargando activamente (mostramos spinner)
                    <img
                        src="/loading.gif" // Asegúrate que loading.gif esté en /public
                        alt="Loading..."
                        style={{ width: '100px', height: '100px' }}
                    />
                ) : imageUrl ? (
                    // Caso 2: No estamos cargando Y tenemos una URL (mostramos imagen real)
                    <img
                        ref={imageRef}
                        className={`${styles.image} ${styles.imageVisible}`}
                        src={imageUrl}
                        alt={cardData.name || 'Flashcard image'}
                    />
                ) : (
                    // Caso 3: No estamos cargando Y NO tenemos URL (mostramos imagen placeholder)
                    <img 
                        src={noImage} // <-- 2. USAR LA IMAGEN IMPORTADA
                        alt="Image not available" 
                        className={styles.noImagePlaceholderImg} // <-- 3. Usar una clase específica si necesitas estilos
                    />
                )}
            </div>
            {/* --- FIN DE LA MODIFICACIÓN --- */}

        </div>
    );
}

export default CardFront;