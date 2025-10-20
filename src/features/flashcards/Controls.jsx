// src/features/flashcards/Controls.jsx
import React from 'react';

function Controls({ onPrev, onNext, onMarkLearned, onReset, currentIndex, totalCards }) {
    const isDisabled = totalCards === 0;

    return (
        <div id="controls">
            <button className="nav" id="prevCardBtn" onClick={onPrev} disabled={isDisabled} title="Anterior">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button id="resetButton" className="action-btn" onClick={onReset} title="Resetear todo el progreso">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
            <div id="cardCounter">
                {totalCards > 0 ? `${currentIndex + 1} / ${totalCards}` : '0 / 0'}
            </div>
            <button id="correctButton" className="action-btn" onClick={onMarkLearned} disabled={isDisabled} title="Marcar como Aprendida">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button className="nav" id="nextCardBtn" onClick={onNext} disabled={isDisabled} title="Siguiente">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        </div>
    );
}

export default Controls;