import { useEffect, useState } from 'react';
import { getMessages } from '../lib/api';

export default function MessageWall() {
  const [messages, setMessages] = useState(null); // null = carregando/erro, [] = vazio

  useEffect(() => {
    let active = true;
    getMessages()
      .then((data) => {
        if (active) setMessages(data.messages || []);
      })
      .catch(() => {
        if (active) setMessages(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (messages === null) return null;

  return (
    <section className="message-wall">
      <h6 className="label" style={{ color: 'var(--t2)', marginBottom: 14 }}>Mural de recados</h6>
      {messages.length === 0 ? (
        <p style={{ color: 'var(--t2)' }}>Seja o primeiro a deixar um recado para os noivos!</p>
      ) : (
        <ul className="message-wall-list">
          {messages.map((m, i) => (
            <li key={i}>
              <p>{m.text}</p>
              <span className="label" style={{ color: 'var(--t3)' }}>{m.family}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
