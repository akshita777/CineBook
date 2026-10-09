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

    if (!lockData || !lockData.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const targetTime = new Date(lockData.expiresAt).getTime();

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      setTimeLeft(remainingSeconds);

      if (remainingSeconds <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
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
        userId: user?.id,
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
    color: '#bbbbbb',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  refreshBtn: {
    backgroundColor: '#262626',
    border: '1px solid #3a3a3a',
    color: '#dddddd',
    padding: '6px 14px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  showBanner: {
    backgroundColor: '#1b1b1b',
    border: '1px solid #2b2b2b',
    borderRadius: '10px',
    padding: '20px 16px',
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
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '3px',
    letterSpacing: '1px',
    display: 'inline-block',
    marginBottom: '8px',
  },
  movieTitle: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
    fontWeight: '800',
    color: '#ffffff',
    wordBreak: 'break-word',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#aaaaaa',
    fontSize: '0.9rem',
    flexWrap: 'wrap',
  },
  seatStats: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  statBox: {
    backgroundColor: '#222222',
    border: '1px solid #333333',
    borderRadius: '8px',
    padding: '10px 14px',
    textAlign: 'center',
    minWidth: '80px',
  },
  statNum: {
    display: 'block',
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: '#888888',
    textTransform: 'uppercase',
  },
  expiredBanner: {
    backgroundColor: '#382510',
    border: '1px solid #b26a00',
    color: '#ffd599',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.9rem',
  },
  alertIcon: {
    fontSize: '1.2rem',
  },
  mapCard: {
    backgroundColor: '#161616',
    border: '1px solid #282828',
    borderRadius: '12px',
    padding: '24px 14px',
    marginBottom: '24px',
    overflowX: 'hidden',
  },
  bottomBar: {
    position: 'sticky',
    bottom: '12px',
    backgroundColor: '#1d1d1d',
    border: '1px solid #383838',
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
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
    fontSize: '0.95rem',
  },
  summaryLabel: {
    color: '#888888',
    fontWeight: '600',
  },
  seatList: {
    color: '#4caf50',
    fontWeight: '700',
    fontSize: '1rem',
  },
  noSeats: {
    color: '#666666',
    fontStyle: 'italic',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  totalAmount: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  seatCount: {
    color: '#888888',
    fontSize: '0.85rem',
  },
  actionSection: {
    display: 'flex',
    alignItems: 'center',
  },
  lockBtn: {
    backgroundColor: '#e50914',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    border: 'none',
  },
  authLockBtn: {
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '1rem',
    cursor: 'pointer',
    border: '1px solid #555555',
  },
  lockSuccessBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  timerBadge: {
    backgroundColor: '#23381e',
    border: '1px solid #3e7834',
    color: '#a7e899',
    padding: '8px 14px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
  },
  timerIcon: {
    fontSize: '1rem',
  },
  timerValue: {
    color: '#ffffff',
    fontSize: '1.05rem',
    fontFamily: 'monospace',
  },
  lockActionButtons: {
    display: 'flex',
    gap: '10px',
  },
  cancelLockBtn: {
    backgroundColor: '#2e1819',
    border: '1px solid #632628',
    color: '#e57373',
    padding: '10px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  continueBtn: {
    backgroundColor: '#4caf50',
    border: 'none',
    color: '#ffffff',
    padding: '10px 20px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(76, 175, 80, 0.4)',
  },
};
