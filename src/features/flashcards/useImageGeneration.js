// src/features/flashcards/useImageGeneration.js
import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = 'http://127.0.0.1:8000';
const MAX_IMAGE_ATTEMPTS = 3;
const IMAGE_RETRY_DELAY = 5000;

export function useImageGeneration({ 
    cardData, 
    currentDeckName, 
    setAppMessage, 
    updateCardImagePath 
}) {
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState(null);
    const imageRef = useRef(null); // Ref para la etiqueta <img>
    const imageAttempts = useRef({});

    const generateAndLoadImage = useCallback(async (defIndex = 0) => {
        if (!cardData || !cardData.definitions?.[defIndex]) return;

        // Inicializar contador de intentos para este índice
        if (!imageAttempts.current[defIndex]) {
            imageAttempts.current[defIndex] = 0;
        }

        // Comprobar si se superaron los intentos
        if (imageAttempts.current[defIndex] >= MAX_IMAGE_ATTEMPTS) {
            setAppMessage({
                text: `Fallaron todos los intentos para imagen def ${defIndex + 1}`,
                isError: true
            });
            setIsImageLoading(false);
            return;
        }

        imageAttempts.current[defIndex]++;
        setIsImageLoading(true);
        setAppMessage({
            text: `⏳ Cargando imagen (Def ${defIndex + 1})...`,
            isError: false
        });

        try {
            const def = cardData.definitions[defIndex];
            const prompt = `Generate a single, clear, educational illustration for the phrasal verb "${cardData.name}" meaning "${def.meaning}". Context: "${def.usage_example}". Style: Photorealistic, bright, daylight. No text or labels.`;

            const res = await fetch(`${API_URL}/api/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index: cardData.id,
                    def_index: defIndex,
                    prompt,
                    deck: currentDeckName,
                    force_generation: !def.imagePath // Forzar si no hay path
                })
            });

            if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
            const data = await res.json();
            if (!data?.path) throw new Error("Sin ruta de imagen en la respuesta");

            const fullPath = `${API_URL}${data.path}?t=${Date.now()}`;
            
            // Notificar a App.jsx sobre la nueva ruta
            updateCardImagePath(cardData.id, data.path, defIndex);

            // Actualizar la imagen en el DOM si la ref existe
            if (imageRef.current) {
                imageRef.current.src = fullPath;
            }
            // Actualizar el estado para el primer renderizado
            setImageUrl((prev) => prev || fullPath); 

            setIsImageLoading(false);
            setAppMessage({
                text: `¡Imagen (Def ${defIndex + 1}) lista!`,
                isError: false
            });

        } catch (err) {
            console.warn(`Error imagen def ${defIndex}:`, err);
            if (imageAttempts.current[defIndex] < MAX_IMAGE_ATTEMPTS) {
                // Reintentar tras un retraso
                setTimeout(() => generateAndLoadImage(defIndex), IMAGE_RETRY_DELAY);
            } else {
                setAppMessage({
                    text: `Error final al cargar imagen: ${err.message}`,
                    isError: true
                });
                setIsImageLoading(false);
            }
        }
    }, [cardData, currentDeckName, setAppMessage, updateCardImagePath]);

    // Efecto para cargar la imagen inicial cuando cardData cambia
    useEffect(() => {
        if (!cardData) return;

        setIsImageLoading(true);
        setImageUrl(null); // Resetear imagen anterior
        imageAttempts.current = {}; // Resetear contadores de intentos

        const firstDefinition = cardData.definitions?.[0];

        if (firstDefinition?.imagePath) {
            // Si ya tenemos una ruta, intentamos cargarla
            const fullPath = `${API_URL}${firstDefinition.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                if (imageRef.current) imageRef.current.src = fullPath;
                setImageUrl(fullPath);
                setIsImageLoading(false);
            };
            // Si falla la carga de una imagen existente, generar una nueva
            img.onerror = () => {
                console.warn(`No se pudo cargar la imagen existente en ${fullPath}. Generando una nueva.`);
                generateAndLoadImage(0);
            };
        } else {
            // Si no hay ruta, generar una nueva
            generateAndLoadImage(0);
        }
    }, [cardData, generateAndLoadImage]); // Depende de cardData y la función de generación

    return { isImageLoading, imageUrl, imageRef };
}