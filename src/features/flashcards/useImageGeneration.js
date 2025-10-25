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

    // --- generateAndLoadImage (Sin cambios) ---
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
            
            const forceFlag = cardData.force_generation;
            
            const res = await fetch(`${API_URL}/api/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    index: cardData.id,
                    def_index: defIndex,
                    prompt,
                    deck: currentDeckName,
                    force_generation: forceFlag
                })
            });
            
            if (!res.ok) {
                if (res.status === 404) {
                    throw new Error("La generación de imagen está deshabilitada para esta tarjeta (force_generation=false).");
                }
                throw new Error(`Error HTTP ${res.status}`);
            }

            const data = await res.json();
            if (!data?.path) throw new Error("Sin ruta de imagen en la respuesta");

            const fullPath = `${API_URL}${data.path}?t=${Date.now()}`;
            
            updateCardImagePath(cardData.id, data.path, defIndex);

            if (imageRef.current) {
                imageRef.current.src = fullPath;
            }
            
            setImageUrl(fullPath); 

            setIsImageLoading(false);
            setAppMessage({
                text: `¡Imagen (Def ${defIndex + 1}) lista!`,
                isError: false
            });

        } catch (err) {
            console.warn(`Error imagen def ${defIndex}:`, err);
            
            if (err.message.includes("deshabilitada") || imageAttempts.current[defIndex] >= MAX_IMAGE_ATTEMPTS) {
                setAppMessage({
                    text: err.message.includes("deshabilitada") ? err.message : `Error final al cargar imagen: ${err.message}`,
                    isError: true
                });
                setIsImageLoading(false); // <-- Importante: detener el spinner
            } else {
                setTimeout(() => generateAndLoadImage(defIndex), IMAGE_RETRY_DELAY);
            }
        }
    }, [cardData, currentDeckName, setAppMessage, updateCardImagePath]);

    
    // --- ¡AQUÍ ESTÁ LA MODIFICACIÓN! ---
    const displayImageForIndex = useCallback((defIndex) => {
        if (!cardData || !cardData.definitions?.[defIndex]) return;

        // 1. Resetear la imagen actual y mostrar el spinner
        //    inmediatamente cuando se selecciona un nuevo ejemplo.
        setImageUrl(null);
        setIsImageLoading(true);

        const definition = cardData.definitions[defIndex];
        
        // 2. Si la imagen ya está mostrada (basado en la URL), no hagas nada.
        //    Esta comprobación va *después* de resetear la UI.
        //    (Quitamos la comprobación de 'imageUrl' de aquí que estaba antes)

        // 3. Continuar con la lógica de carga
        if (definition.imagePath) {
            // Si la imagen existe, cárgala
            const fullPath = `${API_URL}${definition.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                if (imageRef.current) imageRef.current.src = fullPath;
                setImageUrl(fullPath);
                setIsImageLoading(false);
            };
            img.onerror = () => {
                console.warn(`No se pudo cargar la imagen existente en ${fullPath}. Generando una nueva.`);
                generateAndLoadImage(defIndex);
            };
        } else {
            // Si no existe, intenta generarla (respetando force_generation)
            generateAndLoadImage(defIndex);
        }
    }, [cardData, generateAndLoadImage]); // <-- Se quita 'imageUrl' de las dependencias
    // --- FIN DE LA MODIFICACIÓN ---


    // useEffect de carga inicial (Sin cambios)
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