import React from 'react';
import { Link } from 'react-router-dom';

export const ShowCard = ({ show }) => {
  if (!show) return null;

  const formatDateTime = (isoString) => {
    if (!isoString) return { date: 'N/A', time: 'N/A' };
    const dateObj = new Date(isoString);
    const date = dateObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const time = dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return { date, time };
  };

  const startInfo = formatDateTime(show.startTime);
  const endInfo = formatDateTime(show.endTime);

  return (
    <div style={styles.card}>
      <div style={styles.details}>
        <div style={styles.venueRow}>
          <span style={styles.venueTag}>LOC</span>
          <span style={styles.venueName}>{show.venueName || 'Venue'}</span>
          <span style={styles.screenBadge}>{show.screenName || 'Screen'}</span>
        </div>

        <div style={styles.timeRow}>
          <span style={styles.date}>{startInfo.date}</span>
          <span style={styles.timeBadge}>
            {startInfo.time}
            {endInfo.time !== 'N/A' && ` – ${endInfo.time}`}
          </span>
        </div>
      </div>

      <div style={styles.action}>
        <Link to={`/shows/${show.id}/seats`} style={styles.selectButton}>
          SELECT SEATS →
        </Link>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '3px 3px 0px #000000',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    transition: 'border-color 0.15s ease, transform 0.15s ease',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  venueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  venueTag: {
    fontSize: '0.68rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#8e8e9e',
    backgroundColor: '#1a1a22',
    border: '1px solid #333342',
    padding: '2px 6px',
    borderRadius: '2px',
    letterSpacing: '0.5px',
  },
  venueName: {
    fontWeight: '800',
    color: '#ffffff',
    fontSize: '1.05rem',
    letterSpacing: '-0.2px',
  },
  screenBadge: {
    backgroundColor: '#1a1a24',
    border: '1px solid #3f3f52',
    color: '#ff4d58',
    padding: '2px 8px',
    borderRadius: '2px',
    fontSize: '0.75rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9rem',
    color: '#a0a0b0',
    flexWrap: 'wrap',
  },
  date: {
    color: '#d0d0dc',
    fontWeight: '600',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
  },
  timeBadge: {
    backgroundColor: '#0c0c0e',
    padding: '4px 10px',
    borderRadius: '2px',
    border: '1.5px solid #282834',
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
  },
  action: {
    marginLeft: 'auto',
  },
  selectButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '2px',
    border: '2px solid #b80710',
    boxShadow: '2px 2px 0px #000000',
    fontWeight: '800',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textDecoration: 'none',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
};
