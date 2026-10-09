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

  const displayName = user?.fullName
    ? user.fullName.split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : 'User';

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.brand} aria-label="CineBook Home">
          <span style={styles.brandTag}>CINE</span>
          <span style={styles.brandText}>BOOK</span>
        </Link>

        <div style={styles.navLinks}>
          <Link to="/" style={styles.link}>
            Catalog
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/bookings" style={styles.link}>
                My Bookings
              </Link>
              <div style={styles.userSection}>
                <span style={styles.userBadge}>
                  <span style={styles.userDot}>●</span>
                  {displayName}
                </span>
                <button
                  onClick={handleLogout}
                  style={styles.logoutBtn}
                  aria-label="Logout of CineBook"
                >
                  LOGOUT
                </button>
              </div>
            </>
          ) : (
            <div style={styles.authButtons}>
              <Link to="/login" style={styles.loginLink}>
                Sign In
              </Link>
              <Link to="/register" style={styles.registerLink}>
                Register →
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
    backgroundColor: '#101014',
    borderBottom: '2px solid #282832',
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
    flexWrap: 'wrap',
    gap: '14px',
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    textDecoration: 'none',
  },
  brandTag: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '3px 7px',
    fontSize: '0.9rem',
    fontWeight: '900',
    letterSpacing: '1px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
  },
  brandText: {
    fontSize: '1.25rem',
    fontWeight: '900',
    letterSpacing: '1.5px',
    color: '#ffffff',
    marginLeft: '2px',
  },
  brandSub: {
    fontSize: '0.62rem',
    fontWeight: '800',
    letterSpacing: '1.5px',
    color: '#626272',
    padding: '2px 5px',
    border: '1px solid #2c2c36',
    marginLeft: '6px',
    borderRadius: '2px',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  link: {
    color: '#c2c2ce',
    fontSize: '0.88rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    padding: '6px 10px',
    border: '1px solid transparent',
    borderRadius: '2px',
    transition: 'all 0.15s ease',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  userBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    fontWeight: '700',
    fontFamily: '"SFMono-Regular", Consolas, monospace',
    color: '#e0e0ea',
    backgroundColor: '#18181f',
    border: '1px solid #30303c',
    padding: '4px 10px',
    borderRadius: '2px',
  },
  userDot: {
    color: '#22c55e',
    fontSize: '0.7rem',
  },
  logoutBtn: {
    backgroundColor: '#141418',
    border: '1.5px solid #3e3e4c',
    color: '#c0c0cc',
    padding: '6px 12px',
    borderRadius: '2px',
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '0.8px',
    boxShadow: '2px 2px 0px #000000',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  authButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  loginLink: {
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '700',
    padding: '7px 14px',
    borderRadius: '2px',
    border: '1.5px solid #363644',
    backgroundColor: '#16161c',
    boxShadow: '2px 2px 0px #000000',
    transition: 'all 0.15s ease',
  },
  registerLink: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '800',
    padding: '7px 14px',
    borderRadius: '2px',
    border: '1.5px solid #e50914',
    boxShadow: '2px 2px 0px #000000',
    transition: 'all 0.15s ease',
  },
};
