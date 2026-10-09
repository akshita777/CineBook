import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingApi } from '../api/bookingApi';
import { seatApi } from '../api/seatApi';
import { ErrorMessage } from '../components/ErrorMessage';

export const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookingState = location.state;

  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');

  const timerRef = useRef(null);

  useEffect(() => {
    if (!bookingState?.expiresAt) return;

    const targetTime = new Date(bookingState.expiresAt).getTime();

    const updateTimer = () => {
      const remainingSeconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(timerRef.current);
        setError('Your seat lock has expired. The seats have been released. Please return to seat selection.');
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [bookingState]);

  if (!bookingState || !bookingState.lockToken) {
    return (
      <div style={styles.errorWrapper}>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon}>⚠️</div>
          <h2 style={styles.errorTitle}>No Active Seat Reservation</h2>
          <p style={styles.errorText}>
            No active seat lock was found in the session. Please select a show and reserve your seats to proceed.
          </p>
          <Link to="/" style={styles.primaryBtn}>
            Browse Movies
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft != null && timeLeft <= 0;

  const formatTime = (seconds) => {
    if (seconds == null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatShowDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) +
      ' at ' +
      d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  // Confirm booking via backend POST /api/bookings
  const handleConfirmBooking = async () => {
    if (isExpired || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await bookingApi.createBooking({
        userId: user?.id,
        showId: bookingState.showId,
        showSeatIds: bookingState.lockedSeatIds,
        lockToken: bookingState.lockToken,
      });

      // Navigate to confirmation page passing the authoritative booking response
      navigate(`/confirmation/${response.id}`, {
        state: {
          booking: response,
          paymentMethod,
        },
        replace: true,
      });
    } catch (err) {
      setError(
        err.message ||
          'Failed to confirm booking. Your lock may have timed out or seats were reclaimed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel reservation and release locks
  const handleCancelAndRelease = async () => {
    if (cancelling) return;

    setCancelling(true);
    try {
      await seatApi.unlockSeats({
        showId: bookingState.showId,
        seatIds: bookingState.lockedSeatIds,
        lockToken: bookingState.lockToken,
      });
    } catch {
      // Ignore unlock errors during exit
    } finally {
      navigate(`/shows/${bookingState.showId}/seats`);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button
          onClick={handleCancelAndRelease}
          style={styles.backButton}
          disabled={submitting}
        >
          ← Cancel & Change Seats
        </button>
        <h1 style={styles.title}>Checkout & Review</h1>
      </div>

      {isExpired ? (
        <div style={styles.expiredCard}>
          <div style={styles.expiredIcon}>⏱️</div>
          <h2 style={styles.expiredTitle}>Seat Reservation Expired</h2>
          <p style={styles.expiredText}>
            Your 5-minute seat lock timed out. In high-concurrency systems, locked seats are automatically
            returned to the general pool for other customers.
          </p>
          <button
            onClick={() => navigate(`/shows/${bookingState.showId}/seats`)}
            style={styles.reselectBtn}
          >
            Select Seats Again
          </button>
        </div>
      ) : (
        <div style={styles.layout}>
          {/* Left Column: Booking Summary */}
          <div style={styles.summaryCard}>
            <div style={styles.timerBadge}>
              <span style={styles.timerIcon}>⏱️</span>
              <span>Reservation Lock Active:</span>
              <strong style={styles.timerNum}>{formatTime(timeLeft)}</strong>
            </div>

            <div style={styles.movieSection}>
              <span style={styles.movieTag}>CINEBOOK TICKET</span>
              <h2 style={styles.movieTitle}>{bookingState.movieTitle}</h2>
              <div style={styles.metaRow}>
                <span>🏛️ {bookingState.venueName}</span>
                <span>•</span>
                <span>📽️ {bookingState.screenName}</span>
                <span>•</span>
                <span>📅 {formatShowDate(bookingState.startTime)}</span>
              </div>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.section}>
              <h3 style={styles.sectionHeader}>Selected Seats</h3>
              <div style={styles.seatGrid}>
                {bookingState.selectedSeats?.map((s) => (
                  <div key={s.showSeatId} style={styles.seatItem}>
                    <span style={styles.seatBadge}>
                      {s.seatRow}{s.seatNumber}
                    </span>
                    <div style={styles.seatDetails}>
                      <span style={styles.seatType}>{s.seatType || 'REGULAR'}</span>
                      <span style={styles.seatPrice}>₹{Number(s.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.priceRow}>
              <span style={styles.priceLabel}>Total Amount:</span>
              <span style={styles.priceValue}>₹{Number(bookingState.totalPrice).toFixed(2)}</span>
            </div>

            <div style={styles.lockVerificationBox}>
              <span style={styles.lockLabel}>Redis Lock Token Verified</span>
              <code style={styles.lockCode}>{bookingState.lockToken}</code>
            </div>
          </div>

          {/* Right Column: Mock Payment & Confirmation */}
          <div style={styles.paymentCard}>
            <h3 style={styles.cardHeader}>Mock Payment Method</h3>
            <p style={styles.cardSub}>
              Select a payment simulation option to complete checkout.
            </p>

            <div style={styles.paymentOptions}>
              <label
                style={{
                  ...styles.radioOption,
                  borderColor: paymentMethod === 'CARD' ? '#e50914' : '#333333',
                  backgroundColor: paymentMethod === 'CARD' ? '#251517' : '#191919',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  value="CARD"
                  checked={paymentMethod === 'CARD'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={styles.radioInput}
                />
                <div>
                  <div style={styles.optionTitle}>💳 Credit / Debit Card</div>
                  <div style={styles.optionDesc}>Instant authorization simulation</div>
                </div>
              </label>

              <label
                style={{
                  ...styles.radioOption,
                  borderColor: paymentMethod === 'UPI' ? '#e50914' : '#333333',
                  backgroundColor: paymentMethod === 'UPI' ? '#251517' : '#191919',
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  value="UPI"
                  checked={paymentMethod === 'UPI'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={styles.radioInput}
                />
                <div>
                  <div style={styles.optionTitle}>📱 UPI / Net Banking</div>
                  <div style={styles.optionDesc}>Simulated instant mock transfer</div>
                </div>
              </label>
            </div>

            {error && <ErrorMessage message={error} />}

            <div style={styles.demoNotice}>
              <span style={styles.demoIcon}>ℹ️</span>
              <p style={styles.demoText}>
                <strong>Demonstration Flow:</strong> Confirming submits a transactional booking request
                (<code>POST /api/bookings</code>) with your validated Redis lock token. The backend verifies seat ownership,
                applies PostgreSQL pessimistic locks, marks seats as booked, and permanently persists your reservation.
              </p>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={submitting || isExpired}
              style={{
                ...styles.confirmBtn,
                opacity: submitting || isExpired ? 0.6 : 1,
              }}
            >
              {submitting ? 'Confirming in Database...' : `Confirm & Pay ₹${Number(bookingState.totalPrice).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: {
    padding: '24px 0 60px 0',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '28px',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#bbbbbb',
    cursor: 'pointer',
    fontSize: '0.92rem',
    padding: 0,
    fontWeight: '500',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '800',
    color: '#ffffff',
    wordBreak: 'break-word',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    alignItems: 'start',
  },
  summaryCard: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '22px 18px',
  },
  timerBadge: {
    backgroundColor: '#1e3820',
    border: '1px solid #2e7d32',
    color: '#a5d6a7',
    padding: '10px 14px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    fontSize: '0.9rem',
    flexWrap: 'wrap',
  },
  timerIcon: {
    fontSize: '1.1rem',
  },
  timerNum: {
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    color: '#ffffff',
    marginLeft: 'auto',
  },
  movieSection: {
    marginBottom: '16px',
  },
  movieTag: {
    color: '#e50914',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  movieTitle: {
    margin: '6px 0 10px 0',
    fontSize: '1.6rem',
    color: '#ffffff',
    fontWeight: '800',
    wordBreak: 'break-word',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    color: '#aaaaaa',
    fontSize: '0.9rem',
  },
  divider: {
    height: '1px',
    backgroundColor: '#282828',
    margin: '20px 0',
  },
  section: {
    marginBottom: '16px',
  },
  sectionHeader: {
    fontSize: '1.05rem',
    color: '#cccccc',
    margin: '0 0 14px 0',
    fontWeight: '600',
  },
  seatGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  seatItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#222222',
    border: '1px solid #333333',
    padding: '10px 14px',
    borderRadius: '8px',
  },
  seatBadge: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  seatDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  seatType: {
    color: '#888888',
    fontSize: '0.85rem',
  },
  seatPrice: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.95rem',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '1.2rem',
    marginBottom: '20px',
  },
  priceLabel: {
    color: '#aaaaaa',
    fontWeight: '600',
  },
  priceValue: {
    color: '#4caf50',
    fontSize: '1.6rem',
    fontWeight: '800',
  },
  lockVerificationBox: {
    backgroundColor: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  lockLabel: {
    color: '#777777',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  lockCode: {
    color: '#ff9800',
    fontSize: '0.82rem',
    wordBreak: 'break-all',
  },
  paymentCard: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '22px 18px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    margin: '0 0 6px 0',
    fontSize: '1.3rem',
    color: '#ffffff',
    fontWeight: '700',
  },
  cardSub: {
    color: '#888888',
    fontSize: '0.9rem',
    margin: '0 0 20px 0',
  },
  paymentOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  radioOption: {
    border: '1px solid #333333',
    borderRadius: '8px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  radioInput: {
    accentColor: '#e50914',
    cursor: 'pointer',
  },
  optionTitle: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  optionDesc: {
    color: '#888888',
    fontSize: '0.82rem',
    marginTop: '2px',
  },
  demoNotice: {
    backgroundColor: '#172430',
    border: '1px solid #244663',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
  },
  demoIcon: {
    fontSize: '1.1rem',
  },
  demoText: {
    margin: 0,
    color: '#90caf9',
    fontSize: '0.84rem',
    lineHeight: '1.45',
  },
  confirmBtn: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '1.05rem',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 4px 16px rgba(229, 9, 20, 0.4)',
  },
  expiredCard: {
    backgroundColor: '#261414',
    border: '1px solid #5c2020',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '540px',
    margin: '20px auto',
  },
  expiredIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  expiredTitle: {
    color: '#ffffff',
    margin: '0 0 12px 0',
  },
  expiredText: {
    color: '#d0a0a0',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  reselectBtn: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
  },
  errorWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  errorCard: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '36px',
    textAlign: 'center',
    maxWidth: '460px',
  },
  errorIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  errorTitle: {
    color: '#ffffff',
    margin: '0 0 10px 0',
  },
  errorText: {
    color: '#888888',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  primaryBtn: {
    display: 'inline-block',
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
  },
};
