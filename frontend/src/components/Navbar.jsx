import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.brand}>
          <span style={styles.brandAccent}>Cine</span>Book
        </Link>

        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/bookings" style={styles.link}>
                My Bookings
              </Link>
              <div style={styles.userSection}>
                <span style={styles.userGreeting}>
                  Hi, <strong>{user?.fullName || user?.email}</strong>
                </span>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div style={styles.authButtons}>
              <Link to="/login" style={styles.loginLink}>
                Login
              </Link>
              <Link to="/register" style={styles.registerLink}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    backgroundColor: '#181818',
    borderBottom: '1px solid #2e2e2e',
    padding: '14px 0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: '1.5rem',
    fontWeight: '800',
    letterSpacing: '0.5px',
    color: '#ffffff',
  },
  brandAccent: {
    color: '#e50914',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  link: {
    color: '#cccccc',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'color 0.2s',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginLeft: '10px',
  },
  userGreeting: {
    fontSize: '0.9rem',
    color: '#aaaaaa',
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #444444',
    color: '#cccccc',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  loginLink: {
    color: '#ffffff',
    fontSize: '0.9rem',
    padding: '6px 14px',
    borderRadius: '4px',
    border: '1px solid #444',
  },
  registerLink: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    fontSize: '0.9rem',
    padding: '6px 14px',
    borderRadius: '4px',
    fontWeight: '600',
  },
};
