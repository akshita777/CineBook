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
                      backgroundColor: isConfirmed ? '#0f2214' : '#201214',
                      color: isConfirmed ? '#4ade80' : '#f87171',
                      borderColor: isConfirmed ? '#22c55e' : '#ef4444',
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
    fontSize: '2.2rem',
    fontWeight: '900',
    color: '#ffffff',
    margin: '0 0 6px 0',
    letterSpacing: '-0.4px',
  },
  subtitle: {
    color: '#828294',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    margin: 0,
  },
  successBanner: {
    backgroundColor: '#0f2214',
    border: '2px solid #22c55e',
    borderRadius: '2px',
    boxShadow: '3px 3px 0px #000000',
    color: '#4ade80',
    padding: '12px 18px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#141418',
    border: '2px dashed #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
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
    fontSize: '1.35rem',
    fontWeight: '900',
  },
  emptySubtitle: {
    color: '#828294',
    margin: '0 0 24px 0',
    fontSize: '0.92rem',
  },
  browseBtn: {
    display: 'inline-block',
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textDecoration: 'none',
    boxShadow: '3px 3px 0px #000000',
  },
  bookingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  bookingCard: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '22px 18px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    borderBottom: '2px solid #282834',
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
    fontSize: '1.45rem',
    fontWeight: '900',
    color: '#ffffff',
    margin: 0,
    wordBreak: 'break-word',
    letterSpacing: '-0.3px',
  },
  venueInfo: {
    color: '#a0a0b2',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '2px',
    fontSize: '0.72rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    border: '1.5px solid',
  },
  cardBody: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '0.72rem',
    color: '#828294',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontFamily: 'monospace',
    fontWeight: '900',
  },
  infoVal: {
    color: '#e2e2ec',
    fontSize: '0.88rem',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  seatPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  seatPill: {
    backgroundColor: '#e50914',
    border: '1px solid #b80710',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: '2px',
    fontSize: '0.82rem',
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  amountVal: {
    color: '#22c55e',
    fontSize: '1.25rem',
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  bookingIdCode: {
    color: '#a0a0b2',
    backgroundColor: '#0c0c0e',
    border: '1px solid #282834',
    padding: '2px 8px',
    borderRadius: '2px',
    fontSize: '0.78rem',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    borderTop: '2px solid #282834',
    paddingTop: '16px',
    flexWrap: 'wrap',
  },
  viewTicketBtn: {
    backgroundColor: '#181820',
    border: '2px solid #282834',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: '2px',
    fontSize: '0.85rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    textDecoration: 'none',
    boxShadow: '2px 2px 0px #000000',
  },
  cancelBtn: {
    backgroundColor: '#201214',
    border: '2px solid #991b1b',
    color: '#f87171',
    padding: '8px 16px',
    borderRadius: '2px',
    fontSize: '0.85rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    cursor: 'pointer',
    boxShadow: '2px 2px 0px #000000',
    transition: 'background-color 0.15s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modalCard: {
    backgroundColor: '#181820',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '8px 8px 0px #000000',
    padding: '28px 22px',
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
    fontSize: '1.35rem',
    fontWeight: '900',
  },
  modalText: {
    color: '#a0a0b2',
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
    backgroundColor: '#141418',
    border: '2px solid #3f3f50',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: '800',
    fontFamily: 'monospace',
    boxShadow: '2px 2px 0px #000000',
  },
  modalConfirmCancelBtn: {
    backgroundColor: '#991b1b',
    border: '2px solid #ef4444',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontWeight: '900',
    fontFamily: 'monospace',
    boxShadow: '2px 2px 0px #000000',
  },
};
