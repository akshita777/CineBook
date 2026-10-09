import React from 'react';
import { Link } from 'react-router-dom';

export const MovieCard = ({ movie }) => {
  if (!movie) return null;

  const formatDuration = (mins) => {
    if (!mins) return 'N/A';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes} mins`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.posterPlaceholder}>
        <div style={styles.posterIcon}>🎬</div>
        <span style={styles.posterGenre}>{movie.genre || 'Cinema'}</span>
      </div>

      <div style={styles.content}>
        <h3 style={styles.title} title={movie.title}>{movie.title}</h3>
        
        <div style={styles.metaRow}>
          {movie.language && (
            <span style={styles.tag}>{movie.language}</span>
          )}
          {movie.durationMinutes && (
            <span style={styles.duration}>⏱ {formatDuration(movie.durationMinutes)}</span>
          )}
        </div>

        {movie.description && (
          <p style={styles.description}>
            {movie.description.length > 110
              ? `${movie.description.substring(0, 110)}...`
              : movie.description}
          </p>
        )}

        <div style={styles.footer}>
          <Link to={`/movies/${movie.id}`} style={styles.bookButton}>
            View Shows
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2b2b2b',
    borderRadius: '10px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  posterPlaceholder: {
    height: '160px',
    background: 'linear-gradient(135deg, #2c1a1d 0%, #151515 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid #2a2a2a',
    position: 'relative',
  },
  posterIcon: {
    fontSize: '2.5rem',
    marginBottom: '6px',
  },
  posterGenre: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: '#e50914',
    fontWeight: '700',
  },
  content: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '1.25rem',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
    fontSize: '0.85rem',
  },
  tag: {
    backgroundColor: '#2a2a2a',
    color: '#cccccc',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  duration: {
    color: '#999999',
  },
  description: {
    color: '#aaaaaa',
    fontSize: '0.88rem',
    lineHeight: '1.45',
    margin: '0 0 16px 0',
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '8px',
  },
  bookButton: {
    display: 'block',
    textAlign: 'center',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '9px 16px',
    borderRadius: '5px',
    fontWeight: '600',
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
};
