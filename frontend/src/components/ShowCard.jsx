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
          <span style={styles.venueIcon}>📍</span>
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
          Select Seats
        </Link>
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#1e1e1e',
    border: '1px solid #2e2e2e',
    borderRadius: '8px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  venueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  venueIcon: {
    fontSize: '0.9rem',
  },
  venueName: {
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '1rem',
  },
  screenBadge: {
    backgroundColor: '#2b2b2b',
    color: '#e50914',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9rem',
    color: '#bbbbbb',
  },
  date: {
    color: '#dddddd',
  },
  timeBadge: {
    backgroundColor: '#141414',
    padding: '3px 10px',
    borderRadius: '4px',
    border: '1px solid #333333',
    color: '#ffffff',
    fontWeight: '600',
  },
  action: {
    marginLeft: 'auto',
  },
  selectButton: {
    display: 'inline-block',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '8px 18px',
    borderRadius: '5px',
    fontWeight: '600',
    fontSize: '0.9rem',
    textDecoration: 'none',
  },
};
