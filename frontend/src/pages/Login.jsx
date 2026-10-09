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
                borderColor: validationErrors.email ? '#e50914' : '#3a3a3a',
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
                borderColor: validationErrors.password ? '#e50914' : '#3a3a3a',
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
    backgroundColor: '#1c1c1c',
    border: '1px solid #2e2e2e',
    borderRadius: '8px',
    padding: '32px 20px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  header: {
    marginBottom: '24px',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#888888',
  },
  successBanner: {
    backgroundColor: '#1b3820',
    border: '1px solid #2e7d32',
    color: '#a5d6a7',
    padding: '10px 14px',
    borderRadius: '4px',
    marginBottom: '18px',
    fontSize: '0.85rem',
  },
  errorBanner: {
    backgroundColor: '#3b181b',
    border: '1px solid #d32f2f',
    color: '#ef9a9a',
    padding: '10px 14px',
    borderRadius: '4px',
    marginBottom: '18px',
    fontSize: '0.85rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#cccccc',
  },
  input: {
    backgroundColor: '#121212',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    padding: '12px 14px',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  validationText: {
    color: '#e50914',
    fontSize: '0.8rem',
  },
  submitBtn: {
    marginTop: '6px',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '0.9rem',
  },
  footerText: {
    color: '#888888',
  },
  registerLink: {
    color: '#ffffff',
    fontWeight: '600',
    textDecoration: 'underline',
  },
};
