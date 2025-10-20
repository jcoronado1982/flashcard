// src/features/flashcards/IpaModal.jsx
import React from 'react';

// 1. La lista de símbolos nuevos que quieres mostrar en los botones.
const ipaSymbols = [ 'i', 'ɪ', 'ɛ', 'æ', 'ɑ', 'ʌ', 'ɚ', 'ɔ', 'ɒ', 'u', 'ʊ', 'ɝ' ];

// 2. El objeto para posicionar los botones en el CSS (ya estaba corregido).
const symbolPositions = { 
    'i': 'ipa-i-long',    
    'ɪ': 'ipa-i-short', 
    'ɛ': 'ipa-e',         
    'æ': 'ipa-ae', 
    'ɚ': 'ipa-schwa',     
    'ʌ': 'ipa-uh', 
    'ɑ': 'ipa-a-long',    
    'ɔ': 'ipa-o-long',    
    'ʊ': 'ipa-u-short', 
    'u': 'ipa-u-long',    
    'ɒ': 'ipa-o-short', 
    'ɝ': 'ipa-er'         
};

// 3. NUEVO: Un "mapa" para traducir el símbolo del botón al nombre de archivo de audio correcto.
const symbolToFileNameMap = {
  'i': 'i-',    // El símbolo 'i' usará el archivo 'i-.mp4'
  'ɪ': 'ɪ',     // El símbolo 'ɪ' usará el archivo 'ɪ.mp4'
  'ɛ': 'e',     // El símbolo 'ɛ' usará el archivo 'e.mp4'
  'æ': 'æ',
  'ɑ': 'ɑ-',
  'ʌ': 'ʌ',
  'ɚ': 'ə',     // El símbolo 'ɚ' usará el archivo 'ə.mp4'
  'ɔ': 'ɔ-',
  'ɒ': 'ɒ',
  'u': 'u-',
  'ʊ': 'ʊ',
  'ɝ': 'ɜ-'     // El símbolo 'ɝ' usará el archivo 'ɜ-.mp4'
};


function IpaModal({ onClose }) {
    const speakIPA = (symbol) => {
        // AHORA: Usa el mapa para encontrar el nombre de archivo correcto.
        const fileName = symbolToFileNameMap[symbol]; 
        
        const audio = new Audio(`/audio/${fileName}.mp4`); 
        audio.play().catch(e => console.error(`Error al reproducir /audio/${fileName}.mp4:`, e));
    };

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <span className="close-button" onClick={onClose}>&times;</span>
                <div id="ipa-chart">
                    {ipaSymbols.map(symbol => (
                        <button 
                            key={symbol} 
                            id={symbolPositions[symbol]} 
                            className="ipa-btn" 
                            onClick={() => speakIPA(symbol)}
                        >
                            {symbol}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default IpaModal;