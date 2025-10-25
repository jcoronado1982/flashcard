import React, { useState, useEffect, useCallback } from 'react';
import Flashcard from './features/flashcards/Flashcard';
import Controls from './features/flashcards/Controls';
import IpaModal from './features/flashcards/IpaModal';
import ToneSelector from './features/flashcards/ToneSelector'; 
import './App.css'; 

const API_URL = 'http://127.0.0.1:8000';

const toneOptions = [
    { label: "Casual", value: "Read this casually, like talking to a friend: " },
    { label: "Claro", value: "Read clearly: " },
    { label: "Presentador", value: "Read this like a news anchor: " },
    { label: "Formal", value: "Say in a formal and informative tone: " },
    { label: "Rápido", value: "Say quickly and urgently: " }
];

function App() {
    const [masterData, setMasterData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isIpaModalOpen, setIsIpaModalOpen] = useState(false);
    const [appMessage, setAppMessage] = useState({ text: '', isError: false });
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [selectedTone, setSelectedTone] = useState(toneOptions[0].value);
    const [deckNames, setDeckNames] = useState([]);
    const [currentDeckName, setCurrentDeckName] = useState(null);

    const handleToneChange = useCallback((newToneValue) => {
        setSelectedTone(newToneValue);
    }, []);

    const fetchFlashcards = useCallback(async (deck) => {
        if (!deck) return;

        setAppMessage({ text: `Cargando palabra: ${deck}...`, isError: false });
        setIsLoading(true);
        setCurrentIndex(0);

        try {
            const response = await fetch(`${API_URL}/api/flashcards-data?deck=${deck}`);
            if (!response.ok) throw new Error('No se pudo cargar los datos desde la API.');

            let data = await response.json();
            if (!Array.isArray(data)) {
                data = [data];
            }

            const dataWithIds = data.map((card, index) => ({
                ...card,
                id: index,
                // Normalización de campos para el frontend
                definitions: (Array.isArray(card.definitions) ? card.definitions : []).map(def => ({...def, imagePath: def.imagePath || null })),
                phonetic: card.phonetic || card.ipa_us || 'N/A',
                learned: card.learned || false,
                force_generation: card.force_generation !== undefined ? card.force_generation : false
            }));


            setMasterData(dataWithIds);
            const unlearnedCards = dataWithIds.filter(card => !card.learned);
            setFilteredData(unlearnedCards);

            if (unlearnedCards.length > 0) {
                setAppMessage({ text: `Palabra '${deck}' lista.`, isError: false });
            } else if (dataWithIds.length > 0) { 
                setAppMessage({ text: `¡Has completado '${deck}'!`, isError: false });
            } else { 
                setAppMessage({ text: `La palabra '${deck}' no tiene tarjetas.`, isError: true });
            }

        } catch (error) {
            console.error("Error fatal al cargar flashcards:", error);
            setAppMessage({ text: `Error al cargar ${deck}: ${error.message}`, isError: true });
            setMasterData([]);
            setFilteredData([]);
        } finally {
            setIsLoading(false);
        }
    }, []); 

    useEffect(() => {
        const fetchDeckNames = async () => {
            setAppMessage({ text: 'Buscando palabras disponibles...', isError: false });

            try {
                const response = await fetch(`${API_URL}/api/available-flashcards-files`);
                if (!response.ok) throw new Error('No se pudo cargar la lista de archivos.');

                const result = await response.json();

                if (!result.success || !Array.isArray(result.files)) {
                    throw new Error('La respuesta de la API no es válida.');
                }

                const rawDeckNames = result.files.map(name => name.replace('.json', ''));
                setDeckNames(rawDeckNames);

                if (rawDeckNames.length > 0) {
                    setCurrentDeckName(rawDeckNames[0]);
                } else {
                    setAppMessage({ text: 'No se encontraron archivos de palabras.', isError: true });
                    setIsLoading(false); 
                }

            } catch (error) {
                console.error("Error al cargar nombres de decks:", error);
                setAppMessage({ text: `Error al cargar lista: ${error.message}`, isError: true });
                setIsLoading(false); 
            }
        };

        fetchDeckNames();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (currentDeckName) {
            fetchFlashcards(currentDeckName);
        }
    }, [currentDeckName, fetchFlashcards]);

    const handleDeckChange = useCallback((newDeck) => {
        if (newDeck !== currentDeckName) {
            setCurrentDeckName(newDeck); 
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
        if (filteredData.length === 0 || !currentDeckName) return; 

        const cardToMark = filteredData[currentIndex];
        if (!cardToMark) return; 

        try {
            const response = await fetch(`${API_URL}/api/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deck: currentDeckName,
                    index: cardToMark.id, 
                    learned: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al actualizar estado en API.');
            }

            const updatedMasterData = masterData.map(card =>
                card.id === cardToMark.id ? { ...card, learned: true } : card
            );
            setMasterData(updatedMasterData);

            const newFilteredData = updatedMasterData.filter(card => !card.learned);
            setFilteredData(newFilteredData);

            if (newFilteredData.length === 0) {
                setCurrentIndex(0); 
                setAppMessage({ text: `¡Palabra '${currentDeckName}' completada! 🎉`, isError: false });
            } else if (currentIndex >= newFilteredData.length) {
                setCurrentIndex(newFilteredData.length - 1);
                setAppMessage({ text: `Tarjeta '${cardToMark.name}' marcada.`, isError: false });
            } else {
                setAppMessage({ text: `Tarjeta '${cardToMark.name}' marcada.`, isError: false });
            }

        } catch (error) {
            console.error("Error al marcar como aprendida:", error);
            setAppMessage({ text: `Error al guardar: ${error.message}`, isError: true });
        }
    }, [currentIndex, filteredData, masterData, currentDeckName]);

    const handleReset = useCallback(async () => {
        if (!currentDeckName) return; 

        if (window.confirm(`¿Estás seguro de que quieres resetear el progreso de '${currentDeckName}'?`)) {
            try {
                setAppMessage({ text: 'Reseteando...', isError: false });
                const response = await fetch(`${API_URL}/api/reset-all`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deck: currentDeckName }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al resetear en API.');
                }

                fetchFlashcards(currentDeckName); 
                setAppMessage({ text: `Progreso de '${currentDeckName}' reseteado.`, isError: false });

            } catch (error) {
                console.error("Error al resetear:", error);
                setAppMessage({ text: `Error al resetear: ${error.message}`, isError: true });
            }
        }
    }, [currentDeckName, fetchFlashcards]);

    // --- CORRECCIÓN FINAL DE updateCardImagePath ---
    const updateCardImagePath = useCallback((cardId, newPath, defIndex) => { // <-- Recibe defIndex
        console.log(`App: Actualizando imagePath para cardId=${cardId}, defIndex=${defIndex}, newPath=${newPath}`); 
        setMasterData(prevMasterData =>
            prevMasterData.map(card => {
                if (card.id === cardId) {
                    const currentDefinitions = Array.isArray(card.definitions) ? card.definitions : [];
                    if (defIndex < 0 || defIndex >= currentDefinitions.length) {
                        console.error(`App: Índice de definición ${defIndex} fuera de rango para cardId=${cardId}.`);
                        return card; 
                    }
                    const updatedDefinitions = currentDefinitions.map((def, i) => {
                        if (i === defIndex) {
                            return { ...def, imagePath: newPath }; // Actualiza definición correcta
                        }
                        return def;
                    });
                    return { ...card, definitions: updatedDefinitions }; 
                }
                return card; 
            })
        );

        // Actualiza también filteredData
        setFilteredData(prevFilteredData =>
            prevFilteredData.map(card => {
                if (card.id === cardId) {
                    const currentDefinitions = Array.isArray(card.definitions) ? card.definitions : [];
                    if (defIndex < 0 || defIndex >= currentDefinitions.length) {
                        return card;
                    }
                    const updatedDefinitions = currentDefinitions.map((def, i) => {
                        if (i === defIndex) {
                            return { ...def, imagePath: newPath };
                        }
                        return def;
                    });
                    return { ...card, definitions: updatedDefinitions };
                }
                return card;
            })
        );
    }, []); // Dependencias vacías, ¡Correcto!
    // --- FIN CORRECCIÓN FINAL ---

    
    const currentCard = filteredData.length > 0 ? filteredData[currentIndex] : null;

    // ----------------------------------------------------
    // RENDERIZADO
    // ----------------------------------------------------

    if (isLoading && !currentDeckName) {
        return <div className="loading-container"><img src="/loading.gif" alt="Cargando..." /></div>;
    }

    return (
        <>
            <ToneSelector
                toneOptions={toneOptions}
                selectedTone={selectedTone}
                onToneChange={handleToneChange}
            />

            <div className="app-container">
                {isLoading || !currentCard ? (
                    <div className="loading-container"><img src="/loading.gif" alt="Cargando tarjeta..." /></div>
                ) : (
                    filteredData.length === 0 && masterData.length > 0 ? (
                        <div className="all-done-message">
                            ¡Felicidades! Has completado la palabra '{currentDeckName}'. 🎉
                        </div>
                    ) : (
                        <Flashcard
                            key={`${currentDeckName}-${currentCard.id}`}
                            cardData={currentCard}
                            onOpenIpaModal={() => setIsIpaModalOpen(true)}
                            setAppMessage={setAppMessage}
                            updateCardImagePath={updateCardImagePath}
                            currentDeckName={currentDeckName}
                            setIsAudioLoading={setIsAudioLoading}
                            selectedTone={selectedTone}
                        />
                    )
                )}

                <Controls
                    onNext={handleNextCard}
                    onPrev={handlePrevCard}
                    onMarkLearned={handleMarkAsLearned}
                    onReset={handleReset}
                    currentIndex={currentIndex}
                    totalCards={filteredData.length}
                    deckNames={deckNames}
                    onDeckChange={handleDeckChange}
                    currentDeckName={currentDeckName}
                    isAudioLoading={isAudioLoading}
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