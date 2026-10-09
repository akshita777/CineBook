import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { seatApi } from '../api/seatApi';
import { SeatMap } from '../components/SeatMap';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';

export const SeatSelection = () => {
  const { showId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const [seatMapData, setSeatMapData] = useState(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lockData, setLockData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [expiredMessage, setExpiredMessage] = useState(null);

  const countdownTimerRef = useRef(null);

  // Fetch real seat availability from backend
  const fetchSeatMap = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seatApi.getSeatMapForShow(showId);
      setSeatMapData(data);
    } catch (err) {
      setError(err.message || 'Failed to load seat availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showId) {
      fetchSeatMap();
    }
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [showId]);

  // Handle countdown timer when lockData changes
  useEffect(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (!lockData) {
      setTimeLeft(null);
      return;
    }

    // Determine target expiration time:
    // Prefer using ttlSeconds (e.g. 300) relative to client time when lock was acquired,
    // which prevents any clock skew or timezone mismatch between client and backend.
    const ttlSeconds = lockData.ttlSeconds != null ? lockData.ttlSeconds : 300;
    const targetTime = Date.now() + ttlSeconds * 1000;

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        setLockData(null);
        setSelectedSeatIds([]);
        setExpiredMessage(
          'Your 5-minute seat reservation has expired. The seats have been released back to the pool. Please select your seats again.'
        );
        fetchSeatMap();
      }
    };

    updateCountdown();
    countdownTimerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [lockData]);

  // Map selected seat objects from seatMapData
  const selectedSeats = useMemo(() => {
    if (!seatMapData || !seatMapData.seats) return [];
    const idSet = new Set(selectedSeatIds);
    return seatMapData.seats.filter((s) => idSet.has(s.showSeatId));
  }, [seatMapData, selectedSeatIds]);

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((sum, s) => sum + Number(s.price || 0), 0);
  }, [selectedSeats]);

  // Toggle seat selection
  const handleToggleSeat = (seat) => {
    if (lockData) return; // Disallow changing selection once locked

    setExpiredMessage(null);
    setError(null);

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.showSeatId)) {
        return prev.filter((id) => id !== seat.showSeatId);
      } else {
        return [...prev, seat.showSeatId];
      }
    });
  };

  // Lock selected seats via backend API
  const handleLockSeats = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    if (selectedSeatIds.length === 0) {
      setError('Please select at least one seat to reserve.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setExpiredMessage(null);

    try {
      const response = await seatApi.lockSeats({
        userId: user?.id || user?.userId,
        showId,
        showSeatIds: selectedSeatIds,
      });

      setLockData(response);
    } catch (err) {
      setError(
        err.message ||
          'Failed to lock selected seats. They may have been locked by another customer. Refreshing seat map...'
      );
      // Immediately refresh seat map to reflect conflicting seat locks
      fetchSeatMap();
      setSelectedSeatIds([]);
    } finally {
      setActionLoading(false);
    }
  };

  // Unlock seats manually
  const handleUnlockSeats = async () => {
    if (!lockData) return;

    setActionLoading(true);
    try {
      await seatApi.unlockSeats({
        showId,
        seatIds: lockData.lockedSeatIds,
        lockToken: lockData.lockToken,
      });
      setLockData(null);
      setSelectedSeatIds([]);
      fetchSeatMap();
    } catch (err) {
      setError('Failed to release seat lock: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Proceed to Booking Page
  const handleContinueToBooking = () => {
    if (!lockData || !timeLeft || timeLeft <= 0) {
      setError('Your seat lock has expired. Please reselect and lock your seats.');
      return;
    }

    navigate('/booking', {
      state: {
        showId,
        movieTitle: seatMapData.movieTitle,
        venueName: seatMapData.venueName,
        screenName: seatMapData.screenName,
        startTime: seatMapData.startTime,
        lockedSeatIds: lockData.lockedSeatIds,
        lockToken: lockData.lockToken,
        expiresAt: lockData.expiresAt,
        ttlSeconds: timeLeft || 300,
        selectedSeats,
        totalPrice,
      },
    });
  };

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

  if (loading) {
    return <Loading message="Loading theatre seat map..." />;
  }

  if (error && !seatMapData) {
    return (
      <div style={styles.page}>
        <Link to="/" style={styles.backLink}>← Back to Movies</Link>
        <ErrorMessage message={error} onRetry={fetchSeatMap} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.navRow}>
        <Link to="/" style={styles.backLink}>← Back to Movies</Link>
        <button
          onClick={fetchSeatMap}
          style={styles.refreshBtn}
          disabled={loading || actionLoading}
          title="Refresh real-time seat availability"
        >
          🔄 Refresh Seats
        </button>
      </div>

      {/* Show & Movie Info Banner */}
      <div style={styles.showBanner}>
        <div style={styles.bannerDetails}>
          <span style={styles.bannerBadge}>LIVE RESERVATION</span>
          <h1 style={styles.movieTitle}>{seatMapData?.movieTitle}</h1>
          <div style={styles.metaRow}>
            <span>🏛️ {seatMapData?.venueName}</span>
            <span>•</span>
            <span>📽️ {seatMapData?.screenName}</span>
            <span>•</span>
            <span>📅 {formatShowDate(seatMapData?.startTime)}</span>
          </div>
        </div>

        <div style={styles.seatStats}>
          <div style={styles.statBox}>
            <span style={styles.statNum}>{seatMapData?.availableSeats}</span>
            <span style={styles.statLabel}>Available Seats</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statNum}>{seatMapData?.totalSeats}</span>
            <span style={styles.statLabel}>Total Capacity</span>
          </div>
        </div>
      </div>

      {/* Expiration or Conflict Alerts */}
      {expiredMessage && (
        <div style={styles.expiredBanner}>
          <span style={styles.alertIcon}>⚠️</span>
          <span>{expiredMessage}</span>
        </div>
      )}

      {error && <ErrorMessage message={error} onRetry={fetchSeatMap} />}

      {/* Seat Map Layout */}
      <div style={styles.mapCard}>
        <SeatMap
          seats={seatMapData?.seats || []}
          selectedSeatIds={selectedSeatIds}
          onToggleSeat={handleToggleSeat}
          isLocked={!!lockData}
        />
      </div>

      {/* Bottom Summary & Lock Control Bar */}
      <div style={styles.bottomBar}>
        <div style={styles.summaryDetails}>
          <div style={styles.selectedRow}>
            <span style={styles.summaryLabel}>Selected Seats:</span>
            {selectedSeats.length > 0 ? (
              <span style={styles.seatList}>
                {selectedSeats.map((s) => `${s.seatRow}${s.seatNumber}`).join(', ')}
              </span>
            ) : (
              <span style={styles.noSeats}>None selected</span>
            )}
          </div>

          <div style={styles.priceRow}>
            <span style={styles.summaryLabel}>Total Amount:</span>
            <span style={styles.totalAmount}>₹{totalPrice.toFixed(2)}</span>
            <span style={styles.seatCount}>({selectedSeats.length} seats)</span>
          </div>
        </div>

        {/* Lock / Continue Controls */}
        <div style={styles.actionSection}>
          {lockData ? (
            <div style={styles.lockSuccessBox}>
              <div style={styles.timerBadge}>
                <span style={styles.timerIcon}>⏱️</span>
                <span>Lock expires in: </span>
                <strong style={styles.timerValue}>{formatTime(timeLeft)}</strong>
              </div>

              <div style={styles.lockActionButtons}>
                <button
                  onClick={handleUnlockSeats}
                  disabled={actionLoading}
                  style={styles.cancelLockBtn}
                >
                  Cancel Lock
                </button>
                <button
                  onClick={handleContinueToBooking}
                  disabled={actionLoading || timeLeft <= 0}
                  style={styles.continueBtn}
                >
                  Continue to Booking →
                </button>
              </div>
            </div>
          ) : (
            <div>
              {isAuthenticated ? (
                <button
                  onClick={handleLockSeats}
                  disabled={actionLoading || selectedSeatIds.length === 0}
                  style={styles.lockBtn}
                >
                  {actionLoading ? 'Securing Lock in Redis...' : `Lock & Reserve (${selectedSeatIds.length})`}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login', { state: { from: location.pathname } })}
                  style={styles.authLockBtn}
                >
                  Sign in to Reserve Seats
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    padding: '24px 0 60px 0',
  },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  backLink: {
    color: '#a0a0b2',
    textDecoration: 'none',
    fontSize: '0.88rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
  },
  refreshBtn: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    color: '#e2e2ec',
    padding: '8px 16px',
    borderRadius: '2px',
    fontSize: '0.82rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    boxShadow: '2px 2px 0px #000000',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, border-color 0.1s ease',
  },
  showBanner: {
    backgroundColor: '#141418',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '22px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  bannerDetails: {
    flex: 1,
    minWidth: '220px',
  },
  bannerBadge: {
    backgroundColor: '#e50914',
    border: '1px solid #b80710',
    color: '#ffffff',
    fontSize: '0.72rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    padding: '3px 8px',
    borderRadius: '2px',
    letterSpacing: '1px',
    display: 'inline-block',
    marginBottom: '10px',
  },
  movieTitle: {
    margin: '0 0 10px 0',
    fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
    fontWeight: '900',
    color: '#ffffff',
    wordBreak: 'break-word',
    letterSpacing: '-0.4px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#a0a0b2',
    fontSize: '0.88rem',
    fontFamily: 'monospace',
    flexWrap: 'wrap',
  },
  seatStats: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: '#181820',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
    padding: '12px 18px',
    textAlign: 'center',
    minWidth: '90px',
  },
  statNum: {
    display: 'block',
    fontSize: '1.4rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '0.68rem',
    color: '#828294',
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  expiredBanner: {
    backgroundColor: '#261805',
    border: '2px solid #d97706',
    borderRadius: '2px',
    boxShadow: '3px 3px 0px #000000',
    color: '#fef08a',
    padding: '14px 18px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  alertIcon: {
    fontSize: '1.2rem',
  },
  mapCard: {
    backgroundColor: '#101014',
    border: '2px solid #282834',
    borderRadius: '2px',
    boxShadow: '4px 4px 0px #000000',
    padding: '28px 16px',
    marginBottom: '24px',
    overflowX: 'hidden',
  },
  bottomBar: {
    position: 'sticky',
    bottom: '12px',
    backgroundColor: '#141418',
    border: '2px solid #323244',
    borderRadius: '2px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    boxShadow: '0 -4px 28px rgba(0,0,0,0.85)',
    flexWrap: 'wrap',
  },
  summaryDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: '1 1 200px',
  },
  selectedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.92rem',
  },
  summaryLabel: {
    color: '#828294',
    fontWeight: '800',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  seatList: {
    color: '#22c55e',
    fontWeight: '900',
    fontFamily: 'monospace',
    fontSize: '1rem',
  },
  noSeats: {
    color: '#606070',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  totalAmount: {
    fontSize: '1.4rem',
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  seatCount: {
    color: '#828294',
    fontFamily: 'monospace',
    fontSize: '0.82rem',
  },
  actionSection: {
    display: 'flex',
    alignItems: 'center',
  },
  lockBtn: {
    backgroundColor: '#e50914',
    border: '2px solid #b80710',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #000000',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  authLockBtn: {
    backgroundColor: '#181820',
    border: '2px solid #3f3f50',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #000000',
  },
  lockSuccessBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  timerBadge: {
    backgroundColor: '#0f2214',
    border: '2px solid #22c55e',
    color: '#4ade80',
    padding: '8px 14px',
    borderRadius: '2px',
    boxShadow: '2px 2px 0px #000000',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    fontWeight: '800',
  },
  timerIcon: {
    fontSize: '0.95rem',
  },
  timerValue: {
    color: '#ffffff',
    fontSize: '1.1rem',
    fontFamily: 'monospace',
    fontWeight: '900',
  },
  lockActionButtons: {
    display: 'flex',
    gap: '10px',
  },
  cancelLockBtn: {
    backgroundColor: '#201214',
    border: '2px solid #991b1b',
    color: '#f87171',
    padding: '10px 16px',
    borderRadius: '2px',
    fontWeight: '800',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  continueBtn: {
    backgroundColor: '#16a34a',
    border: '2px solid #22c55e',
    color: '#ffffff',
    padding: '10px 22px',
    borderRadius: '2px',
    fontWeight: '900',
    fontFamily: 'monospace',
    fontSize: '0.92rem',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #000000',
  },
};
