import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { movieApi } from '../api/movieApi';
import { showApi } from '../api/showApi';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { ShowCard } from '../components/ShowCard';

const POSTER_MAP = {
  'interstellar': 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  'inception': 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
  'oppenheimer': 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
};

export const MovieDetails = () => {
  const { id: movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [movieData, showsData] = await Promise.all([
        movieApi.getMovieById(movieId),
        showApi.getShowsByMovie(movieId),
      ]);
      setMovie(movieData);
      setShows(showsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load movie details or shows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movieId) {
      fetchData();
    }
  }, [movieId]);

  if (loading) {
    return <Loading message="Loading feature details and showtimes..." />;
  }

  if (error) {
    return (
      <div style={styles.page}>
        <Link to="/" style={styles.backBtn}>← BACK TO CATALOG</Link>
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div style={styles.page}>
        <Link to="/" style={styles.backBtn}>← BACK TO CATALOG</Link>
        <div style={styles.notFound}>Movie not found in archive.</div>
      </div>
    );
  }

  const posterUrl = POSTER_MAP[movie.title?.toLowerCase()?.trim()];

  const formatDuration = (mins) => {
    if (!mins) return 'N/A';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0 && minutes > 0) return `${hours}H ${minutes}M`;
    if (hours > 0) return `${hours}H`;
    return `${minutes}M`;
  };

  // Group shows by venue name to reflect Venue -> Screen -> Show hierarchy
  const showsByVenue = shows.reduce((acc, show) => {
    const venue = show.venueName || 'Other Venues';
    if (!acc[venue]) {
      acc[venue] = [];
    }
    acc[venue].push(show);
    return acc;
  }, {});

  const venueNames = Object.keys(showsByVenue);

  return (
    <div style={styles.page}>
      <div style={styles.navBar}>
        <Link to="/" style={styles.backBtn}>
          ← BACK TO CATALOG
        </Link>
      </div>

      {/* Movie Details Header */}
      <section style={styles.hero}>
        <div style={styles.posterContainer}>
          {posterUrl && !imgError ? (
            <img
              src={posterUrl}
              alt={movie.title}
              onError={() => setImgError(true)}
              style={styles.heroPosterImg}
            />
          ) : (
            <div style={styles.heroPosterFallback}>
              <span style={styles.posterIcon}>🎬</span>
              <span style={styles.fallbackStamp}>FEATURE</span>
            </div>
          )}
        </div>

        <div style={styles.heroContent}>
          <div style={styles.badgeRow}>
            {movie.genre && <span style={styles.genreBadge}>{movie.genre}</span>}
            {movie.language && <span style={styles.languageTag}>{movie.language.toUpperCase()}</span>}
            {movie.durationMinutes && (
              <span style={styles.durationTag}>⏱ {formatDuration(movie.durationMinutes)}</span>
            )}
          </div>

          <h1 style={styles.title}>{movie.title}</h1>

          {movie.description && (
            <p style={styles.description}>{movie.description}</p>
          )}

          <div style={styles.metaStrip}>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>FORMAT:</span>
              <span style={styles.metaValue}>CINEMA RELEASE</span>
            </div>
            <div style={styles.metaItem}>
              <span style={styles.metaLabel}>ID:</span>
              <code style={styles.metaCode}>{movie.id}</code>
            </div>
          </div>
        </div>
      </section>

      {/* Available Theatres & Shows */}
      <section style={styles.showsSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleBlock}>
            <span style={styles.sectionSlug}>// SHOWTIMINGS</span>
            <h2 style={styles.sectionTitle}>AVAILABLE THEATRES & SHOWS</h2>
          </div>
          <span style={styles.showCountBadge}>
            {shows.length} {shows.length === 1 ? 'SHOW' : 'SHOWS'} SCHEDULED
          </span>
        </div>

        {shows.length === 0 ? (
          <div style={styles.emptyShows}>
            <div style={styles.emptyIcon}>🎟️</div>
            <h3 style={styles.emptyTitle}>NO SHOWS SCHEDULED</h3>
            <p style={styles.emptySub}>
              There are currently no scheduled showtimes for this movie in the database.
            </p>
          </div>
        ) : (
          <div style={styles.venueGroups}>
            {venueNames.map((venueName) => (
              <div key={venueName} style={styles.venueGroup}>
                <div style={styles.venueHeader}>
                  <div style={styles.venueBadge}>VENUE</div>
                  <h3 style={styles.venueTitle}>{venueName}</h3>
                </div>

                <div style={styles.showsList}>
                  {showsByVenue[venueName].map((show) => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const styles = {
  page: {
    padding: '20px 0 60px 0',
  },
  navBar: {
    marginBottom: '20px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#d0d0dc',
    backgroundColor: '#141418',
    border: '1.5px solid #2e2e3a',
    padding: '8px 14px',
    borderRadius: '2px',
    fontSize: '0.82rem',
    fontWeight: '800',
    letterSpacing: '0.8px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    boxShadow: '2px 2px 0px #000000',
    textDecoration: 'none',
  },
  hero: {
    backgroundColor: '#121216',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '28px 24px',
    display: 'flex',
    gap: '28px',
    alignItems: 'flex-start',
    marginBottom: '40px',
    boxShadow: '5px 5px 0px #000000',
    flexWrap: 'wrap',
  },
  posterContainer: {
    width: '160px',
    height: '230px',
    borderRadius: '2px',
    overflow: 'hidden',
    border: '2px solid #2e2e3a',
    boxShadow: '3px 3px 0px #000000',
    flexShrink: 0,
    backgroundColor: '#0a0a0c',
  },
  heroPosterImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  heroPosterFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15151c',
  },
  posterIcon: {
    fontSize: '2.5rem',
    marginBottom: '6px',
  },
  fallbackStamp: {
    fontSize: '0.65rem',
    fontWeight: '900',
    letterSpacing: '1px',
    color: '#e50914',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  heroContent: {
    flex: 1,
    minWidth: '240px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  genreBadge: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    border: '1px solid #e50914',
    padding: '4px 9px',
    borderRadius: '2px',
    fontSize: '0.74rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    boxShadow: '2px 2px 0px #000000',
  },
  languageTag: {
    backgroundColor: '#1b1b22',
    border: '1px solid #30303c',
    color: '#b0b0c0',
    padding: '4px 9px',
    borderRadius: '2px',
    fontSize: '0.74rem',
    fontWeight: '800',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  durationTag: {
    color: '#8e8e9e',
    fontSize: '0.8rem',
    fontWeight: '700',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: 'clamp(1.8rem, 4.5vw, 2.6rem)',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1.15',
    letterSpacing: '-0.5px',
    textTransform: 'uppercase',
    wordBreak: 'break-word',
  },
  description: {
    color: '#a4a4b2',
    fontSize: '0.98rem',
    lineHeight: '1.65',
    margin: '0 0 20px 0',
    maxWidth: '820px',
    wordBreak: 'break-word',
  },
  metaStrip: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    paddingTop: '14px',
    borderTop: '1px solid #22222c',
    fontSize: '0.76rem',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metaLabel: {
    color: '#606070',
    fontWeight: '800',
  },
  metaValue: {
    color: '#d0d0dc',
    fontWeight: '700',
  },
  metaCode: {
    color: '#ff9800',
    fontSize: '0.75rem',
  },
  showsSection: {
    marginTop: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderBottom: '2px solid #262632',
    paddingBottom: '14px',
    marginBottom: '26px',
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
    fontSize: '1.5rem',
    fontWeight: '900',
    color: '#ffffff',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  showCountBadge: {
    backgroundColor: '#181820',
    border: '1.5px solid #323242',
    color: '#b0b0c2',
    padding: '6px 12px',
    borderRadius: '2px',
    fontSize: '0.75rem',
    fontWeight: '800',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    boxShadow: '2px 2px 0px #000000',
  },
  venueGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  venueGroup: {
    backgroundColor: '#121216',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '24px',
    boxShadow: '4px 4px 0px #000000',
  },
  venueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '18px',
    borderBottom: '1.5px solid #22222c',
    paddingBottom: '12px',
  },
  venueBadge: {
    backgroundColor: '#20202a',
    color: '#e50914',
    border: '1px solid #323242',
    padding: '3px 8px',
    fontSize: '0.68rem',
    fontWeight: '900',
    letterSpacing: '1px',
    borderRadius: '2px',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
  },
  venueTitle: {
    margin: 0,
    fontSize: '1.25rem',
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: '-0.2px',
  },
  showsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyShows: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#121216',
    borderRadius: '2px',
    border: '2px dashed #2e2e3c',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#ffffff',
    margin: '0 0 8px 0',
    fontWeight: '800',
    letterSpacing: '0.5px',
  },
  emptySub: {
    color: '#828292',
    fontSize: '0.92rem',
    margin: 0,
  },
  notFound: {
    textAlign: 'center',
    padding: '50px',
    color: '#888888',
    fontSize: '1.1rem',
  },
};
