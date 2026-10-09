import React from 'react';

export const Loading = ({ message = 'Loading...' }) => {
  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <p style={styles.message}>{message}</p>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #2a2a2a',
    borderTop: '4px solid var(--primary, #e50914)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  message: {
    marginTop: '16px',
    color: 'var(--text-muted, #aaaaaa)',
    fontSize: '0.95rem',
  },
};
