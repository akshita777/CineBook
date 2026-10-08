import React, { useEffect, useState } from 'react';
import { api } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError('');
        // Calls the real protected Spring Boot endpoint with Bearer JWT
        const response = await api.get('/api/bookings/my-bookings');
        setBookings(response.data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Bookings</h1>
        <p style={styles.subtitle}>
          Bookings associated with account <strong>{user?.email}</strong>
        </p>
      </div>

      {loading && (
        <div style={styles.centerBox}>
          <p style={styles.mutedText}>Fetching your bookings from server...</p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>Error: {error}</p>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div style={styles.emptyCard}>
          <h3 style={styles.emptyTitle}>No Bookings Found</h3>
          <p style={styles.emptySubtitle}>
            You haven't reserved any tickets yet. Browse available shows and book seats!
          </p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div style={styles.bookingList}>
          {bookings.map((booking) => (
            <div key={booking.id} style={styles.bookingCard}>
              <div style={styles.cardHeader}>
                <span style={styles.movieTitle}>{booking.movieTitle || 'Movie'}</span>
                <span style={styles.statusBadge}>{booking.status}</span>
              </div>
              <div style={styles.cardBody}>
                <p><strong>Show:</strong> {booking.showStartTime}</p>
                <p><strong>Screen:</strong> {booking.screenName} ({booking.venueName})</p>
                <p><strong>Seats:</strong> {booking.bookedSeats?.join(', ')}</p>
                <p><strong>Total:</strong> ₹{booking.totalAmount}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '30px 0',
  },
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  subtitle: {
    color: '#888888',
    fontSize: '0.95rem',
    margin: 0,
  },
  centerBox: {
    textAlign: 'center',
    padding: '50px 0',
  },
  mutedText: {
    color: '#888888',
  },
  errorBox: {
    backgroundColor: '#3b181b',
    border: '1px solid #d32f2f',
    borderRadius: '4px',
    padding: '16px',
    marginBottom: '20px',
  },
  errorText: {
    color: '#ef9a9a',
    margin: 0,
  },
  emptyCard: {
    backgroundColor: '#1c1c1c',
    border: '1px solid #2e2e2e',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#ffffff',
    margin: '0 0 10px 0',
  },
  emptySubtitle: {
    color: '#888888',
    margin: 0,
    fontSize: '0.95rem',
  },
  bookingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  bookingCard: {
    backgroundColor: '#1c1c1c',
    border: '1px solid #2e2e2e',
    borderRadius: '6px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    borderBottom: '1px solid #2a2a2a',
    paddingBottom: '10px',
  },
  movieTitle: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    backgroundColor: '#2e7d32',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  cardBody: {
    color: '#cccccc',
    fontSize: '0.9rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
  },
};
