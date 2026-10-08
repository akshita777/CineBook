import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={styles.container}>
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

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Featured Movies</h2>
        <p style={styles.placeholderText}>
          Movie catalog and show selection will be fully rendered in Phase 11C.
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px 0',
  },
  hero: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '40px 30px',
    textAlign: 'center',
    marginBottom: '40px',
  },
  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 14px 0',
  },
  heroSubtitle: {
    fontSize: '1.1rem',
    color: '#aaaaaa',
    maxWidth: '650px',
    margin: '0 auto 24px auto',
    lineHeight: '1.6',
  },
  statusBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#242424',
    border: '1px solid #383838',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    color: '#dddddd',
  },
  statusDot: {
    color: '#4caf50',
    fontSize: '1rem',
  },
  section: {
    marginTop: '30px',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '12px',
    borderBottom: '2px solid #e50914',
    display: 'inline-block',
    paddingBottom: '6px',
  },
  placeholderText: {
    color: '#888888',
    fontSize: '1rem',
    marginTop: '10px',
  },
};
