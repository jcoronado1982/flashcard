// src/features/flashcards/ToneSelector.jsx
import React from 'react';
import styles from './ToneSelector.module.css';

// Recibe las opciones, el valor actual y la función para cambiarlo
function ToneSelector({ toneOptions, selectedTone, onToneChange }) {
    return (
        // Contenedor principal con estilos para posicionamiento
        <div className={styles.toneSelectorContainer}>
            {/* Etiqueta del selector */}
            <label htmlFor="tone-select" className={styles.toneSelectorLabel}>
                Tono Voz:
            </label>
            {/* Elemento select (dropdown) */}
            <select
                id="tone-select" // ID para asociar con la etiqueta
                value={selectedTone} // Valor controlado por el estado de App.jsx
                onChange={(e) => onToneChange(e.target.value)} // Llama a la función de App.jsx al cambiar
                className={styles.toneSelectDropdown} // Aplica estilos del CSS Module
            >
                {/* Mapea el array de opciones a elementos <option> */}
                {toneOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label} {/* Muestra la etiqueta legible para el usuario */}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default ToneSelector;