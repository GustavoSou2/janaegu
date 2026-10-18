import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import './Invite.css';
import OpeningSequence from '../components/OpeningSequence';
import Countdown from '../components/Countdown';
import RsvpForm from '../components/RsvpForm';
import MessageWall from '../components/MessageWall';
import Reveal from '../components/Reveal';
import VenueMap from '../components/VenueMap';
import { getInviteByToken } from '../lib/families';
import { getSettings } from '../lib/settings';
import { buildGoogleCalendarLink } from '../lib/calendar';

const GIFT_LIST_URL = '';
const HERO_IMAGE_URL =
  'https://cdn-assets-legacy.casar.com/thumb/autoxautox1xx72,257,1064,1282/dados/sitenoivos/wed1562973/custom/tema56_img_color_master_6a7914f40d2891786320116.jpg';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e) => setReduced(e.matches);
    mql.addEventListener?.('change', handler);
    return () => mql.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

function useParallax(reduced) {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced) return;
    function onScroll() {
      if (!ref.current) return;
      const factor = window.innerWidth < 640 ? 0.08 : 0.16;
      ref.current.style.transform = `translateY(${window.scrollY * factor}px)`;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [reduced]);
  return ref;
}

export default function Invite() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [showOpening, setShowOpening] = useState(true);
  const reducedMotion = useReducedMotion();
  const heroRef = useParallax(reducedMotion);

  useEffect(() => {
    let active = true;
    Promise.all([getInviteByToken(token), getSettings()])
      .then(([family, settings]) => {
        if (!active) return;
        if (!family) {
          setState({
            loading: false,
            error: 'Convite não encontrado. Confira o link recebido no WhatsApp.',
            data: null
          });
        } else {
          setState({ loading: false, error: null, data: { family, settings } });
        }
      })
      .catch(() => {
        if (active) {
          setState({ loading: false, error: 'Não deu pra abrir o convite agora. Tenta de novo em instantes.', data: null });
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (state.loading) {
    return <div className="invite-status">Carregando convite…</div>;
  }

  if (state.error) {
    return <div className="invite-status">{state.error}</div>;
  }

  const { family, settings } = state.data;
  const [brideName, groomName] = (settings.coupleNames || 'Janaina & Gustavo').split('&').map((s) => s.trim());
  const mapsUrl = settings.venueAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.venueAddress)}`
    : null;
  const calendarUrl = buildGoogleCalendarLink(settings);

  return (
    <div className="invite">
      {showOpening && <OpeningSequence onComplete={() => setShowOpening(false)} />}

      <section className="invite-hero">
        <div
          className="invite-hero-photo bw-photo"
          ref={heroRef}
          style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
        />
        <div className="invite-hero-gradient" />
        <div className="invite-hero-content">
          <div className="invite-hero-rule" />
          <h1 className="invite-hero-names">
            {brideName}
            <br />
            <span className="invite-hero-amp">&amp;</span>
            <br />
            {groomName}
          </h1>
          <p className="label invite-hero-meta">
            {settings.weddingDateLabel} · {settings.venueName}
          </p>
          <div className="invite-hero-pulse" aria-hidden="true" />
        </div>
      </section>

      <Countdown weddingDateIso={settings.weddingDateIso} />

      <Reveal as="section" className="invite-day">
        <div className="invite-day-grid">
          <div className="invite-day-cell">
            <h6 className="label">Cerimônia</h6>
            <p>20h00</p>
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>Chegue 30 minutos antes</p>
          </div>
          <div className="invite-day-cell">
            <h6 className="label">Recepção</h6>
            <p>Logo após</p>
          </div>
          <div className="invite-day-cell">
            <h6 className="label">Local</h6>
            <p>{settings.venueName}</p>
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>Campinas, SP</p>
          </div>
          <div className="invite-day-cell">
            <h6 className="label">Traje</h6>
            <p>Esporte fino</p>
          </div>
        </div>

        {settings.venueLat != null && settings.venueLng != null ? (
          <VenueMap lat={settings.venueLat} lng={settings.venueLng} label={settings.venueName} />
        ) : (
          <div className="invite-venue-photo bw-photo" />
        )}
        <p style={{ marginTop: 14, color: 'var(--t2)' }}>{settings.venueAddress}</p>
        <div className="invite-day-actions">
          {mapsUrl && (
            <a className="btn btn-ghost" href={mapsUrl} target="_blank" rel="noreferrer">
              Abrir no mapa
            </a>
          )}
          {calendarUrl && (
            <a className="btn btn-ghost" href={calendarUrl} target="_blank" rel="noreferrer">
              Adicionar ao Google Agenda
            </a>
          )}
        </div>
      </Reveal>

      <Reveal as="section" className="invite-rsvp-block">
        <h6 className="label" style={{ color: 'var(--inv-2)' }}>Sua presença</h6>
        <h3 style={{ color: '#fff', margin: '8px 0 20px' }}>{family.familyName}</h3>
        <RsvpForm
          token={token}
          family={family}
          settings={settings}
          onUpdated={(updated) =>
            setState((prev) => ({ ...prev, data: { ...prev.data, family: { ...prev.data.family, ...updated } } }))
          }
        />
      </Reveal>

      <Reveal as="section">
        <MessageWall />
      </Reveal>

      {(settings.giftListUrl || GIFT_LIST_URL) && (
        <Reveal as="section" className="invite-links">
          <a className="btn btn-ghost" href={settings.giftListUrl || GIFT_LIST_URL} target="_blank" rel="noreferrer">
            Ver lista de presentes ↗
          </a>
        </Reveal>
      )}

      <section className="invite-pwa-notice">
        <h6 className="label">Adicionar à tela de início</h6>
        <p>
          Opcional. Serve só pra voltar rápido no dia — nada aqui exige instalar. O WhatsApp continua sendo o
          canal garantido pra qualquer aviso nosso.
        </p>
      </section>

      <section className="invite-closing bw-photo">
        <p className="invite-closing-signature">{settings.coupleNames}</p>
      </section>
    </div>
  );
}
