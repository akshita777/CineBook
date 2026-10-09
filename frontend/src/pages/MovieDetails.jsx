import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { movieApi } from '../api/movieApi';
import { showApi } from '../api/showApi';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { ShowCard } from '../components/ShowCard';

export const MovieDetails = () => {
  const { id: movieId } = useParams();
  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    return <Loading message="Loading movie details and shows..." />;
  }

  if (error) {
    return (
      <div style={styles.page}>
        <Link to="/" style={styles.backLink}>← Back to Movies</Link>
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!movie) {
    return (
      <div style={styles.page}>
        <Link to="/" style={styles.backLink}>← Back to Movies</Link>
        <div style={styles.notFound}>Movie not found</div>
      </div>
    );
  }

  const formatDuration = (mins) => {
    if (!mins) return 'N/A';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes} mins`;
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
        <Link to="/" style={styles.backLink}>← Back to Movies</Link>
      </div>

      {/* Movie Details Header */}
      <div style={styles.hero}>
        <div style={styles.heroPoster}>
          <div style={styles.posterIcon}>🎬</div>
        </div>

        <div style={styles.heroContent}>
          <div style={styles.badgeRow}>
            {movie.genre && <span style={styles.genreBadge}>{movie.genre}</span>}
            {movie.language && <span style={styles.languageTag}>{movie.language}</span>}
            {movie.durationMinutes && (
              <span style={styles.durationTag}>⏱ {formatDuration(movie.durationMinutes)}</span>
            )}
          </div>

          <h1 style={styles.title}>{movie.title}</h1>

          {movie.description && (
            <p style={styles.description}>{movie.description}</p>
          )}
        </div>
      </div>

      {/* Available Theatres & Shows */}
      <div style={styles.showsSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Available Shows & Theatres</h2>
          <span style={styles.showCount}>
            {shows.length} {shows.length === 1 ? 'Show' : 'Shows'} Available
          </span>
        </div>

        {shows.length === 0 ? (
          <div style={styles.emptyShows}>
            <div style={styles.emptyIcon}>🎟️</div>
            <h3 style={styles.emptyTitle}>No Shows Scheduled</h3>
            <p style={styles.emptySub}>
              There are currently no scheduled showtimes for this movie. Please check back later!
            </p>
          </div>
        ) : (
          <div style={styles.venueGroups}>
            {venueNames.map((venueName) => (
              <div key={venueName} style={styles.venueGroup}>
                <div style={styles.venueHeader}>
                  <span style={styles.venueIcon}>🏛️</span>
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
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '30px 0 60px 0',
  },
  navBar: {
    marginBottom: '20px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#bbbbbb',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  hero: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2b2b2b',
    borderRadius: '12px',
    padding: '24px 18px',
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
    marginBottom: '36px',
    flexWrap: 'wrap',
  },
  heroPoster: {
    width: '120px',
    height: '160px',
    background: 'linear-gradient(135deg, #2c1a1d 0%, #171717 100%)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #333333',
    flexShrink: 0,
  },
  posterIcon: {
    fontSize: '3rem',
  },
  heroContent: {
    flex: 1,
    minWidth: '200px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  genreBadge: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  languageTag: {
    backgroundColor: '#2a2a2a',
    color: '#dddddd',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '0.85rem',
  },
  durationTag: {
    color: '#aaaaaa',
    fontSize: '0.9rem',
  },
  title: {
    margin: '0 0 14px 0',
    fontSize: 'clamp(1.5rem, 5vw, 2.2rem)',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.2',
    wordBreak: 'break-word',
  },
  description: {
    color: '#bbbbbb',
    fontSize: '0.96rem',
    lineHeight: '1.6',
    margin: 0,
    maxWidth: '800px',
    wordBreak: 'break-word',
  },
  showsSection: {
    marginTop: '20px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #2a2a2a',
    paddingBottom: '12px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  showCount: {
    color: '#888888',
    fontSize: '0.9rem',
  },
  venueGroups: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  venueGroup: {
    backgroundColor: '#161616',
    border: '1px solid #282828',
    borderRadius: '10px',
    padding: '20px',
  },
  venueHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    borderBottom: '1px solid #242424',
    paddingBottom: '10px',
  },
  venueIcon: {
    fontSize: '1.1rem',
  },
  venueTitle: {
    margin: 0,
    fontSize: '1.15rem',
    color: '#ffffff',
    fontWeight: '700',
  },
  showsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyShows: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#181818',
    borderRadius: '10px',
    border: '1px dashed #333333',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#ffffff',
    margin: '0 0 8px 0',
  },
  emptySub: {
    color: '#888888',
    fontSize: '0.95rem',
    margin: 0,
  },
  notFound: {
    textAlign: 'center',
    padding: '50px',
    color: '#888888',
    fontSize: '1.1rem',
  },
};
