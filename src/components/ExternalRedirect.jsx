import { useEffect } from 'react';

// react-router's <Navigate> só redireciona dentro do app (SPA); pra sair pra uma
// URL externa de verdade precisa trocar a própria localização do navegador.
export default function ExternalRedirect({ to }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}
