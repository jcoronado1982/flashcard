// src/features/flashcards/CardBack.jsx
import React from 'react';
import styles from './Flashcard.module.css'; // Reutilizamos los mismos estilos

// Solo necesita los datos de la tarjeta para mostrar
function CardBack({ cardData }) {
    return (
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
                                )}" `
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
    );
}

export default CardBack;