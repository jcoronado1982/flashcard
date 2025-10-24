// src/features/flashcards/IpaModal.jsx
import React from 'react';
import styles from './IpaModal.module.css'; // Import the CSS Module

// --- Data for the modal ---
const ipaSymbols = [ 'i', 'ɪ', 'ɛ', 'æ', 'ɑ', 'ʌ', 'ɚ', 'ɔ', 'ɒ', 'u', 'ʊ', 'ɝ' ];
const symbolPositions = {
    'i': 'ipa-i-long',  'ɪ': 'ipa-i-short', 'ɛ': 'ipa-e',     'æ': 'ipa-ae',
    'ɚ': 'ipa-schwa',   'ʌ': 'ipa-uh',      'ɑ': 'ipa-a-long','ɔ': 'ipa-o-long',
    'ʊ': 'ipa-u-short', 'u': 'ipa-u-long',  'ɒ': 'ipa-o-short','ɝ': 'ipa-er'
};
const symbolToFileNameMap = {
  'i': 'i-', 'ɪ': 'ɪ', 'ɛ': 'e', 'æ': 'æ', 'ɑ': 'ɑ-', 'ʌ': 'ʌ', 'ɚ': 'ə',
  'ɔ': 'ɔ-', 'ɒ': 'ɒ', 'u': 'u-', 'ʊ': 'ʊ', 'ɝ': 'ɜ-'
};
// --- End Data ---

function IpaModal({ onClose }) {

    const speakIPA = (symbol) => {
        const fileName = symbolToFileNameMap[symbol];
        if (!fileName) {
            console.error(`No audio file name mapped for IPA symbol: ${symbol}`);
            return;
        }
        // Assumes audio files are in the /public/audio/ directory
        const audio = new Audio(`/audio/${fileName}.mp4`);
        audio.play().catch(e => console.error(`Error playing /audio/${fileName}.mp4:`, e));
    };

    return (
        // Use the CSS module class for the modal background/container
        <div className={styles.modal} onClick={onClose}>
            {/* Use the CSS module class for the modal content box */}
            {/* Stop propagation prevents closing the modal when clicking inside the content */}
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                {/* Use the CSS module class for the close button (as a button for semantics) */}
                <button className={styles.closeButton} onClick={onClose}>&times;</button>

                {/* Use the CSS module class for the chart background/area */}
                <div className={styles.ipaChart}>
                    {/* Map over the symbols to create buttons */}
                    {ipaSymbols.map(symbol => (
                        <button
                            key={symbol}
                            // IMPORTANT: Keep the ID! This is used by the CSS for positioning.
                            id={symbolPositions[symbol]}
                            // Use the CSS module class for general button styling
                            className={styles.ipaBtn}
                            onClick={() => speakIPA(symbol)}
                        >
                            {symbol} {/* Display the IPA symbol on the button */}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default IpaModal;