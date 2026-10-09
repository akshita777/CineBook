import React, { useState, useEffect } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { bookingApi } from '../api/bookingApi';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';

export const Confirmation = () => {
  const location = useLocation();
  const { id: paramBookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking && !!paramBookingId);
  const [error, setError] = useState(null);

  // Resilient retrieval: If page is refreshed or accessed directly via /confirmation/:id
  useEffect(() => {
    if (!booking && paramBookingId) {
      const fetchBooking = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await bookingApi.getBookingById(paramBookingId);
          setBooking(data);
        } catch (err) {
          setError(err.message || 'Unable to retrieve booking details. It may not exist or you lack permission.');
        } finally {
          setLoading(false);
        }
      };

      fetchBooking();
    }
  }, [paramBookingId, booking]);

  const formatDateTime = (iso) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' at ' +
      d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <Loading message="Retrieving your confirmed ticket..." />;
  }

  if (error) {
    return (
      <div style={styles.errorWrapper}>
        <div style={styles.card}>
          <ErrorMessage message={error} />
          <div style={styles.actionRow}>
            <Link to="/bookings" style={styles.secondaryBtn}>
              Go to My Bookings
            </Link>
            <Link to="/" style={styles.primaryBtn}>
              Browse Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div style={styles.errorWrapper}>
        <div style={styles.card}>
          <div style={styles.cinemaIcon}>🎟️</div>
          <h2>No Booking Specified</h2>
          <p style={styles.emptySub}>
            Looking for your active or past reservations? View all confirmed tickets in your booking history.
          </p>
          <div style={styles.actionRow}>
            <Link to="/bookings" style={styles.secondaryBtn}>
              View My Bookings
            </Link>
            <Link to="/" style={styles.primaryBtn}>
              Browse Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === 'CONFIRMED';

  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerArea}>
        <div style={styles.statusPill}>
          <span style={styles.statusDot}>●</span>
          <span>{isConfirmed ? 'RESERVATION CONFIRMED' : `STATUS: ${booking.status}`}</span>
        </div>
        <h1 style={styles.mainHeading}>Your Cinema E-Ticket</h1>
        <p style={styles.subHeading}>
          Present this digital ticket at the theatre entrance or kiosk upon arrival.
        </p>
      </div>

      {/* Cinema Ticket Card */}
      <div style={styles.ticketCard}>
        {/* Ticket Header */}
        <div style={styles.ticketTop}>
          <div style={styles.brandRow}>
            <span style={styles.brandLogo}>[CINE] BOOK E-TICKET</span>
            <span
              style={{
                ...styles.statusTag,
                backgroundColor: isConfirmed ? '#0f2214' : '#201214',
                color: isConfirmed ? '#4ade80' : '#f87171',
                border: isConfirmed ? '1.5px solid #22c55e' : '1.5px solid #ef4444',
              }}
            >
              {booking.status}
            </span>
          </div>

          <h2 style={styles.ticketMovieTitle}>{booking.movieTitle}</h2>

          <div style={styles.theatreMeta}>
            <span>🏛️ {booking.venueName}</span>
            <span>•</span>
            <span>📽️ {booking.screenName}</span>
          </div>
        </div>

        {/* Perforated Divider */}
        <div style={styles.perforatedRow}>
          <div style={styles.notchLeft}></div>
          <div style={styles.perforatedLine}></div>
          <div style={styles.notchRight}></div>
        </div>

        {/* Ticket Body */}
        <div style={styles.ticketBody}>
          <div style={styles.infoGrid}>
            <div style={styles.infoCell}>
              <span style={styles.cellLabel}>SHOWTIME</span>
              <span style={styles.cellValue}>{formatDateTime(booking.showStartTime)}</span>
            </div>

            <div style={styles.infoCell}>
              <span style={styles.cellLabel}>SEATS ({booking.bookedSeats?.length || 0})</span>
              <div style={styles.seatPills}>
                {booking.bookedSeats?.map((seat) => (
                  <span key={seat} style={styles.seatPill}>
                    {seat}
                  </span>
                ))}
              </div>
            </div>

            <div style={styles.infoCell}>
              <span style={styles.cellLabel}>TOTAL PAID</span>
              <span style={styles.priceValue}>₹{Number(booking.totalAmount).toFixed(2)}</span>
            </div>

            <div style={styles.infoCell}>
              <span style={styles.cellLabel}>PAYMENT METHOD</span>
              <span style={styles.cellValue}>Demo Mock Checkout (Simulated)</span>
            </div>
          </div>

          <div style={styles.barcodeSection}>
            <div style={styles.barcodeBars}>
              <div style={styles.barLines}></div>
            </div>
            <span style={styles.bookingRefLabel}>BOOKING REFERENCE</span>
            <code style={styles.bookingRefCode}>{booking.id}</code>
          </div>
        </div>
      </div>

      {/* System Technical Note */}
      <div style={styles.systemCallout}>
        <span style={styles.calloutIcon}>⚡</span>
        <div style={styles.calloutContent}>
          <strong style={styles.calloutTitle}>High-Concurrency Transaction Complete:</strong>
          <p style={styles.calloutText}>
            Seats have transitioned from Redis distributed locks to <code>BOOKED</code> status in PostgreSQL.
            A <code>BookingConfirmedEvent</code> has been produced to Kafka for asynchronous notification handling.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionButtons}>
        <button onClick={handlePrint} style={styles.printBtn}>
          🖨️ Print Ticket
        </button>
        <button onClick={() => navigate('/bookings')} style={styles.secondaryBtn}>
          View in My Bookings
        </button>
        <Link to="/" style={styles.primaryBtn}>
          Book Another Movie
        </Link>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    padding: '30px 16px 80px 16px',
    maxWidth: '640px',
    margin: '0 auto',
  },
  headerArea: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0f2214',
    border: '2px solid #22c55e',
    color: '#4ade80',
    padding: '6px 14px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
    fontSize: '0.75rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  statusDot: {
    fontSize: '0.8rem',
  },
  mainHeading: {
    margin: '0 0 8px 0',
    fontSize: '2.3rem',
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  subHeading: {
    margin: 0,
    color: '#a0a0b2',
    fontSize: '0.92rem',
  },
  ticketCard: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    overflow: 'hidden',
    boxShadow: '6px 6px 0px #000000',
    position: 'relative',
    marginBottom: '28px',
  },
  ticketTop: {
    padding: '24px 22px 18px 22px',
    backgroundColor: '#181820',
    borderBottom: '2px solid #282834',
  },
  brandRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  brandLogo: {
    fontSize: '0.82rem',
    fontWeight: '900',
    letterSpacing: '1.5px',
    fontFamily: 'monospace',
    color: '#e50914',
  },
  statusTag: {
    fontSize: '0.72rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    padding: '4px 10px',
    borderRadius: '2px',
    letterSpacing: '0.5px',
  },
  ticketMovieTitle: {
    margin: '0 0 10px 0',
    fontSize: '1.85rem',
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: '1.2',
    wordBreak: 'break-word',
    letterSpacing: '-0.3px',
  },
  theatreMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    color: '#a0a0b2',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
  },
  perforatedRow: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    height: '24px',
    backgroundColor: '#141418',
  },
  notchLeft: {
    width: '16px',
    height: '24px',
    backgroundColor: '#0c0c0e',
    borderTop: '2px solid #282834',
    borderBottom: '2px solid #282834',
    borderRight: '2px solid #282834',
    borderRadius: '0 2px 2px 0',
    position: 'absolute',
    left: 0,
  },
  notchRight: {
    width: '16px',
    height: '24px',
    backgroundColor: '#0c0c0e',
    borderTop: '2px solid #282834',
    borderBottom: '2px solid #282834',
    borderLeft: '2px solid #282834',
    borderRadius: '2px 0 0 2px',
    position: 'absolute',
    right: 0,
  },
  perforatedLine: {
    flex: 1,
    height: '1px',
    borderTop: '2px dashed #3a3a4c',
    margin: '0 24px',
  },
  ticketBody: {
    padding: '22px 22px 24px 22px',
    backgroundColor: '#141418',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '18px',
    marginBottom: '24px',
  },
  infoCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cellLabel: {
    fontSize: '0.72rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#828294',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  cellValue: {
    fontSize: '0.95rem',
    color: '#ffffff',
    fontWeight: '700',
  },
  seatPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px',
  },
  seatPill: {
    backgroundColor: '#e50914',
    border: '1px solid #b80710',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    padding: '3px 8px',
    borderRadius: '2px',
  },
  priceValue: {
    fontSize: '1.45rem',
    color: '#22c55e',
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  barcodeSection: {
    borderTop: '2px solid #282834',
    paddingTop: '20px',
    textAlign: 'center',
  },
  barcodeBars: {
    height: '38px',
    background: 'repeating-linear-gradient(90deg, #ffffff 0, #ffffff 2px, transparent 2px, transparent 5px, #ffffff 5px, #ffffff 8px, transparent 8px, transparent 10px, #ffffff 10px, #ffffff 14px, transparent 14px, transparent 18px)',
    maxWidth: '280px',
    margin: '0 auto 12px auto',
    opacity: 0.85,
  },
  bookingRefLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#828294',
    letterSpacing: '1px',
    fontFamily: 'monospace',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bookingRefCode: {
    display: 'inline-block',
    marginTop: '4px',
    color: '#fbbf24',
    backgroundColor: '#0c0c0e',
    border: '1px solid #282834',
    padding: '4px 10px',
    borderRadius: '2px',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    wordBreak: 'break-all',
  },
  systemCallout: {
    backgroundColor: '#101c28',
    border: '2px solid #224869',
    borderRadius: '2px',
    boxShadow: '3px 3px 0px #000000',
    padding: '16px 18px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '28px',
  },
  calloutIcon: {
    fontSize: '1.2rem',
  },
  calloutContent: {
    flex: 1,
  },
  calloutTitle: {
    display: 'block',
    color: '#93c5fd',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    marginBottom: '4px',
  },
  calloutText: {
    margin: 0,
    color: '#bfdbfe',
    fontSize: '0.82rem',
    lineHeight: '1.45',
  },
  actionButtons: {
    display: 'flex',
    gap: '14px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  printBtn: {
    backgroundColor: '#181820',
    border: '2px solid #282834',
    color: '#ffffff',
    padding: '11px 20px',
    borderRadius: '2px',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    cursor: 'pointer',
    boxShadow: '2px 2px 0px #000000',
  },
  secondaryBtn: {
    backgroundColor: '#181820',
    border: '2px solid #282834',
    color: '#ffffff',
    padding: '11px 20px',
    borderRadius: '2px',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '800',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '2px 2px 0px #000000',
  },
  primaryBtn: {
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '11px 22px',
    borderRadius: '2px',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    fontWeight: '900',
    textDecoration: 'none',
    boxShadow: '3px 3px 0px #000000',
  },
  errorWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  card: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '36px 24px',
    textAlign: 'center',
    maxWidth: '480px',
  },
  cinemaIcon: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  emptySub: {
    color: '#828294',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
};
