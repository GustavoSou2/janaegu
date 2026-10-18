import { useEffect, useState } from 'react';

function splitParts(diffMs) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60
  };
}

const pad = (n) => String(n).padStart(2, '0');

export default function Countdown({ weddingDateIso }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!weddingDateIso) {
    return (
      <div className="countdown countdown-placeholder">
        <p className="label" style={{ color: 'var(--t2)' }}>Em breve</p>
      </div>
    );
  }

  const target = new Date(weddingDateIso).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return (
      <div className="countdown">
        <div className="countdown-today">É hoje! 🎉</div>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = splitParts(diff);

  return (
    <div className="countdown" role="timer" aria-live="off">
      {[
        { value: days, label: 'dias' },
        { value: pad(hours), label: 'horas' },
        { value: pad(minutes), label: 'min' },
        { value: pad(seconds), label: 'seg' }
      ].map((cell) => (
        <div className="countdown-cell" key={cell.label}>
          <div className="countdown-value">{cell.value}</div>
          <div className="countdown-label label">{cell.label}</div>
        </div>
      ))}
    </div>
  );
}
