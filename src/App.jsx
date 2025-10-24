// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Flashcard from './features/flashcards/Flashcard';
import Controls from './features/flashcards/Controls';
import IpaModal from './features/flashcards/IpaModal';
import './App.css'; // Asegúrate de que este archivo CSS se importa

const API_URL = 'http://127.0.0.1:8000';

function App() {
    // ----------------------------------------------------
    // ESTADOS GENERALES Y DE DATOS
    // ----------------------------------------------------
    const [masterData, setMasterData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true); // Indica si la app está cargando datos INICIALES o cambiando de deck
    const [isIpaModalOpen, setIsIpaModalOpen] = useState(false);
    const [appMessage, setAppMessage] = useState({ text: '', isError: false });

    // --- NUEVO ESTADO ---
    // Controla si un audio se está cargando (para bloquear controles)
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    // --- FIN NUEVO ESTADO ---

    // ----------------------------------------------------
    // ESTADOS DE TARJETA INDIVIDUAL (Deck Name = Nombre del archivo JSON sin '.json')
    // ----------------------------------------------------
    const [deckNames, setDeckNames] = useState([]);
    const [currentDeckName, setCurrentDeckName] = useState(null);

    // ----------------------------------------------------
    // LÓGICA DE CARGA DE DATOS (Centralizada)
    // ----------------------------------------------------
    const fetchFlashcards = useCallback(async (deck) => {
        if (!deck) return;

        setAppMessage({ text: `Cargando palabra: ${deck}...`, isError: false });
        setIsLoading(true); // Activa el estado de carga al cambiar de deck
        setCurrentIndex(0); // Reinicia el índice al cargar nuevo deck

        try {
            const response = await fetch(`${API_URL}/api/flashcards-data?deck=${deck}`);
            if (!response.ok) throw new Error('No se pudo cargar los datos desde la API.');

            let data = await response.json();
            if (!Array.isArray(data)) {
                data = [data]; // Asegura que sea un array
            }

            // Asigna un ID único basado en el índice original
            const dataWithIds = data.map((card, index) => ({ ...card, id: index }));

            setMasterData(dataWithIds); // Guarda todos los datos originales
            const unlearnedCards = dataWithIds.filter(card => !card.learned); // Filtra los no aprendidos
            setFilteredData(unlearnedCards); // Actualiza los datos filtrados para mostrar

            if (unlearnedCards.length > 0) {
                setAppMessage({ text: `Palabra '${deck}' lista.`, isError: false });
            } else if (dataWithIds.length > 0) { // Si hay datos pero todos están aprendidos
                setAppMessage({ text: `¡Has completado '${deck}'!`, isError: false });
            } else { // Si el archivo JSON estaba vacío
                setAppMessage({ text: `La palabra '${deck}' no tiene tarjetas.`, isError: true });
            }

        } catch (error) {
            console.error("Error fatal al cargar flashcards:", error);
            setAppMessage({ text: `Error al cargar ${deck}: ${error.message}`, isError: true });
            setMasterData([]); // Limpia datos en caso de error
            setFilteredData([]);
        } finally {
            setIsLoading(false); // Desactiva el estado de carga
        }
    }, []); // No necesita dependencias aquí

    // ----------------------------------------------------
    // EFECTO 1: Cargar la lista de nombres de decks (al inicio)
    // ----------------------------------------------------
    useEffect(() => {
        const fetchDeckNames = async () => {
            // No establecemos isLoading aquí, se maneja en fetchFlashcards
            setAppMessage({ text: 'Buscando palabras disponibles...', isError: false });

            try {
                const response = await fetch(`${API_URL}/api/available-flashcards-files`);
                if (!response.ok) throw new Error('No se pudo cargar la lista de archivos.');

                const result = await response.json();

                if (!result.success || !Array.isArray(result.files)) {
                    throw new Error('La respuesta de la API no es válida.');
                }

                // Obtiene nombres sin .json
                const rawDeckNames = result.files.map(name => name.replace('.json', ''));
                setDeckNames(rawDeckNames);

                // Establece el primer deck como activo si hay alguno
                if (rawDeckNames.length > 0) {
                    // No llamamos a fetchFlashcards aquí, el Efecto 2 se encargará
                    setCurrentDeckName(rawDeckNames[0]);
                } else {
                    setAppMessage({ text: 'No se encontraron archivos de palabras.', isError: true });
                    setIsLoading(false); // No hay nada que cargar
                }

            } catch (error) {
                console.error("Error al cargar nombres de decks:", error);
                setAppMessage({ text: `Error al cargar lista: ${error.message}`, isError: true });
                setIsLoading(false); // Detiene la carga si falla
            }
        };

        fetchDeckNames();
        // Se ejecuta solo una vez al montar el componente
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ----------------------------------------------------
    // EFECTO 2: Recarga las flashcards cuando cambia el deck seleccionado
    // ----------------------------------------------------
    useEffect(() => {
        // Solo llama a fetchFlashcards si currentDeckName tiene un valor
        if (currentDeckName) {
            fetchFlashcards(currentDeckName);
        }
        // Depende de currentDeckName y la función fetchFlashcards
    }, [currentDeckName, fetchFlashcards]);

    // ----------------------------------------------------
    // MANEJADORES DE NAVEGACIÓN Y ACCIÓN
    // ----------------------------------------------------

    // Cambia el deck activo
    const handleDeckChange = useCallback((newDeck) => {
        if (newDeck !== currentDeckName) {
            setCurrentDeckName(newDeck); // Esto dispara el Efecto 2
        }
    }, [currentDeckName]);

    // Va a la siguiente tarjeta
    const handleNextCard = useCallback(() => {
        if (filteredData.length > 0) {
            setCurrentIndex(prev => (prev + 1) % filteredData.length);
        }
    }, [filteredData.length]);

    // Va a la tarjeta anterior
    const handlePrevCard = useCallback(() => {
        if (filteredData.length > 0) {
            setCurrentIndex(prev => (prev - 1 + filteredData.length) % filteredData.length);
        }
    }, [filteredData.length]);

    // Marca la tarjeta actual como aprendida
    const handleMarkAsLearned = useCallback(async () => {
        if (filteredData.length === 0 || !currentDeckName) return; // No hacer nada si no hay tarjetas o deck

        const cardToMark = filteredData[currentIndex];
        if (!cardToMark) return; // Seguridad extra

        try {
            // Llama a la API para actualizar el estado en el backend
            const response = await fetch(`${API_URL}/api/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deck: currentDeckName,
                    index: cardToMark.id, // Usa el ID original
                    learned: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al actualizar estado en API.');
            }

            // Actualiza el estado local (masterData) para reflejar el cambio
            const updatedMasterData = masterData.map(card =>
                card.id === cardToMark.id ? { ...card, learned: true } : card
            );
            setMasterData(updatedMasterData);

            // Vuelve a filtrar los datos para quitar la tarjeta aprendida
            const newFilteredData = updatedMasterData.filter(card => !card.learned);
            setFilteredData(newFilteredData);

            // Ajusta el índice actual si es necesario
            if (newFilteredData.length === 0) {
                // Si era la última tarjeta
                setCurrentIndex(0); // Reinicia índice
                setAppMessage({ text: `¡Palabra '${currentDeckName}' completada! 🎉`, isError: false });
            } else if (currentIndex >= newFilteredData.length) {
                // Si se marcó la última de la lista filtrada, ajusta al nuevo último índice
                setCurrentIndex(newFilteredData.length - 1);
                setAppMessage({ text: `Tarjeta '${cardToMark.name}' marcada.`, isError: false });
            } else {
                // Si no era la última, el índice actual ahora muestra la siguiente tarjeta automáticamente
                setAppMessage({ text: `Tarjeta '${cardToMark.name}' marcada.`, isError: false });
            }

        } catch (error) {
            console.error("Error al marcar como aprendida:", error);
            setAppMessage({ text: `Error al guardar: ${error.message}`, isError: true });
        }
        // Depende de las variables usadas dentro
    }, [currentIndex, filteredData, masterData, currentDeckName]);

    // Resetea el progreso del deck actual
    const handleReset = useCallback(async () => {
        if (!currentDeckName) return; // No resetear si no hay deck

        if (window.confirm(`¿Estás seguro de que quieres resetear el progreso de '${currentDeckName}'?`)) {
            try {
                setAppMessage({ text: 'Reseteando...', isError: false });
                // Llama a la API para resetear en el backend
                const response = await fetch(`${API_URL}/api/reset-all`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deck: currentDeckName }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error al resetear en API.');
                }

                // Si la API tuvo éxito, actualiza el estado local inmediatamente
                const resetMasterData = masterData.map(card => ({
                    ...card,
                    learned: false,
                }));
                setMasterData(resetMasterData);
                setFilteredData(resetMasterData); // Muestra todas las tarjetas de nuevo
                setCurrentIndex(0); // Vuelve a la primera
                setAppMessage({ text: `Progreso de '${currentDeckName}' reseteado.`, isError: false });

            } catch (error) {
                console.error("Error al resetear:", error);
                setAppMessage({ text: `Error al resetear: ${error.message}`, isError: true });
            }
        }
        // Depende solo de currentDeckName y masterData para resetear el estado local
    }, [currentDeckName, masterData]);

    // Actualiza la ruta de la imagen en el estado local (llamado desde Flashcard)
    const updateCardImagePath = useCallback((cardId, newPath) => {
        const updateData = (data) => data.map(card =>
            card.id === cardId ? { ...card, imagePath: newPath } : card
        );
        setMasterData(prev => updateData(prev));
        setFilteredData(prev => updateData(prev));
    }, []); // No tiene dependencias externas

    // Obtiene la tarjeta actual basada en el índice y los datos filtrados
    const currentCard = filteredData.length > 0 ? filteredData[currentIndex] : null;

    // ----------------------------------------------------
    // RENDERIZADO
    // ----------------------------------------------------

    // Estado inicial de carga antes de seleccionar el primer deck
    if (isLoading && !currentDeckName) {
        return <div className="loading-container"><img src="/loading.gif" alt="Cargando..." /></div>;
    }

    // Renderiza el componente principal
    return (
        <>
            {/* Usa la clase 'app-container' para el centrado general */}
            <div className="app-container">

                {/* Muestra carga si está cambiando de deck o si no hay tarjeta actual */}
                {isLoading || !currentCard ? (
                    <div className="loading-container"><img src="/loading.gif" alt="Cargando tarjeta..." /></div>
                ) : (
                    // Muestra mensaje de completado si no hay tarjetas filtradas pero sí hay en masterData
                    filteredData.length === 0 && masterData.length > 0 ? (
                        <div className="all-done-message">
                            ¡Felicidades! Has completado la palabra '{currentDeckName}'. 🎉
                        </div>
                    ) : (
                        // Renderiza la Flashcard si hay datos
                        <Flashcard
                            // Key ayuda a React a resetear el estado del componente Flashcard al cambiar de deck o tarjeta
                            key={`${currentDeckName}-${currentCard.id}`}
                            cardData={currentCard}
                            onOpenIpaModal={() => setIsIpaModalOpen(true)}
                            setAppMessage={setAppMessage}
                            updateCardImagePath={updateCardImagePath}
                            currentDeckName={currentDeckName} // Pasa el nombre del deck actual
                            // --- PROP NUEVA ---
                            setIsAudioLoading={setIsAudioLoading}
                            // --- FIN PROP NUEVA ---
                        />
                    )
                )}


                {/* Siempre muestra los controles */}
                <Controls
                    onNext={handleNextCard}
                    onPrev={handlePrevCard}
                    onMarkLearned={handleMarkAsLearned}
                    onReset={handleReset}
                    currentIndex={currentIndex}
                    totalCards={filteredData.length} // Usa el total filtrado para el contador
                    deckNames={deckNames} // Lista de decks para el selector
                    onDeckChange={handleDeckChange} // Función para cambiar de deck
                    currentDeckName={currentDeckName} // Deck actualmente seleccionado
                    // --- PROP NUEVA ---
                    isAudioLoading={isAudioLoading}
                    // --- FIN PROP NUEVA ---
                />
            </div>

            {/* Renderiza el modal si está abierto */}
            {isIpaModalOpen && <IpaModal onClose={() => setIsIpaModalOpen(false)} />}

            {/* Muestra mensajes de estado/error */}
            <div id="message" style={{ color: appMessage.isError ? '#D32F2F' : '#333' }}>
                {appMessage.text}
            </div>
        </>
    );
}

export default App;