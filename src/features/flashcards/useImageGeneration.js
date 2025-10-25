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
    const imageRef = useRef(null);
    const imageAttempts = useRef({});

    const generateAndLoadImage = useCallback(async (defIndex = 0) => {
        if (!cardData || !cardData.definitions?.[defIndex]) return;

        if (!imageAttempts.current[defIndex]) {
            imageAttempts.current[defIndex] = 0;
        }

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
                    force_generation: !def.imagePath
                })
            });

            if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
            const data = await res.json();
            if (!data?.path) throw new Error("Sin ruta de imagen en la respuesta");

            const fullPath = `${API_URL}${data.path}?t=${Date.now()}`;
            
            updateCardImagePath(cardData.id, data.path, defIndex);

            if (imageRef.current) {
                imageRef.current.src = fullPath;
            }
            
            // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
            // Antes decía: setImageUrl((prev) => prev || fullPath);
            // Ahora siempre actualiza a la nueva imagen generada.
            setImageUrl(fullPath); 
            // ---------------------------------

            setIsImageLoading(false);
            setAppMessage({
                text: `¡Imagen (Def ${defIndex + 1}) lista!`,
                isError: false
            });

        } catch (err) {
            console.warn(`Error imagen def ${defIndex}:`, err);
            if (imageAttempts.current[defIndex] < MAX_IMAGE_ATTEMPTS) {
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

    
    const displayImageForIndex = useCallback((defIndex) => {
        if (!cardData || !cardData.definitions?.[defIndex]) return;

        const definition = cardData.definitions[defIndex];

        // Evitar recargar si la imagen ya está mostrada
        if (imageUrl?.startsWith(`${API_URL}${definition.imagePath}`)) {
            return;
        }

        if (definition.imagePath) {
            // Si la imagen existe, solo cárgala
            setIsImageLoading(true);
            const fullPath = `${API_URL}${definition.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                if (imageRef.current) imageRef.current.src = fullPath;
                setImageUrl(fullPath); // Esta línea ya estaba correcta
                setIsImageLoading(false);
            };
            img.onerror = () => {
                console.warn(`No se pudo cargar la imagen existente en ${fullPath}. Generando una nueva.`);
                generateAndLoadImage(defIndex);
            };
        } else {
            // Si no existe, usa la lógica de generación
            generateAndLoadImage(defIndex);
        }
    }, [cardData, generateAndLoadImage, imageUrl]);


    // useEffect de carga inicial (sin cambios)
    useEffect(() => {
        if (!cardData) return;
        setIsImageLoading(true);
        setImageUrl(null);
        imageAttempts.current = {};
        const firstDefinition = cardData.definitions?.[0];
        if (firstDefinition?.imagePath) {
            const fullPath = `${API_URL}${firstDefinition.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                if (imageRef.current) imageRef.current.src = fullPath;
                setImageUrl(fullPath);
                setIsImageLoading(false);
            };
            img.onerror = () => generateAndLoadImage(0);
        } else {
            generateAndLoadImage(0);
        }
    }, [cardData, generateAndLoadImage]);


    return { isImageLoading, imageUrl, imageRef, displayImageForIndex };
}