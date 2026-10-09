import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';

export const MyBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelBooking, setConfirmCancelBooking] = useState(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingApi.getMyBookings();
      setBookings(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch bookings from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelClick = (booking) => {
    setCancelSuccessMsg('');
    setConfirmCancelBooking(booking);
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelBooking) return;

    setCancellingId(confirmCancelBooking.id);
    try {
      await bookingApi.cancelBooking(confirmCancelBooking.id);
      setCancelSuccessMsg(
        `Booking for "${confirmCancelBooking.movieTitle}" cancelled successfully. Seats have been returned to available inventory.`
      );
      setConfirmCancelBooking(null);
      // Refresh real booking list from backend
      await fetchBookings();
    } catch (err) {
      setError(err.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) +
      ' • ' +
      d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Bookings</h1>
        <p style={styles.subtitle}>
          Logged in as <strong>{user?.fullName || user?.email}</strong>
        </p>
      </div>

      {cancelSuccessMsg && (
        <div style={styles.successBanner}>
          <span>✅</span>
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchBookings} />}

      {loading && <Loading message="Loading your reservation history..." />}

      {!loading && !error && bookings.length === 0 && (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>🎟️</div>
          <h3 style={styles.emptyTitle}>No Bookings Found</h3>
          <p style={styles.emptySubtitle}>
            You haven't reserved any tickets yet. Browse available shows and book your seats!
          </p>
          <Link to="/" style={styles.browseBtn}>
            Explore Now Showing
          </Link>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div style={styles.bookingList}>
          {bookings.map((b) => {
            const isConfirmed = b.status === 'CONFIRMED';
            const isCancelled = b.status === 'CANCELLED';

            return (
              <div key={b.id} style={styles.bookingCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.movieCol}>
                    <h2 style={styles.movieTitle}>{b.movieTitle || 'Movie'}</h2>
                    <span style={styles.venueInfo}>
                      🏛️ {b.venueName} • 📽️ {b.screenName}
                    </span>
                  </div>

                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: isConfirmed ? '#1e3820' : '#381e1e',
                      color: isConfirmed ? '#4caf50' : '#ef5350',
                      borderColor: isConfirmed ? '#2e7d32' : '#d32f2f',
                    }}
                  >
                    {b.status}
                  </span>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.infoCol}>
                    <span style={styles.infoLabel}>SHOWTIME</span>
                    <span style={styles.infoVal}>📅 {formatDateTime(b.showStartTime)}</span>
                  </div>

                  <div style={styles.infoCol}>
                    <span style={styles.infoLabel}>SEATS</span>
                    <div style={styles.seatPills}>
                      {b.bookedSeats?.map((seat) => (
                        <span key={seat} style={styles.seatPill}>
                          {seat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={styles.infoCol}>
                    <span style={styles.infoLabel}>TOTAL AMOUNT</span>
                    <span style={styles.amountVal}>₹{Number(b.totalAmount).toFixed(2)}</span>
                  </div>

                  <div style={styles.infoCol}>
                    <span style={styles.infoLabel}>BOOKING ID</span>
                    <code style={styles.bookingIdCode}>{b.id}</code>
                  </div>
                </div>

                <div style={styles.cardFooter}>
                  <Link to={`/confirmation/${b.id}`} style={styles.viewTicketBtn}>
                    🎟️ View E-Ticket
                  </Link>
                  {isConfirmed && (
                    <button
                      onClick={() => handleCancelClick(b)}
                      disabled={cancellingId === b.id}
                      style={styles.cancelBtn}
                    >
                      {cancellingId === b.id ? 'Cancelling...' : 'Cancel Reservation'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Cancellation */}
      {confirmCancelBooking && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalIcon}>⚠️</div>
            <h3 style={styles.modalTitle}>Cancel Reservation?</h3>
            <p style={styles.modalText}>
              Are you sure you want to cancel your booking for{' '}
              <strong>"{confirmCancelBooking.movieTitle}"</strong> ({confirmCancelBooking.bookedSeats?.join(', ')})?
              This action is irreversible and releases your seats back to the theatre.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setConfirmCancelBooking(null)}
                disabled={cancellingId != null}
                style={styles.modalKeepBtn}
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancellingId != null}
                style={styles.modalConfirmCancelBtn}
              >
                {cancellingId ? 'Processing...' : 'Yes, Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '30px 0 60px 0',
  },
  header: {
    marginBottom: '28px',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 6px 0',
  },
  subtitle: {
    color: '#888888',
    fontSize: '0.95rem',
    margin: 0,
  },
  successBanner: {
    backgroundColor: '#1b3820',
    border: '1px solid #2e7d32',
    color: '#a5d6a7',
    padding: '12px 18px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    fontSize: '0.92rem',
  },
  emptyCard: {
    backgroundColor: '#1b1b1b',
    border: '1px dashed #333333',
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#ffffff',
    margin: '0 0 8px 0',
    fontSize: '1.3rem',
  },
  emptySubtitle: {
    color: '#888888',
    margin: '0 0 24px 0',
    fontSize: '0.95rem',
  },
  browseBtn: {
    display: 'inline-block',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '10px 22px',
    borderRadius: '6px',
    fontWeight: '700',
    textDecoration: 'none',
  },
  bookingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  bookingCard: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '20px 16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    borderBottom: '1px solid #282828',
    paddingBottom: '14px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  movieCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  movieTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: '#ffffff',
    margin: 0,
    wordBreak: 'break-word',
  },
  venueInfo: {
    color: '#888888',
    fontSize: '0.88rem',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '700',
    border: '1px solid',
  },
  cardBody: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '14px',
    marginBottom: '16px',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '0.72rem',
    color: '#777777',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoVal: {
    color: '#ffffff',
    fontSize: '0.92rem',
    fontWeight: '600',
  },
  seatPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  seatPill: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.82rem',
    fontWeight: '700',
  },
  amountVal: {
    color: '#4caf50',
    fontSize: '1.2rem',
    fontWeight: '800',
  },
  bookingIdCode: {
    color: '#888888',
    fontSize: '0.78rem',
    wordBreak: 'break-all',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    borderTop: '1px solid #242424',
    paddingTop: '14px',
    flexWrap: 'wrap',
  },
  viewTicketBtn: {
    backgroundColor: '#282828',
    border: '1px solid #3d3d3d',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    textDecoration: 'none',
  },
  cancelBtn: {
    backgroundColor: '#261414',
    border: '1px solid #5a1f1f',
    color: '#ef5350',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#1f1f1f',
    border: '1px solid #333333',
    borderRadius: '12px',
    padding: '24px 18px',
    maxWidth: '460px',
    width: '100%',
    textAlign: 'center',
  },
  modalIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  modalTitle: {
    color: '#ffffff',
    margin: '0 0 10px 0',
    fontSize: '1.3rem',
  },
  modalText: {
    color: '#aaaaaa',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
    wordBreak: 'break-word',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  modalKeepBtn: {
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: '10px 18px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  },
  modalConfirmCancelBtn: {
    backgroundColor: '#c62828',
    color: '#ffffff',
    padding: '10px 18px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  },
};
