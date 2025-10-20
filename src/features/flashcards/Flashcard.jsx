import React, { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://127.0.0.1:8000';
const audioPlayer = new Audio();

function Flashcard({ cardData, onOpenIpaModal, setAppMessage, updateCardImagePath }) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [imageUrl, setImageUrl] = useState(null);
    const [blurredState, setBlurredState] = useState({});
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [activeAudioText, setActiveAudioText] = useState(null);
    const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

    const generateAndLoadImage = useCallback(async () => {
        if (!cardData) return;
        setIsImageLoading(true);
        setAppMessage({ text: '⏳ Generando imagen de IA...', isError: false });
        try {
            const def = cardData.definitions[0];
            const prompt = `Generate a single, clear, educational illustration for the phrasal verb "${cardData.name}" meaning "${def.meaning}". Context: "${def.usage_example}". Style: Photorealistic, bright, daylight. No text or labels.`;
            const response = await fetch(`${API_URL}/api/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index: cardData.id, def_index: 0, prompt })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error en API de imagen.');
            }
            const data = await response.json();
            const newImagePath = `${API_URL}${data.path}?t=${Date.now()}`;
            updateCardImagePath(cardData.id, data.path);
            setImageUrl(newImagePath);
            setAppMessage({ text: '¡Imagen generada!', isError: false });
        } catch (error) {
            setAppMessage({ text: `Error de IA: ${error.message}`, isError: true });
        } finally {
            setIsImageLoading(false);
        }
    }, [cardData, setAppMessage, updateCardImagePath]);

    useEffect(() => {
        if (!cardData) return;
        setIsFlipped(false);
        setIsImageLoading(true);
        setImageUrl(null);
        setBlurredState(cardData.definitions.reduce((acc, _, index) => ({ ...acc, [index]: true }), {}));
        setActiveAudioText(null);
        setHighlightedWordIndex(-1);

        if (cardData.imagePath) {
            const fullPath = `${API_URL}${cardData.imagePath}?t=${Date.now()}`;
            const img = new Image();
            img.src = fullPath;
            img.onload = () => {
                setImageUrl(fullPath);
                setIsImageLoading(false);
            };
            img.onerror = () => generateAndLoadImage();
        } else {
            generateAndLoadImage();
        }
    }, [cardData, generateAndLoadImage]);

    const playAudio = useCallback(async (text) => {
        if (isAudioPlaying) {
            audioPlayer.pause();
            audioPlayer.ontimeupdate = null;
        }
        setHighlightedWordIndex(-1);
        setActiveAudioText(text);
        setIsAudioPlaying(true);
        setAppMessage({ text: '⏳ Cargando audio...', isError: false });

        try {
            const response = await fetch(`${API_URL}/api/synthesize-speech`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice_name: "Achernar", model_name: "gemini-2.5-pro-tts" })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error en API de voz.');
            }
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            const words = text.trim().split(/\s+/);
            const SYNC_OFFSET = 0.15;

            audioPlayer.ontimeupdate = () => {
                const audioDuration = audioPlayer.duration;
                if (!audioDuration) return;
                const timePerWord = audioDuration / words.length;
                const currentTime = audioPlayer.currentTime + SYNC_OFFSET;
                const currentWordIndex = Math.floor(currentTime / timePerWord);
                setHighlightedWordIndex(currentWordIndex);
            };

            audioPlayer.play().catch(e => { throw new Error("No se pudo iniciar la reproducción.") });
            setAppMessage({ text: '▶️ Reproduciendo...', isError: false });

            audioPlayer.onended = () => {
                setIsAudioPlaying(false);
                setAppMessage({ text: 'Audio finalizado.', isError: false });
                URL.revokeObjectURL(audioUrl);
                setHighlightedWordIndex(-1);
                setActiveAudioText(null);
                audioPlayer.ontimeupdate = null;
            };
        } catch (error) {
            setAppMessage({ text: `Error de audio: ${error.message}`, isError: true });
            setIsAudioPlaying(false);
            setActiveAudioText(null);
            setHighlightedWordIndex(-1);
        }
    }, [isAudioPlaying, setAppMessage]);


    if (!cardData) return <div className="flashcard-container" />;
    
    const toggleBlur = (index) => setBlurredState(prev => ({ ...prev, [index]: !prev[index] }));

    return (
        <div className="flashcard-container">
            <div className={`card ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(p => !p)}>
                <div className="card-front">
                    <button id="soundButton" onClick={(e) => { e.stopPropagation(); playAudio(cardData.name); }}>🔊</button>
                    <h2 id="name">
                        {cardData.name.split(' ').map((word, index) => (
                            <span key={index} className={activeAudioText === cardData.name && highlightedWordIndex === index ? 'highlighted-word' : ''}>
                                {word}{' '}
                            </span>
                        ))}
                    </h2>
                    <div className="phonetic-container">
                        <p className="phonetic">{cardData.phonetic}</p>
                        <button id="ipaChartBtn" onClick={(e) => { e.stopPropagation(); onOpenIpaModal(); }}>📖</button>
                    </div>
                    <div id="allExamplesContainer">
                        <ul>
                            {cardData.definitions.map((def, defIndex) => (
                                <li key={defIndex}>
                                    <button onClick={(e) => { e.stopPropagation(); playAudio(def.usage_example); }}>🔊</button>
                                    <div className={blurredState[defIndex] ? 'blurred-text' : ''} onClick={(e) => { e.stopPropagation(); toggleBlur(defIndex); }}>
                                        {def.usage_example.split(' ').map((word, wordIndex) => (
                                            <span key={wordIndex} className={activeAudioText === def.usage_example && highlightedWordIndex === wordIndex ? 'highlighted-word' : ''}>
                                                {word}{' '}
                                            </span>
                                        ))}
                                    </div>
                                    <span className="custom-tooltip">{def.pronunciation_guide_es}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div id="imagePlaceholder">
                        {isImageLoading ? (
                            <img src="/loading.gif" alt="Cargando..." style={{ width: '100px', height: '100px' }} />
                        ) : (
                            imageUrl && <img id="image" src={imageUrl} alt={cardData.name} style={{ opacity: 1 }} />
                        )}
                    </div>
                </div>
                <div className="card-back">
                    {cardData.definitions.map((def, index) => (
                         <div key={index} className="definition-block-back">
                             <p className="meaning-sentence">
                                <span className="phrasal-verb-back">{cardData.name}</span> significa <strong className="meaning-back">{def.meaning}</strong>
                             </p>
                             <p 
                                className="usage-example-en"
                                dangerouslySetInnerHTML={{ 
                                    __html: `"${def.usage_example.replace(new RegExp(`\\b(${cardData.name})\\b`, 'gi'), `<strong>$1</strong>`)}"`
                                }}
                             />
                             {def.alternative_example && (
                                <p className="alternative-example">
                                    <em>Alternativa:</em> "{def.alternative_example}"
                                </p>
                             )}
                             <p className="usage-example-es">{def.usage_example_es}</p>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Flashcard;