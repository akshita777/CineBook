import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Success message if redirected from registration
  const successMessage = location.state?.registered
    ? 'Account created successfully! Please sign in with your credentials.'
    : '';

  const from = location.state?.from?.pathname || '/';

  const validate = () => {
    const errors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Sign In to CineBook</h2>
          <p style={styles.subtitle}>Enter your details to access your account & bookings</p>
        </div>

        {successMessage && <div style={styles.successBanner}>{successMessage}</div>}
        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              style={{
                ...styles.input,
                borderColor: validationErrors.email ? '#e50914' : '#282834',
              }}
              disabled={loading}
              autoComplete="email"
            />
            {validationErrors.email && (
              <span style={styles.validationText}>{validationErrors.email}</span>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                ...styles.input,
                borderColor: validationErrors.password ? '#e50914' : '#282834',
              }}
              disabled={loading}
              autoComplete="current-password"
            />
            {validationErrors.password && (
              <span style={styles.validationText}>{validationErrors.password}</span>
            )}
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>New to CineBook? </span>
          <Link to="/register" style={styles.registerLink}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '75vh',
    padding: '20px',
  },
  card: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '36px 26px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '4px 4px 0px #000000',
  },
  header: {
    marginBottom: '26px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '1.65rem',
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.88rem',
    color: '#828294',
    fontFamily: 'monospace',
  },
  successBanner: {
    backgroundColor: '#0f2214',
    border: '2px solid #22c55e',
    color: '#4ade80',
    padding: '12px 14px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
    marginBottom: '20px',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#201214',
    border: '2px solid #ef4444',
    color: '#fca5a5',
    padding: '12px 14px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
    marginBottom: '20px',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '0.78rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#c2c2d2',
  },
  input: {
    backgroundColor: '#0c0c0e',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  validationText: {
    color: '#f87171',
    fontSize: '0.78rem',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: '6px',
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '13px',
    fontSize: '0.95rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    borderRadius: '2px',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #000000',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  footer: {
    marginTop: '26px',
    textAlign: 'center',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
  },
  footerText: {
    color: '#828294',
  },
  registerLink: {
    color: '#ffffff',
    fontWeight: '800',
    textDecoration: 'underline',
  },
};
