import { useEffect, useRef, useState, useCallback } from 'react';
import PollutionMap from './PollutionMap';
import Filters from './Filters';
import Legend from './Legend';
import StatsPanel from './StatsPanel';
import ViewSwitcher from './ViewSwitcher';
import DataTable from './DataTable';

// Scroll-triggered animation hook
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

function Section({ children, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <section ref={ref} className={`landing-section ${className} ${visible ? 'revealed' : ''}`}>
      {children}
    </section>
  );
}

function AnimatedStat({ value, suffix = '', label }) {
  const [ref, visible] = useReveal();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const end = parseInt(value);
    const duration = 1500;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [visible, value]);

  return (
    <div ref={ref} className={`stat-counter ${visible ? 'revealed' : ''}`}>
      <div className="stat-counter-value">{count}{suffix}</div>
      <div className="stat-counter-label">{label}</div>
    </div>
  );
}

// Embedded map section
function MapSection() {
  const [filters, setFilters] = useState({});
  const [flyTo, setFlyTo] = useState(null);
  const [stations, setStations] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [view, setView] = useState('clusters');
  const [fullscreen, setFullscreen] = useState(false);
  const mapContainerRef = useRef(null);

  const hasDateFilter = !!(filters.dateFrom || filters.dateTo);

  const handleStatsUpdate = useCallback((stationsList, allItems) => {
    setStations(stationsList);
    setTotalItems(allItems.length);
  }, []);

  function handleFlyTo(lat, lng, zoom) {
    setFlyTo({ lat, lng, zoom, _t: Date.now() });
  }

  function toggleFullscreen() {
    const next = !fullscreen;
    setFullscreen(next);
    document.body.style.overflow = next ? 'hidden' : '';
    // Leaflet needs multiple resize triggers to recalculate properly
    [50, 200, 500].forEach(delay => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), delay);
    });
  }

  const clusterCount = totalItems - stations.length;

  return (
    <div ref={mapContainerRef} className={`map-embed ${fullscreen ? 'map-fullscreen' : ''}`}>
      <div className="map-embed-header">
        <div className="map-embed-title">
          <div className="header-logo" />
          <span>Air<em>Viz</em></span>
          <span className="map-embed-count">
            {view === 'table' ? stations.length : totalItems} {view === 'table' ? 'stations' : 'elements'}
            {clusterCount > 0 && view === 'clusters' && ` (${clusterCount} clusters)`}
          </span>
        </div>
        <button className="fullscreen-btn" onClick={toggleFullscreen}>
          {fullscreen ? '✕ Quitter' : '⛶ Plein ecran'}
        </button>
      </div>
      <div className="map-embed-body">
        <aside className="sidebar">
          <Filters onFilter={setFilters} onFlyTo={handleFlyTo} loading={false} />
          <Legend />
          <StatsPanel stations={stations} />
        </aside>
        <div className="map-wrapper">
          <ViewSwitcher view={view} onViewChange={setView} />
          {view === 'table' ? (
            <DataTable stations={stations} hasDateFilter={hasDateFilter} />
          ) : (
            <PollutionMap
              filters={filters}
              flyTo={flyTo}
              onStatsUpdate={handleStatsUpdate}
              view={view}
              hasDateFilter={hasDateFilter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing">

      {/* ── Hero ──────────────────────────── */}
      <section className="hero-section">
        <div className="hero-particles">
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              opacity: 0.1 + Math.random() * 0.3,
            }} />
          ))}
        </div>
        <div className="hero-content">
          <div className="hero-badge">Challenge 48h — Y.02</div>
          <h1 className="hero-title">
            Respirez-vous<br />
            un air <em>sain</em> ?
          </h1>
          <p className="hero-subtitle">
            Visualisez en temps reel la qualite de l'air sur tout le territoire francais.
            106 stations, 9 polluants, une carte interactive.
          </p>
          <a href="#carte" className="hero-cta">
            Explorer la carte
            <span className="cta-arrow">→</span>
          </a>
        </div>
        <div className="hero-scroll-hint">
          <div className="scroll-line" />
          <span>Decouvrir</span>
        </div>
      </section>

      {/* ── Le constat ────────────────────── */}
      <Section className="constat-section">
        <div className="section-inner">
          <div className="section-label">Le constat</div>
          <h2 className="section-heading">
            La pollution de l'air est la <em>premiere cause</em> de mortalite environnementale en France.
          </h2>
          <div className="constat-stats">
            <AnimatedStat value="48000" label="deces prematures par an en France lies a la pollution" />
            <AnimatedStat value="100" suffix="Md€" label="cout annuel de la pollution pour la societe francaise" />
            <AnimatedStat value="9" suffix="/10" label="personnes dans le monde respirent un air pollue (OMS)" />
          </div>
        </div>
      </Section>

      {/* ── Comment ca marche ─────────────── */}
      <Section className="howto-section">
        <div className="section-inner">
          <div className="section-label">Comment ca marche</div>
          <h2 className="section-heading">
            De la donnee brute a la <em>visualisation</em>
          </h2>
          <div className="howto-steps">
            <div className="howto-step">
              <div className="step-number">01</div>
              <div className="step-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M24 4v8M24 36v8M4 24h8M36 24h8" />
                  <circle cx="24" cy="24" r="12" strokeDasharray="4 3" />
                  <path d="M24 18v6l4 3" />
                </svg>
              </div>
              <h3>Collecte</h3>
              <p>Un worker interroge automatiquement les sources de donnees gouvernementales toutes les 5 minutes et stocke les mesures en base de donnees.</p>
            </div>
            <div className="howto-step">
              <div className="step-number">02</div>
              <div className="step-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 38l10-14 8 8 10-16 8 10" />
                  <circle cx="16" cy="24" r="2" fill="currentColor" />
                  <circle cx="24" cy="32" r="2" fill="currentColor" />
                  <circle cx="34" cy="16" r="2" fill="currentColor" />
                </svg>
              </div>
              <h3>Analyse</h3>
              <p>Les donnees de pollution et de meteo sont croisees pour calculer un indice de qualite de l'air de 0 a 100.</p>
            </div>
            <div className="howto-step">
              <div className="step-number">03</div>
              <div className="step-icon">
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M24 4C14 4 6 12 6 22c0 12 18 22 18 22s18-10 18-22c0-10-8-18-18-18z" />
                  <circle cx="24" cy="22" r="6" />
                  <circle cx="24" cy="22" r="2" fill="currentColor" />
                </svg>
              </div>
              <h3>Visualisation</h3>
              <p>Chaque station apparait sur une carte interactive. Cliquez pour le detail, filtrez par region ou niveau de pollution.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Fonctionnalites ───────────────── */}
      <Section className="features-section">
        <div className="section-inner">
          <div className="section-label">Fonctionnalites</div>
          <h2 className="section-heading">
            Tout ce qu'il faut pour <em>comprendre</em> l'air que vous respirez
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="16" cy="16" r="12" />
                  <path d="M16 8v8l5 3" />
                </svg>
              </div>
              <h4>Temps reel</h4>
              <p>Donnees actualisees automatiquement toutes les 5 minutes depuis les sources officielles.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M16 2C10 2 5 7 5 13c0 8 11 17 11 17s11-9 11-17c0-6-5-11-11-11z" />
                  <circle cx="16" cy="13" r="4" />
                </svg>
              </div>
              <h4>106 stations</h4>
              <p>Couverture complete : metropolitaine, outre-mer, zones urbaines, industrielles et rurales.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 24h4v-8h-4zM12 24h4v-14h-4zM20 24h4v-10h-4zM28 24h-1V6" />
                  <path d="M3 28h26" />
                </svg>
              </div>
              <h4>Filtrage avance</h4>
              <p>Filtrez par periode, par ville ou region, par niveau d'indice. Tous les filtres sont combinables.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="22" cy="14" r="4" />
                  <circle cx="16" cy="22" r="6" />
                </svg>
              </div>
              <h4>Clustering</h4>
              <p>Les stations proches se regroupent automatiquement au dezoom pour une lecture claire.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="4" y="4" width="24" height="24" rx="3" />
                  <path d="M4 11h24M4 18h24M12 4v24M20 4v24" />
                </svg>
              </div>
              <h4>Vue tableau</h4>
              <p>Basculez entre la carte et un tableau de donnees triable pour comparer les stations.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M16 4l-3 8h-9l7 5.5-2.5 8.5 7.5-5 7.5 5-2.5-8.5 7-5.5h-9z" />
                </svg>
              </div>
              <h4>9 polluants</h4>
              <p>PM2.5, PM10, NO₂, O₃, SO₂, CO, NOx, NO, Benzene — chaque mesure detaillee.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Carte integree ────────────────── */}
      <Section className="carte-section" id="carte">
        <div className="section-inner section-inner-wide">
          <div className="section-label">Carte interactive</div>
          <h2 className="section-heading">
            Explorez la qualite de l'air <em>en direct</em>
          </h2>
          <MapSection />
        </div>
      </Section>

      {/* ── En chiffres ───────────────────── */}
      <Section className="data-section">
        <div className="section-inner">
          <div className="section-label">En chiffres</div>
          <h2 className="section-heading">
            Une couverture <em>nationale</em>
          </h2>
          <div className="data-counters">
            <AnimatedStat value="106" label="stations de mesure" />
            <AnimatedStat value="20352" label="mesures en base" />
            <AnimatedStat value="9" label="polluants surveilles" />
            <AnimatedStat value="50" suffix="+" label="villes et regions" />
          </div>
        </div>
      </Section>

      {/* ── Footer ────────────────────────── */}
      <footer className="landing-footer">
        <p>AirViz — Challenge 48h Y.02 — Equipe Dev</p>
        <p>Donnees : data.gouv.fr (LCSQA + Meteo-France SYNOP)</p>
      </footer>
    </div>
  );
}
