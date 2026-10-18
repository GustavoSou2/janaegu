import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// O build do Leaflet referencia os ícones por caminho relativo, que quebra com
// bundlers como o Vite — por isso montamos o ícone na mão com os assets importados.
const markerIconDefault = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function VenueMap({ lat, lng, label }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || lat == null || lng == null) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      scrollWheelZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    L.marker([lat, lng], { icon: markerIconDefault })
      .addTo(map)
      .bindPopup(label || 'Local do evento');

    return () => map.remove();
  }, [lat, lng, label]);

  if (lat == null || lng == null) return null;

  return (
    <div
      ref={containerRef}
      className="venue-map bw-photo"
      role="img"
      aria-label={`Mapa do local: ${label || 'local do evento'}`}
    />
  );
}
