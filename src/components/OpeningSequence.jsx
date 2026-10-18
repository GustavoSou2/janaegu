import { useEffect, useRef, useState } from 'react';
import './OpeningSequence.css';

const PHRASES = [
  'Está chegando o grande dia',
  'E se este convite chegou até você',
  'É porque vocês são especiais pra gente',
  'Então queremos vocês lá',
  'Fazendo parte desse dia com a gente'
];

const PHRASE_DURATION_MS = 3400;

export default function OpeningSequence({ onComplete }) {
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onComplete();
      return;
    }
    timerRef.current = setInterval(() => {
      setIndex((current) => {
        if (current >= PHRASES.length - 1) {
          clearInterval(timerRef.current);
          setTimeout(onComplete, PHRASE_DURATION_MS);
          return current;
        }
        return current + 1;
      });
    }, PHRASE_DURATION_MS);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSkip() {
    clearInterval(timerRef.current);
    setSkipped(true);
    onComplete();
  }

  if (skipped) return null;

  return (
    <div className="opening" aria-hidden="true">
      <div className="opening-stage">
        {PHRASES.map((phrase, i) => (
          <p
            key={phrase}
            className={
              'opening-phrase ' + (i === index ? 'is-active' : i < index ? 'is-exit' : 'is-enter')
            }
          >
            {phrase}
          </p>
        ))}
      </div>

      <div className="opening-dots">
        {PHRASES.map((phrase, i) => (
          <span key={phrase} className={'opening-dot ' + (i === index ? 'is-active' : '')} />
        ))}
      </div>

      <button className="opening-skip" onClick={handleSkip} type="button">
        pular abertura
      </button>
    </div>
  );
}
