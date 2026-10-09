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
    width: '36px',
    height: '36px',
    border: '3px solid #282834',
    borderTop: '3px solid #e50914',
    borderRadius: '2px',
    animation: 'spin 0.8s linear infinite',
  },
  message: {
    marginTop: '16px',
    color: '#a0a0b2',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
};
