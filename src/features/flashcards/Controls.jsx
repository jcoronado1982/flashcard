// src/features/flashcards/Controls.jsx
import React from 'react';
import styles from './Controls.module.css'; // Importa el CSS Module

function Controls({ 
    onPrev, onNext, onMarkLearned, onReset, 
    currentIndex, totalCards, 
    deckNames, onDeckChange, currentDeckName,
    isAudioLoading // <-- PROP NUEVA
}) {
    
    // --- LÓGICA MODIFICADA ---
    const isDisabled = totalCards === 0;
    // 'isBusy' deshabilita si no hay tarjetas O si el audio está cargando
    const isBusy = isDisabled || isAudioLoading;
    // 'isResetDisabled' deshabilita si no hay deck O si el audio está cargando
    const isResetDisabled = isAudioLoading || !currentDeckName;
    // --- FIN LÓGICA MODIFICADA ---

    const handleDeckChange = (event) => {
        onDeckChange(event.target.value);
    };

    // Función auxiliar para formatear el nombre (capitalizar y reemplazar guiones bajos)
    const formatDeckName = (name) => {
        // Asegúrate de que name no sea null o undefined antes de intentar formatear
        if (!name) return '';
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
    };

    return (
        // Usa styles.controlsWrapper para el div principal
        <div className={styles.controlsWrapper}>
            {/* SELECTOR DE TARJETA/MAZO */}
            {/* Usa styles.deckSelectorContainer */}
            <div className={styles.deckSelectorContainer}>
                {/* Usa styles.deckSelectorLabel */}
                <label htmlFor="deck-select" className={styles.deckSelectorLabel}>
                    Palabra:
                </label>
                <select
                    id="deck-select" // El ID puede quedarse para el 'htmlFor'
                    onChange={handleDeckChange}
                    value={currentDeckName || ''}
                    // Usa styles.deckSelectDropdown
                    className={styles.deckSelectDropdown}
                    // --- MODIFICADO ---
                    disabled={deckNames.length === 0 || isAudioLoading}
                >
                    {deckNames.length === 0 && <option value="" disabled>Cargando palabras...</option>}
                    {deckNames.map((name, index) => (
                        <option key={index} value={name}>
                            {formatDeckName(name)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Controles de navegación */}
            {/* Usa styles.controls para la fila de botones */}
            <div className={styles.controls}>
                {/* --- BOTONES MODIFICADOS --- */}
                <button className={styles.prevCardBtn} onClick={onPrev} disabled={isBusy} title="Anterior">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button className={styles.resetButton} onClick={onReset} disabled={isResetDisabled} title={`Resetear la tarjeta: ${currentDeckName ? formatDeckName(currentDeckName) : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                </button>
                {/* Usa styles.cardCounter */}
                <div className={styles.cardCounter}>
                    {totalCards > 0 ? `${currentIndex + 1} / ${totalCards}` : '0 / 0'}
                </div>
                <button className={styles.correctButton} onClick={onMarkLearned} disabled={isBusy} title="Marcar como Aprendida">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
                <button className={styles.nextCardBtn} onClick={onNext} disabled={isBusy} title="Siguiente">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        </div>
    );
}

export default Controls;