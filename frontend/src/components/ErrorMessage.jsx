import React from 'react';

export const ErrorMessage = ({ message = 'An unexpected error occurred.', onRetry }) => {
  return (
    <div style={styles.card}>
      <div style={styles.icon}>⚠️</div>
      <div style={styles.content}>
        <h4 style={styles.title}>Error</h4>
        <p style={styles.message}>{message}</p>
        {onRetry && (
          <button style={styles.retryButton} onClick={onRetry}>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    backgroundColor: '#201214',
    border: '2px solid #ef4444',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '20px 22px',
    margin: '20px 0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  icon: {
    fontSize: '1.4rem',
  },
  content: {
    flex: 1,
  },
  title: {
    margin: '0 0 6px 0',
    color: '#f87171',
    fontSize: '0.95rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  message: {
    margin: '0 0 14px 0',
    color: '#fca5a5',
    fontSize: '0.9rem',
    lineHeight: '1.45',
  },
  retryButton: {
    backgroundColor: '#991b1b',
    border: '2px solid #ef4444',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '2px',
    fontSize: '0.82rem',
    fontFamily: 'monospace',
    fontWeight: '900',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '2px 2px 0px #000000',
  },
};
