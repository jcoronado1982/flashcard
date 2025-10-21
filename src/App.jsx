// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Flashcard from './features/flashcards/Flashcard';
import Controls from './features/flashcards/Controls';
import IpaModal from './features/flashcards/IpaModal';

const API_URL = 'http://127.0.0.1:8000';

function App() {
    // ----------------------------------------------------
    // ESTADOS GENERALES Y DE DATOS
    // ----------------------------------------------------
    const [masterData, setMasterData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isIpaModalOpen, setIsIpaModalOpen] = useState(false);
    const [appMessage, setAppMessage] = useState({ text: '', isError: false });

    // ----------------------------------------------------
    // ESTADOS DE TARJETA INDIVIDUAL (Deck Name = Nombre del archivo JSON sin '.json')
    // ----------------------------------------------------
    const [deckNames, setDeckNames] = useState([]); // Lista de archivos disponibles (ej: 'get', 'look')
    const [currentDeckName, setCurrentDeckName] = useState(null); // Tarjeta/Archivo actualmente cargado

    // ----------------------------------------------------
    // LÓGICA DE CARGA DE DATOS (Centralizada)
    // ----------------------------------------------------
    const fetchFlashcards = useCallback(async (deck) => {
        if (!deck) return;

        setAppMessage({ text: `Cargando tarjeta: ${deck}...`, isError: false });
        setIsLoading(true);
        setCurrentIndex(0); 

        try {
            // Llama a la API usando el nombre de la tarjeta/archivo (deck=get, deck=look)
            // NOTA: El backend ahora debe manejar este parámetro para cambiar el archivo activo.
            const response = await fetch(`${API_URL}/api/flashcards-data?deck=${deck}`);
            if (!response.ok) throw new Error('No se pudo cargar los datos desde la API.');
            
            let data = await response.json();
            if (!Array.isArray(data)) {
                data = [data]; // Aseguramos que sea un array para consistencia
            }
            
            const dataWithIds = data.map((card, index) => ({ ...card, id: index }));

            setMasterData(dataWithIds);
            const unlearnedCards = dataWithIds.filter(card => !card.learned);
            setFilteredData(unlearnedCards);

            if (unlearnedCards.length > 0) {
                setAppMessage({ text: `Tarjeta '${deck}' lista.`, isError: false });
            } else {
                setAppMessage({ text: `Tarjeta '${deck}' completada.`, isError: false });
            }

        } catch (error) {
            console.error("Error fatal:", error);
            setAppMessage({ text: `Error: ${error.message}`, isError: true });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ----------------------------------------------------
    // EFECTO 1: Cargar la lista de nombres de tarjetas (al inicio)
    // ----------------------------------------------------
    useEffect(() => {
        const fetchDeckNames = async () => {
            setAppMessage({ text: 'Buscando tarjetas disponibles...', isError: false });
            
            try {
                // LLAMADA REAL A LA API para obtener la lista de archivos JSON.
                const response = await fetch(`${API_URL}/api/available-flashcards-files`);
                if (!response.ok) throw new Error('No se pudo cargar la lista de archivos.');
                
                const result = await response.json();
                
                // Extraemos los nombres de archivo sin la extensión '.json'
                const rawDeckNames = result.files.map(name => name.replace('.json', ''));
                setDeckNames(rawDeckNames);

                const activeDeck = result.active_file ? result.active_file.replace('.json', '') : null;
                
                // Seleccionar el archivo activo devuelto por el backend
                if (activeDeck) {
                    setCurrentDeckName(activeDeck);
                    setAppMessage({ text: `Lista de palabras cargada. Palabra activa: ${activeDeck}`, isError: false });
                } else if (rawDeckNames.length > 0) {
                    // Fallback: si no hay un activo, toma el primero.
                    setCurrentDeckName(rawDeckNames[0]);
                } else {
                    setAppMessage({ text: 'No se encontraron archivos de tarjetas.', isError: true });
                    setIsLoading(false);
                }

            } catch (error) {
                console.error("Error al cargar decks:", error);
                setAppMessage({ text: `Error al cargar lista: ${error.message}`, isError: true });
                setIsLoading(false);
            }
        };

        fetchDeckNames();
    }, [fetchFlashcards, setAppMessage]); // Dependencias actualizadas

    // ----------------------------------------------------
    // EFECTO 2: Recarga la tarjeta cuando se cambia el nombre (Disparado por handleDeckChange)
    // ----------------------------------------------------
    useEffect(() => {
        if (currentDeckName) {
            fetchFlashcards(currentDeckName);
        }
    }, [currentDeckName, fetchFlashcards]);


    // ----------------------------------------------------
    // MANEJADORES DE NAVEGACIÓN Y ACCIÓN
    // ----------------------------------------------------

    const handleDeckChange = useCallback((newDeck) => {
        if (newDeck !== currentDeckName) {
            setCurrentDeckName(newDeck); // Dispara el useEffect 2
        }
    }, [currentDeckName]);


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
                // Se agregó 'deck' al body (aunque la API solo usa index/learned, lo enviamos)
                body: JSON.stringify({ deck: currentDeckName, index: cardToMark.id, learned: true }),
            });

            const updatedMasterData = masterData.map(card =>
                card.id === cardToMark.id ? { ...card, learned: true } : card
            );
            setMasterData(updatedMasterData);

            const newFilteredData = updatedMasterData.filter(card => !card.learned);
            setFilteredData(newFilteredData);

            if (currentIndex >= newFilteredData.length) {
                setCurrentIndex(Math.max(0, newFilteredData.length - 1));
            }
            setAppMessage({ text: `Tarjeta '${cardToMark.name}' marcada como aprendida.`, isError: false });

        } catch (error) {
            setAppMessage({ text: `Error al guardar: ${error.message}`, isError: true });
        }
    }, [currentIndex, filteredData, masterData, currentDeckName, setAppMessage]);
    
    const handleReset = useCallback(async () => {
        if (window.confirm(`¿Estás seguro de que quieres resetear el progreso de '${currentDeckName}'?`)) {
            try {
                setAppMessage({ text: 'Reseteando...', isError: false });
                await fetch(`${API_URL}/api/reset-all`, { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // Se asegura el envío del deck para que el backend cambie el archivo activo
                    body: JSON.stringify({ deck: currentDeckName }), 
                });
                fetchFlashcards(currentDeckName);
            } catch (error) {
                setAppMessage({ text: `Error al resetear: ${error.message}`, isError: true });
            }
        }
    }, [currentDeckName, fetchFlashcards, setAppMessage]);

    const updateCardImagePath = useCallback((cardId, newPath) => {
        const updateData = (data) => data.map(card => card.id === cardId ? { ...card, imagePath: newPath } : card);
        setMasterData(prev => updateData(prev));
        setFilteredData(prev => updateData(prev));
    }, []);

    const currentCard = filteredData[currentIndex];

    // ----------------------------------------------------
    // RENDERIZADO CONDICIONAL
    // ----------------------------------------------------

    if (!currentDeckName || isLoading) {
        return <div className="flashcard-container"><img src="/loading.gif" alt="Cargando..." /></div>;
    }

    if (!isLoading && filteredData.length === 0 && deckNames.length > 0) {
        return <div className="all-done-message">¡Felicidades! Has completado la tarjeta '{currentDeckName}'. 🎉</div>;
    }

    return (
        <>
            <div className="app-container">
                <Flashcard 
                    // Usar currentDeckName en la key asegura que Flashcard se reinicie.
                    key={currentDeckName} 
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
                    // Props para el selector de tarjeta/archivo
                    deckNames={deckNames}
                    onDeckChange={handleDeckChange}
                    currentDeckName={currentDeckName}
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