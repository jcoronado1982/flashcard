// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Flashcard from './features/flashcards/Flashcard';
import Controls from './features/flashcards/Controls';
import IpaModal from './features/flashcards/IpaModal';

const API_URL = 'http://127.0.0.1:8000';

function App() {
    const [masterData, setMasterData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isIpaModalOpen, setIsIpaModalOpen] = useState(false);
    const [appMessage, setAppMessage] = useState({ text: '', isError: false });

    useEffect(() => {
        const fetchFlashcards = async () => {
            setAppMessage({ text: 'Cargando tarjetas...', isError: false });
            try {
                const response = await fetch(`${API_URL}/api/flashcards-data`);
                if (!response.ok) throw new Error('No se pudo cargar los datos desde la API.');
                
                const data = await response.json();
                const dataWithIds = data.map((card, index) => ({ ...card, id: index }));

                setMasterData(dataWithIds);
                const unlearnedCards = dataWithIds.filter(card => !card.learned);
                setFilteredData(unlearnedCards);

                if (unlearnedCards.length > 0) {
                    setAppMessage({ text: 'Tarjetas listas.', isError: false });
                }

            } catch (error) {
                console.error("Error fatal:", error);
                setAppMessage({ text: error.message, isError: true });
            } finally {
                setIsLoading(false);
            }
        };
        fetchFlashcards();
    }, []);

    const handleNextCard = useCallback(() => {
        if (filteredData.length > 0) {
            setCurrentIndex(prev => (prev + 1) % filteredData.length);
        }
    }, [filteredData.length]);

    const handlePrevCard = useCallback(() => {
        if (filteredData.length > 0) {
            setCurrentIndex(prev => (prev - 1 + filteredData.length) % filteredData.length);
        }
    }, [filteredData.length]);

    const handleMarkAsLearned = useCallback(async () => {
        if (filteredData.length === 0) return;
        
        const cardToMark = filteredData[currentIndex];

        try {
            await fetch(`${API_URL}/api/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: cardToMark.id, learned: true }),
            });

            const updatedMasterData = masterData.map(card =>
                card.id === cardToMark.id ? { ...card, learned: true } : card
            );
            setMasterData(updatedMasterData);

            const newFilteredData = updatedMasterData.filter(card => !card.learned);
            setFilteredData(newFilteredData);

            // Ajusta el índice para que no se salga de los límites
            if (currentIndex >= newFilteredData.length) {
                setCurrentIndex(Math.max(0, newFilteredData.length - 1));
            }

        } catch (error) {
            setAppMessage({ text: `Error al guardar: ${error.message}`, isError: true });
        }
    }, [currentIndex, filteredData, masterData]);
    
    const handleReset = useCallback(async () => {
        if (window.confirm("¿Estás seguro de que quieres resetear todo el progreso?")) {
            try {
                setAppMessage({ text: 'Reseteando...', isError: false });
                await fetch(`${API_URL}/api/reset-all`, { method: 'POST' });
                window.location.reload(); // La forma más simple de refrescar todo
            } catch (error) {
                setAppMessage({ text: `Error al resetear: ${error.message}`, isError: true });
            }
        }
    }, []);

    const updateCardImagePath = useCallback((cardId, newPath) => {
        const updateData = (data) => data.map(card => card.id === cardId ? { ...card, imagePath: newPath } : card);
        setMasterData(prev => updateData(prev));
        setFilteredData(prev => updateData(prev));
    }, []);

    const currentCard = filteredData[currentIndex];

    if (isLoading) {
        return <div className="flashcard-container"><img src="/loading.gif" alt="Cargando..." /></div>;
    }

    if (!isLoading && filteredData.length === 0) {
        return <div className="all-done-message">¡Felicidades! Has aprendido todas las tarjetas. 🎉</div>;
    }

    return (
        <>
            <div className="app-container">
                <Flashcard 
                    key={currentCard?.id}
                    cardData={currentCard} 
                    onOpenIpaModal={() => setIsIpaModalOpen(true)}
                    setAppMessage={setAppMessage}
                    updateCardImagePath={updateCardImagePath}
                />
                <Controls
                    onNext={handleNextCard}
                    onPrev={handlePrevCard}
                    onMarkLearned={handleMarkAsLearned}
                    onReset={handleReset}
                    currentIndex={currentIndex}
                    totalCards={filteredData.length}
                />
            </div>
            {isIpaModalOpen && <IpaModal onClose={() => setIsIpaModalOpen(false)} />}
            <div id="message" style={{ color: appMessage.isError ? '#D32F2F' : '#333' }}>
                {appMessage.text}
            </div>
        </>
    );
}

export default App;