// src/features/flashcards/Flashcard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Flashcard.module.css';

const API_URL = 'http://127.0.0.1:8000';
const audioPlayer = new Audio();
const VOICE_POOL = ["Aoede", "Zephyr", "Charon", "Callirrhoe", "Iapetus", "Achernar", "Gacrux"];

function Flashcard({
  cardData,
  onOpenIpaModal,
  setAppMessage,
  updateCardImagePath,
  currentDeckName,
  setIsAudioLoading,
  selectedTone
}) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState(null);
  const [blurredState, setBlurredState] = useState({});
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [activeAudioText, setActiveAudioText] = useState(null);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

  const imageAttempts = useRef({});
  const MAX_IMAGE_ATTEMPTS = 3;
  const IMAGE_RETRY_DELAY = 5000;

  // ---------- GENERAR Y CARGAR IMAGEN ----------
  const generateAndLoadImage = useCallback(
    async (defIndex = 0) => {
      if (!cardData || !cardData.definitions?.[defIndex]) return;

      if (!imageAttempts.current[defIndex])
        imageAttempts.current[defIndex] = 0;
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
        if (!data?.path) throw new Error("Sin ruta de imagen");

        const fullPath = `${API_URL}${data.path}?t=${Date.now()}`;
        updateCardImagePath(cardData.id, data.path, defIndex);
        setImageUrl(fullPath);
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
            text: `Error final: ${err.message}`,
            isError: true
          });
          setIsImageLoading(false);
        }
      }
    },
    [cardData, currentDeckName, setAppMessage, updateCardImagePath]
  );

  // ---------- CARGAR IMAGEN INICIAL ----------
  useEffect(() => {
    if (!cardData) return;
    setIsFlipped(false);
    setIsImageLoading(true);
    setImageUrl(null);
    setBlurredState(
      cardData.definitions?.reduce(
        (acc, _, i) => ({ ...acc, [i]: true }),
        {}
      ) || {}
    );
    setActiveAudioText(null);
    setHighlightedWordIndex(-1);
    setAppMessage({ text: '', isError: false });
    imageAttempts.current = {};

    const first = cardData.definitions?.[0];
    if (first?.imagePath) {
      const fullPath = `${API_URL}${first.imagePath}?t=${Date.now()}`;
      const img = new Image();
      img.src = fullPath;
      img.onload = () => {
        setImageUrl(fullPath);
        setIsImageLoading(false);
      };
      img.onerror = () => generateAndLoadImage(0);
    } else generateAndLoadImage(0);
  }, [cardData, currentDeckName, generateAndLoadImage, setAppMessage]);

  // ---------- REPRODUCIR AUDIO ----------
  const playAudio = useCallback(
    async (originalText) => {
      if (!originalText) return;

      // No tocar imagen ni tooltips aquí
      if (isAudioPlaying && audioPlayer.src) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        if (audioPlayer.src.startsWith('blob:'))
          URL.revokeObjectURL(audioPlayer.src);
      }

      setHighlightedWordIndex(-1);
      setActiveAudioText(originalText);
      setIsAudioPlaying(true);

      const randomVoice =
        VOICE_POOL[Math.floor(Math.random() * VOICE_POOL.length)];
      const toneToSend = selectedTone?.trim().replace(/:$/, '') || '';

      setIsAudioLoading(true);
      const MAX_ATTEMPTS = 3;
      const RETRY_DELAY = 5000;
      let audioUrl = null;
      let success = false;
      let res;

      try {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            setAppMessage({
              text: `⏳ Generando audio... (${attempt}/${MAX_ATTEMPTS})`,
              isError: false
            });
            res = await fetch(`${API_URL}/api/synthesize-speech`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: originalText,
                voice_name: randomVoice,
                model_name: 'gemini-2.5-pro-tts',
                deck: currentDeckName,
                tone: toneToSend,
                verb_name: cardData.name
              })
            });
            if (res.ok) {
              success = true;
              break;
            }
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Error ${res.status}`);
          } catch (err) {
            if (attempt === MAX_ATTEMPTS) throw err;
            setAppMessage({
              text: `Reintentando audio... (${attempt}/${MAX_ATTEMPTS})`,
              isError: true
            });
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
          }
        }

        if (!success) throw new Error('No se pudo generar el audio.');
        const blob = await res.blob();
        audioUrl = URL.createObjectURL(blob);
        audioPlayer.src = audioUrl;

        const words = originalText.trim().split(/\s+/);
        const SYNC_OFFSET = 0.15;

        audioPlayer.ontimeupdate = () => {
          const { duration, currentTime } = audioPlayer;
          if (!duration || !isFinite(duration)) return;
          const tPerWord = duration / words.length;
          if (!tPerWord || !isFinite(tPerWord)) return;
          const idx = Math.min(
            words.length - 1,
            Math.floor((currentTime + SYNC_OFFSET) / tPerWord)
          );
          setHighlightedWordIndex((p) => (p !== idx ? idx : p));
        };

        audioPlayer.onended = () => {
          setIsAudioPlaying(false);
          setAppMessage({ text: 'Audio finalizado.', isError: false });
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setHighlightedWordIndex(-1);
          setActiveAudioText(null);
          setIsAudioLoading(false);
        };

        await audioPlayer.play();
        setAppMessage({ text: '▶️ Reproduciendo...', isError: false });
      } catch (err) {
        console.error('Error en playAudio:', err);
        setAppMessage({ text: `Error: ${err.message}`, isError: true });
        setIsAudioPlaying(false);
        setActiveAudioText(null);
        setHighlightedWordIndex(-1);
        setIsAudioLoading(false);
        if (audioUrl && audioUrl.startsWith('blob:'))
          URL.revokeObjectURL(audioUrl);
      }
    },
    [isAudioPlaying, setAppMessage, setIsAudioLoading, currentDeckName, selectedTone, cardData.name]
  );

  if (!cardData)
    return <div className={styles.flashcardContainer}>Cargando datos...</div>;

  const toggleBlur = (i) =>
    setBlurredState((p) => ({ ...p, [i]: !p[i] }));

  // ---------- RENDER ----------
  return (
    <div className={styles.flashcardContainer}>
      <div
        className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
        onClick={() => setIsFlipped((p) => !p)}
      >
        <div className={styles.cardFront}>
          <button
            className={styles.soundButton}
            onClick={(e) => {
              e.stopPropagation();
              playAudio(cardData.name);
            }}
          >
            🔊
          </button>

          <h2 className={styles.name}>
            {cardData.name?.split(' ').map((w, i) => (
              <span
                key={i}
                className={
                  activeAudioText === cardData.name &&
                  highlightedWordIndex === i
                    ? styles.highlightedWord
                    : ''
                }
              >
                {w}{' '}
              </span>
            ))}
          </h2>

          <div className={styles.phoneticContainer}>
            <p className={styles.phonetic}>{cardData.phonetic}</p>
            <button
              className={styles.ipaChartBtn}
              onClick={(e) => {
                e.stopPropagation();
                onOpenIpaModal();
              }}
            >
              📖
            </button>
          </div>

          <div className={styles.allExamplesContainer}>
            <ul>
              {cardData.definitions?.map((def, di) => (
                <li key={di}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playAudio(def.usage_example);
                    }}
                  >
                    🔊
                  </button>
                  <div
                    className={blurredState[di] ? styles.blurredText : ''}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBlur(di);
                    }}
                  >
                    {def.usage_example?.split(' ').map((w, wi) => (
                      <span
                        key={wi}
                        className={
                          activeAudioText === def.usage_example &&
                          highlightedWordIndex === wi
                            ? styles.highlightedWord
                            : ''
                        }
                      >
                        {w}{' '}
                      </span>
                    ))}
                  </div>
                  {!blurredState[di] && (
                    <span className={styles.customTooltip}>
                      {def.pronunciation_guide_es}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.imagePlaceholder}>
            {isImageLoading ? (
              <img
                src="/loading.gif"
                alt="Cargando..."
                style={{ width: '100px', height: '100px' }}
              />
            ) : imageUrl ? (
              <img
                className={`${styles.image} ${styles.imageVisible}`}
                src={imageUrl}
                alt={cardData.name || 'Flashcard image'}
              />
            ) : (
              <div className={styles.noImagePlaceholder}>
                Imagen no disponible
              </div>
            )}
          </div>
        </div>

        <div className={styles.cardBack}>
          {cardData.definitions?.map((def, i) => (
            <div key={i} className={styles.definitionBlockBack}>
              <p className={styles.meaningSentence}>
                <span className={styles.phrasalVerbBack}>
                  {cardData.name}
                </span>{' '}
                significa{' '}
                <strong className={styles.meaningBack}>
                  {def.meaning}
                </strong>
              </p>
              <p
                className={styles.usageExampleEn}
                dangerouslySetInnerHTML={{
                  __html: `"${def.usage_example
                    ?.replace(
                      new RegExp(`\\b(${cardData.name})\\b`, 'gi'),
                      '<strong>$1</strong>'
                    )}"`
                }}
              />
              {def.alternative_example && (
                <p className={styles.alternativeExample}>
                  <em>Alternativa:</em> "{def.alternative_example}"
                </p>
              )}
              <p className={styles.usageExampleEs}>
                {def.usage_example_es}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Flashcard;
