// src/features/flashcards/CardFront.jsx
import React from 'react';
import styles from './Flashcard.module.css'; // Reutilizamos los mismos estilos
import HighlightedText from './HighlightedText'; // Importamos el componente de texto

// Recibe todas las props que necesita para renderizar la cara frontal
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
    imageRef
}) {
    return (
        <div className={styles.cardFront}>
            <button
                className={styles.soundButton}
                onClick={(e) => {
                    e.stopPropagation(); // Evitar que la tarjeta se voltee
                    playAudio(cardData.name);
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
                        e.stopPropagation(); // Evitar que la tarjeta se voltee
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
                                    e.stopPropagation(); // Evitar que la tarjeta se voltee
                                    playAudio(def.usage_example);
                                }}
                            >
                                🔊
                            </button>
                            <div
                                className={blurredState[di] ? styles.blurredText : ''}
                                onClick={(e) => {
                                    e.stopPropagation(); // Evitar que la tarjeta se voltee
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

            <div className={styles.imagePlaceholder}>
                {isImageLoading ? (
                    <img
                        src="/loading.gif"
                        alt="Cargando..."
                        style={{ width: '100px', height: '100px' }}
                    />
                ) : (
                    <img
                        ref={imageRef} // Asignar la ref del hook
                        className={`${styles.image} ${styles.imageVisible}`}
                        src={imageUrl} // Usar la URL del hook
                        alt={cardData.name || 'Flashcard image'}
                    />
                )}
            </div>
        </div>
    );
}

export default CardFront;