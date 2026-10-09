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
    backgroundColor: '#201111',
    border: '1px solid #6b1d1d',
    borderRadius: '8px',
    padding: '20px 24px',
    margin: '20px 0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  icon: {
    fontSize: '1.5rem',
  },
  content: {
    flex: 1,
  },
  title: {
    margin: '0 0 6px 0',
    color: '#ff6b6b',
    fontSize: '1.05rem',
  },
  message: {
    margin: '0 0 12px 0',
    color: '#e0c0c0',
    fontSize: '0.95rem',
    lineHeight: '1.4',
  },
  retryButton: {
    backgroundColor: '#401515',
    border: '1px solid #7c2222',
    color: '#ffffff',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
};
