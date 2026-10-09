import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const POSTER_MAP = {
  'interstellar': 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  'inception': 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
  'oppenheimer': 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
};

export const MovieCard = ({ movie }) => {
  if (!movie) return null;

  const [imgError, setImgError] = useState(false);
  const posterUrl = POSTER_MAP[movie.title?.toLowerCase()?.trim()];

  const formatDuration = (mins) => {
    if (!mins) return 'N/A';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0 && minutes > 0) return `${hours}H ${minutes}M`;
    if (hours > 0) return `${hours}H`;
    return `${minutes}M`;
  };

  return (
    <div style={styles.card}>
      {/* Poster Media Box */}
      <div style={styles.posterBox}>
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={movie.title}
            onError={() => setImgError(true)}
            style={styles.posterImg}
            loading="lazy"
          />
        ) : (
          <div style={styles.posterFallback}>
            <div style={styles.filmStripNotches}>
              <span>■ ■ ■ ■ ■ ■</span>
            </div>
            <div style={styles.fallbackIcon}>🎬</div>
            <span style={styles.fallbackBrand}>CINEBOOK ARCHIVE</span>
            <span style={styles.fallbackTitle}>{movie.title}</span>
          </div>
        )}
        <div style={styles.genreOverlay}>
          <span style={styles.genreBadge}>{movie.genre || 'CINEMA'}</span>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.headerRow}>
          <h3 style={styles.title} title={movie.title}>
            {movie.title}
          </h3>
        </div>

        <div style={styles.metaRow}>
          {movie.language && (
            <span style={styles.langTag}>{movie.language.toUpperCase()}</span>
          )}
          {movie.durationMinutes && (
            <span style={styles.durationTag}>
              ⏱ {formatDuration(movie.durationMinutes)}
            </span>
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
            <span>SELECT SHOWS</span>
            <span style={styles.arrowIcon}>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#131317',
    border: '2px solid #262630',
    borderRadius: '2px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 4px 0px #000000',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  },
  posterBox: {
    height: '240px',
    backgroundColor: '#0a0a0c',
    position: 'relative',
    overflow: 'hidden',
    borderBottom: '2px solid #262630',
  },
  posterImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    filter: 'contrast(1.05) brightness(0.95)',
  },
  posterFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101014',
    padding: '20px',
    textAlign: 'center',
    background: 'repeating-linear-gradient(45deg, #101015, #101015 10px, #14141b 10px, #14141b 20px)',
  },
  filmStripNotches: {
    position: 'absolute',
    top: '8px',
    letterSpacing: '6px',
    fontSize: '0.65rem',
    color: '#32323e',
    userSelect: 'none',
  },
  fallbackIcon: {
    fontSize: '2.4rem',
    marginBottom: '8px',
  },
  fallbackBrand: {
    fontSize: '0.68rem',
    fontWeight: '800',
    letterSpacing: '1.5px',
    color: '#e50914',
    marginBottom: '4px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  fallbackTitle: {
    fontSize: '0.9rem',
    fontWeight: '800',
    color: '#a0a0b0',
    letterSpacing: '0.5px',
  },
  genreOverlay: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
  },
  genreBadge: {
    backgroundColor: '#0c0c0e',
    color: '#ffffff',
    border: '1.5px solid #2e2e38',
    padding: '3px 8px',
    borderRadius: '2px',
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    boxShadow: '2px 2px 0px #000000',
  },
  content: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  headerRow: {
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: '-0.3px',
    lineHeight: '1.25',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  langTag: {
    backgroundColor: '#1b1b22',
    border: '1px solid #30303c',
    color: '#b0b0be',
    padding: '2px 7px',
    borderRadius: '2px',
    fontSize: '0.72rem',
    fontWeight: '800',
    letterSpacing: '0.5px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  durationTag: {
    color: '#828290',
    fontSize: '0.78rem',
    fontWeight: '700',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  description: {
    color: '#9a9aa8',
    fontSize: '0.86rem',
    lineHeight: '1.45',
    margin: '0 0 16px 0',
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '6px',
  },
  bookButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '10px 16px',
    borderRadius: '2px',
    fontWeight: '800',
    fontSize: '0.86rem',
    letterSpacing: '0.8px',
    textDecoration: 'none',
    border: '1.5px solid #e50914',
    boxShadow: '3px 3px 0px #000000',
    transition: 'all 0.1s ease',
  },
  arrowIcon: {
    fontSize: '1.1rem',
    fontWeight: '900',
  },
};
