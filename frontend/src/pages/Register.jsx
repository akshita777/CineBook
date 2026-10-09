import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error on type
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
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
      await register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.trim() || null,
      });

      // Redirect to login with success state
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Create your CineBook Account</h2>
          <p style={styles.subtitle}>Join to book movie tickets instantly with real-time seat reservation</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              style={{
                ...styles.input,
                borderColor: validationErrors.fullName ? '#e50914' : '#282834',
              }}
              disabled={loading}
              autoComplete="name"
            />
            {validationErrors.fullName && (
              <span style={styles.validationText}>{validationErrors.fullName}</span>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
            <label style={styles.label}>Password * (min. 6 characters)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={{
                ...styles.input,
                borderColor: validationErrors.password ? '#e50914' : '#282834',
              }}
              disabled={loading}
              autoComplete="new-password"
            />
            {validationErrors.password && (
              <span style={styles.validationText}>{validationErrors.password}</span>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number (Optional)</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+1 555-0199"
              style={{
                ...styles.input,
                borderColor: '#282834',
              }}
              disabled={loading}
              autoComplete="tel"
            />
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>Already have an account? </span>
          <Link to="/login" style={styles.loginLink}>
            Sign in
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
    minHeight: '80vh',
    padding: '20px',
  },
  card: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '36px 26px',
    width: '100%',
    maxWidth: '460px',
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
    lineHeight: '1.4',
    fontFamily: 'monospace',
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
    gap: '18px',
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
    marginTop: '8px',
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
  loginLink: {
    color: '#ffffff',
    fontWeight: '800',
    textDecoration: 'underline',
  },
};
