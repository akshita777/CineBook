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
                borderColor: validationErrors.fullName ? '#e50914' : '#3a3a3a',
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
            <label style={styles.label}>Password * (min. 6 characters)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              style={{
                ...styles.input,
                borderColor: validationErrors.password ? '#e50914' : '#3a3a3a',
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
              style={styles.input}
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
    backgroundColor: '#1c1c1c',
    border: '1px solid #2e2e2e',
    borderRadius: '8px',
    padding: '32px 20px',
    width: '100%',
    maxWidth: '460px',
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
    fontSize: '0.88rem',
    color: '#888888',
    lineHeight: '1.4',
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
    gap: '16px',
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
    marginTop: '8px',
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
  loginLink: {
    color: '#ffffff',
    fontWeight: '600',
    textDecoration: 'underline',
  },
};
