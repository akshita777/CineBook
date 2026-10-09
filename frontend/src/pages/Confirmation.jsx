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
            <span style={styles.brandLogo}>CINEBOOK</span>
            <span
              style={{
                ...styles.statusTag,
                backgroundColor: isConfirmed ? '#1b3b22' : '#3d1b1b',
                color: isConfirmed ? '#66bb6a' : '#ef5350',
                border: isConfirmed ? '1px solid #2e7d32' : '1px solid #c62828',
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
    gap: '6px',
    backgroundColor: '#1b3b22',
    color: '#81c784',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '1px',
    marginBottom: '10px',
  },
  statusDot: {
    fontSize: '0.8rem',
  },
  mainHeading: {
    margin: '0 0 8px 0',
    fontSize: '2.2rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  subHeading: {
    margin: 0,
    color: '#aaaaaa',
    fontSize: '0.92rem',
  },
  ticketCard: {
    backgroundColor: '#1c1c1c',
    border: '1px solid #333333',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
    position: 'relative',
    marginBottom: '24px',
  },
  ticketTop: {
    padding: '24px 20px 18px 20px',
    background: 'linear-gradient(180deg, #242424 0%, #1c1c1c 100%)',
  },
  brandRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  brandLogo: {
    fontSize: '0.85rem',
    fontWeight: '900',
    letterSpacing: '2px',
    color: '#e50914',
  },
  statusTag: {
    fontSize: '0.75rem',
    fontWeight: '800',
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.5px',
  },
  ticketMovieTitle: {
    margin: '0 0 10px 0',
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.2',
    wordBreak: 'break-word',
  },
  theatreMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    color: '#bbbbbb',
    fontSize: '0.92rem',
  },
  perforatedRow: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    height: '24px',
    backgroundColor: '#1c1c1c',
  },
  notchLeft: {
    width: '16px',
    height: '24px',
    backgroundColor: 'var(--bg-color, #141414)',
    borderTopRightRadius: '16px',
    borderBottomRightRadius: '16px',
    borderRight: '1px solid #333333',
    position: 'absolute',
    left: 0,
  },
  notchRight: {
    width: '16px',
    height: '24px',
    backgroundColor: 'var(--bg-color, #141414)',
    borderTopLeftRadius: '16px',
    borderBottomLeftRadius: '16px',
    borderLeft: '1px solid #333333',
    position: 'absolute',
    right: 0,
  },
  perforatedLine: {
    flex: 1,
    height: '1px',
    borderTop: '2px dashed #3a3a3a',
    margin: '0 24px',
  },
  ticketBody: {
    padding: '20px 18px 24px 18px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    marginBottom: '22px',
  },
  infoCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  cellLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: '#777777',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  cellValue: {
    fontSize: '0.95rem',
    color: '#ffffff',
    fontWeight: '600',
  },
  seatPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '2px',
  },
  seatPill: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  priceValue: {
    fontSize: '1.4rem',
    color: '#4caf50',
    fontWeight: '800',
  },
  barcodeSection: {
    borderTop: '1px solid #2a2a2a',
    paddingTop: '18px',
    textAlign: 'center',
  },
  barcodeBars: {
    height: '36px',
    background: 'repeating-linear-gradient(90deg, #ffffff 0, #ffffff 2px, transparent 2px, transparent 5px, #ffffff 5px, #ffffff 8px, transparent 8px, transparent 10px, #ffffff 10px, #ffffff 14px, transparent 14px, transparent 18px)',
    maxWidth: '280px',
    margin: '0 auto 10px auto',
    opacity: 0.8,
  },
  bookingRefLabel: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#777777',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  bookingRefCode: {
    display: 'block',
    marginTop: '2px',
    color: '#ff9800',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  systemCallout: {
    backgroundColor: '#16232e',
    border: '1px solid #20405c',
    borderRadius: '10px',
    padding: '14px 18px',
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
    color: '#90caf9',
    fontSize: '0.88rem',
    marginBottom: '4px',
  },
  calloutText: {
    margin: 0,
    color: '#bbdefb',
    fontSize: '0.82rem',
    lineHeight: '1.45',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  printBtn: {
    backgroundColor: '#2b2b2b',
    border: '1px solid #444444',
    color: '#ffffff',
    padding: '11px 20px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryBtn: {
    backgroundColor: '#222222',
    border: '1px solid #3d3d3d',
    color: '#ffffff',
    padding: '11px 20px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  primaryBtn: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '11px 22px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '700',
    textDecoration: 'none',
  },
  errorWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  card: {
    backgroundColor: '#1c1c1c',
    border: '1px solid #2e2e2e',
    borderRadius: '12px',
    padding: '36px',
    textAlign: 'center',
    maxWidth: '480px',
  },
  cinemaIcon: {
    fontSize: '2.5rem',
    marginBottom: '10px',
  },
  emptySub: {
    color: '#888888',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    margin: '0 0 24px 0',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
};
