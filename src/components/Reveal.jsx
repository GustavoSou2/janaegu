import { useEffect, useRef, useState } from 'react';

// Revela o conteúdo quando entra na viewport (IntersectionObserver), com um
// fallback por tempo: se o observer falhar por algum motivo, nada fica invisível.
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const fallback = setTimeout(() => setVisible(true), 2500);

    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return () => clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            clearTimeout(fallback);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
