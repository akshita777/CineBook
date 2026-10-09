import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { movieApi } from '../api/movieApi';
import { MovieCard } from '../components/MovieCard';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';

export const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMovies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await movieApi.getAllMovies();
      setMovies(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load movies from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies();
  }, []);

  return (
    <div style={styles.container}>
      {/* Cinematic Neo-Brutalist Hero */}
      <section style={styles.hero}>
        <div style={styles.heroKickerRow}>
          <span style={styles.heroTag}>YOUR NEXT MOVIE NIGHT</span>
        </div>

        <h1 style={styles.heroTitle}>
          YOUR SEAT. YOUR SHOW.<br />
          <span style={styles.heroAccent}>YOUR NIGHT.</span>
        </h1>

        <p style={styles.heroSubtitle}>
          Discover movies, find your showtime, and book your favourite seat.
        </p>

        <div style={styles.heroActionRow}>
          <a
            href="#catalog"
            style={styles.exploreBtn}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('catalog');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            EXPLORE MOVIES ↓
          </a>
        </div>

        <div style={styles.userStatusStrip}>
          <span style={styles.statusLabel}>SESSION:</span>
          {isAuthenticated ? (
            <span style={styles.statusActive}>
              AUTHENTICATED AS <strong style={styles.statusUser}>{user?.fullName || user?.email}</strong>
            </span>
          ) : (
            <span style={styles.statusGuest}>
              GUEST BROWSING MODE — SIGN IN TO RESERVE SEATS
            </span>
          )}
        </div>
      </section>

      {/* Movies Catalog Section */}
      <section id="catalog" style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleBlock}>
            <span style={styles.sectionSlug}>// INVENTORY</span>
            <h2 style={styles.sectionTitle}>NOW SHOWING</h2>
          </div>
          {!loading && !error && (
            <div style={styles.badgeWrapper}>
              <span style={styles.movieCountBadge}>
                {movies.length} {movies.length === 1 ? 'FEATURE' : 'FEATURES'} AVAILABLE
              </span>
            </div>
          )}
        </div>

        {loading && <Loading message="Querying movie catalog from PostgreSQL..." />}

        {error && <ErrorMessage message={error} onRetry={fetchMovies} />}

        {!loading && !error && movies.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎬</div>
            <h3 style={styles.emptyTitle}>NO MOVIES CURRENTLY AVAILABLE</h3>
            <p style={styles.emptyText}>
              There are no movies listed in the active database. Seed catalog entries or contact the system administrator.
            </p>
          </div>
        )}

        {!loading && !error && movies.length > 0 && (
          <div style={styles.movieGrid}>
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px 0 60px 0',
  },
  hero: {
    backgroundColor: '#121216',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '40px 28px',
    marginBottom: '40px',
    boxShadow: '5px 5px 0px #000000',
    position: 'relative',
  },
  heroKickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  heroTag: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    fontSize: '0.72rem',
    fontWeight: '900',
    letterSpacing: '1.2px',
    padding: '3px 8px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5.5vw, 3.2rem)',
    fontWeight: '900',
    color: '#ffffff',
    margin: '0 0 16px 0',
    letterSpacing: '-0.5px',
    lineHeight: '1.1',
    textTransform: 'uppercase',
  },
  heroAccent: {
    color: '#e50914',
  },
  heroSubtitle: {
    fontSize: '1rem',
    color: '#a8a8b8',
    maxWidth: '720px',
    margin: '0 0 24px 0',
    lineHeight: '1.6',
  },
  heroActionRow: {
    marginBottom: '26px',
  },
  exploreBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '12px 26px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    fontSize: '0.9rem',
    letterSpacing: '0.8px',
    textDecoration: 'none',
    boxShadow: '3px 3px 0px #000000',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  userStatusStrip: {
    backgroundColor: '#0d0d10',
    border: '1px solid #262632',
    borderRadius: '2px',
    padding: '10px 16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    letterSpacing: '0.5px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    maxWidth: '100%',
    flexWrap: 'wrap',
  },
  statusLabel: {
    color: '#707080',
    fontWeight: '800',
  },
  statusActive: {
    color: '#22c55e',
    fontWeight: '700',
  },
  statusUser: {
    color: '#ffffff',
  },
  statusGuest: {
    color: '#9898a6',
    fontWeight: '600',
  },
  section: {
    marginTop: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '28px',
    borderBottom: '2px solid #262632',
    paddingBottom: '14px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  sectionTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionSlug: {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#e50914',
    letterSpacing: '1px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: '900',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  badgeWrapper: {
    alignSelf: 'center',
  },
  movieCountBadge: {
    backgroundColor: '#181820',
    border: '1.5px solid #343444',
    color: '#c4c4d4',
    padding: '6px 12px',
    borderRadius: '2px',
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '0.8px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    boxShadow: '2px 2px 0px #000000',
  },
  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    backgroundColor: '#121216',
    borderRadius: '2px',
    border: '2px dashed #30303e',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: '1.2rem',
    fontWeight: '800',
    margin: '0 0 8px 0',
    letterSpacing: '0.5px',
  },
  emptyText: {
    color: '#8c8c9a',
    fontSize: '0.92rem',
    maxWidth: '520px',
    margin: '0 auto',
    lineHeight: '1.5',
  },
};
