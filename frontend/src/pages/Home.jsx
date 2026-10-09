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
      {/* Hero Section */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Welcome to CineBook</h1>
        <p style={styles.heroSubtitle}>
          Experience high-concurrency ticket reservations with real-time seat locking and instant confirmation.
        </p>
        <div style={styles.statusBox}>
          <span style={styles.statusDot}>●</span>
          <span>
            {isAuthenticated ? (
              <>
                Signed in as <strong>{user?.fullName}</strong> ({user?.email})
              </>
            ) : (
              'Browsing as Guest. Sign in to reserve seats and complete bookings.'
            )}
          </span>
        </div>
      </div>

      {/* Movies Catalog Section */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Now Showing</h2>
          {!loading && !error && (
            <span style={styles.movieCount}>
              {movies.length} {movies.length === 1 ? 'Movie' : 'Movies'} Available
            </span>
          )}
        </div>

        {loading && <Loading message="Loading movies from backend..." />}

        {error && <ErrorMessage message={error} onRetry={fetchMovies} />}

        {!loading && !error && movies.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎬</div>
            <h3 style={styles.emptyTitle}>No Movies Currently Available</h3>
            <p style={styles.emptyText}>
              There are no movies currently listed in the system. Check back later or contact the administrator.
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
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '30px 0 60px 0',
  },
  hero: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '32px 18px',
    textAlign: 'center',
    marginBottom: '36px',
  },
  heroTitle: {
    fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 12px 0',
    letterSpacing: '-0.5px',
    wordBreak: 'break-word',
  },
  heroSubtitle: {
    fontSize: '1rem',
    color: '#aaaaaa',
    maxWidth: '650px',
    margin: '0 auto 20px auto',
    lineHeight: '1.6',
  },
  statusBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#242424',
    border: '1px solid #383838',
    padding: '8px 18px',
    borderRadius: '20px',
    fontSize: '0.88rem',
    color: '#dddddd',
    maxWidth: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statusDot: {
    color: '#4caf50',
    fontSize: '1rem',
  },
  section: {
    marginTop: '20px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    borderBottom: '2px solid #2a2a2a',
    paddingBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    borderBottom: '2px solid #e50914',
    display: 'inline-block',
    paddingBottom: '10px',
    marginBottom: '-12px',
  },
  movieCount: {
    color: '#888888',
    fontSize: '0.9rem',
  },
  movieGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#181818',
    borderRadius: '10px',
    border: '1px dashed #333333',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: '1.2rem',
    margin: '0 0 8px 0',
  },
  emptyText: {
    color: '#888888',
    fontSize: '0.95rem',
    maxWidth: '480px',
    margin: '0 auto',
    lineHeight: '1.5',
  },
};
