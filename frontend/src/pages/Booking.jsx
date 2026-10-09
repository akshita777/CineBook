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
    if (!bookingState) return;

    const remainingSec = bookingState.ttlSeconds != null
      ? bookingState.ttlSeconds
      : bookingState.expiresAt
      ? Math.max(0, Math.floor((new Date(bookingState.expiresAt).getTime() - Date.now()) / 1000))
      : 300;

    const targetTime = Date.now() + remainingSec * 1000;

    const updateTimer = () => {
      const remainingSeconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
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
        userId: user?.id || user?.userId,
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
                  borderColor: paymentMethod === 'CARD' ? '#e50914' : '#282834',
                  backgroundColor: paymentMethod === 'CARD' ? '#201114' : '#141418',
                  boxShadow: paymentMethod === 'CARD' ? '2px 2px 0px #000000' : 'none',
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
                  borderColor: paymentMethod === 'UPI' ? '#e50914' : '#282834',
                  backgroundColor: paymentMethod === 'UPI' ? '#201114' : '#141418',
                  boxShadow: paymentMethod === 'UPI' ? '2px 2px 0px #000000' : 'none',
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
    gap: '10px',
    marginBottom: '28px',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#a0a0b2',
    cursor: 'pointer',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    padding: 0,
    letterSpacing: '0.5px',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 2.1rem)',
    fontWeight: '900',
    color: '#ffffff',
    wordBreak: 'break-word',
    letterSpacing: '-0.4px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    alignItems: 'start',
  },
  summaryCard: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '24px 20px',
  },
  timerBadge: {
    backgroundColor: '#0f2214',
    border: '2px solid #22c55e',
    color: '#4ade80',
    padding: '10px 14px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    flexWrap: 'wrap',
  },
  timerIcon: {
    fontSize: '1rem',
  },
  timerNum: {
    fontFamily: 'monospace',
    fontSize: '1.15rem',
    fontWeight: '900',
    color: '#ffffff',
    marginLeft: 'auto',
  },
  movieSection: {
    marginBottom: '16px',
  },
  movieTag: {
    color: '#ff4d58',
    fontSize: '0.72rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  movieTitle: {
    margin: '6px 0 10px 0',
    fontSize: '1.65rem',
    color: '#ffffff',
    fontWeight: '900',
    wordBreak: 'break-word',
    letterSpacing: '-0.3px',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    color: '#a0a0b2',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
  },
  divider: {
    height: '2px',
    backgroundColor: '#282834',
    margin: '20px 0',
  },
  section: {
    marginBottom: '16px',
  },
  sectionHeader: {
    fontSize: '0.95rem',
    color: '#e2e2ec',
    margin: '0 0 14px 0',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
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
    backgroundColor: '#181820',
    border: '2px solid #282834',
    padding: '10px 14px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
  },
  seatBadge: {
    backgroundColor: '#e50914',
    border: '1px solid #b80710',
    color: '#ffffff',
    padding: '4px 10px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
  },
  seatDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  seatType: {
    color: '#828294',
    fontSize: '0.82rem',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  seatPrice: {
    color: '#ffffff',
    fontWeight: '900',
    fontFamily: 'monospace',
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
    color: '#a0a0b2',
    fontWeight: '800',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
    textTransform: 'uppercase',
  },
  priceValue: {
    color: '#22c55e',
    fontSize: '1.65rem',
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  lockVerificationBox: {
    backgroundColor: '#0c0c0e',
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  lockLabel: {
    color: '#828294',
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  lockCode: {
    color: '#fbbf24',
    fontSize: '0.82rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    wordBreak: 'break-all',
  },
  paymentCard: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    margin: '0 0 6px 0',
    fontSize: '1.3rem',
    color: '#ffffff',
    fontWeight: '900',
    letterSpacing: '-0.3px',
  },
  cardSub: {
    color: '#828294',
    fontSize: '0.88rem',
    margin: '0 0 20px 0',
  },
  paymentOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  radioOption: {
    border: '2px solid #282834',
    borderRadius: '2px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  },
  radioInput: {
    accentColor: '#e50914',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  optionTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: '0.95rem',
  },
  optionDesc: {
    color: '#828294',
    fontSize: '0.82rem',
    marginTop: '2px',
  },
  demoNotice: {
    backgroundColor: '#101c28',
    border: '2px solid #224869',
    borderRadius: '2px',
    padding: '14px 16px',
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  demoIcon: {
    fontSize: '1.1rem',
  },
  demoText: {
    margin: 0,
    color: '#93c5fd',
    fontSize: '0.82rem',
    lineHeight: '1.45',
  },
  confirmBtn: {
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '14px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    fontSize: '1.05rem',
    cursor: 'pointer',
    boxShadow: '4px 4px 0px #000000',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  expiredCard: {
    backgroundColor: '#201214',
    border: '2px solid #7f1d1d',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '40px 24px',
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
    fontWeight: '900',
    margin: '0 0 12px 0',
  },
  expiredText: {
    color: '#fca5a5',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  reselectBtn: {
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #000000',
  },
  errorWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  errorCard: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '36px 24px',
    textAlign: 'center',
    maxWidth: '460px',
  },
  errorIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  errorTitle: {
    color: '#ffffff',
    fontWeight: '900',
    margin: '0 0 10px 0',
  },
  errorText: {
    color: '#828294',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    margin: '0 0 20px 0',
  },
  primaryBtn: {
    display: 'inline-block',
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '2px',
    textDecoration: 'none',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    boxShadow: '2px 2px 0px #000000',
  },
};
