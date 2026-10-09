import React from 'react';

export const SeatMap = ({
  seats = [],
  selectedSeatIds = [],
  onToggleSeat,
  isLocked = false,
}) => {
  // Group seats by row (e.g. "A", "B") and sort rows and seat numbers
  const rows = React.useMemo(() => {
    const rowMap = {};
    seats.forEach((seat) => {
      const row = seat.seatRow || 'General';
      if (!rowMap[row]) {
        rowMap[row] = [];
      }
      rowMap[row].push(seat);
    });

    // Sort seats in each row by seatNumber
    Object.keys(rowMap).forEach((row) => {
      rowMap[row].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
    });

    // Sort rows alphabetically
    return Object.keys(rowMap)
      .sort()
      .map((rowName) => ({
        name: rowName,
        seats: rowMap[rowName],
      }));
  }, [seats]);

  const selectedSet = React.useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  const getSeatStyle = (seat) => {
    const isSelected = selectedSet.has(seat.showSeatId);

    if (seat.status === 'BOOKED') {
      return styles.seatBooked;
    }
    if (seat.status === 'LOCKED') {
      return styles.seatLocked;
    }
    if (isSelected) {
      return styles.seatSelected;
    }
    return styles.seatAvailable;
  };

  const getSeatTitle = (seat) => {
    const isSelected = selectedSet.has(seat.showSeatId);
    const prefix = `Row ${seat.seatRow} Seat ${seat.seatNumber} (${seat.seatType || 'REGULAR'}) - ₹${seat.price}`;
    if (seat.status === 'BOOKED') return `${prefix} [BOOKED]`;
    if (seat.status === 'LOCKED') return `${prefix} [LOCKED by another customer]`;
    if (isSelected) return `${prefix} [SELECTED - Click to deselect]`;
    return `${prefix} [AVAILABLE - Click to select]`;
  };

  return (
    <div style={styles.container}>
      {/* Cinema Screen Indicator */}
      <div style={styles.screenArea}>
        <div style={styles.screenCurve}></div>
        <span style={styles.screenLabel}>SCREEN THIS WAY</span>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatAvailable }}></div>
          <span>Available</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatSelected }}></div>
          <span>Selected</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatLocked }}></div>
          <span>Locked</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatBooked }}></div>
          <span>Booked</span>
        </div>
      </div>

      {/* Mobile Scroll Hint */}
      <div style={styles.mobileHint}>
        <span>↔ Scroll horizontally to view all rows and seats</span>
      </div>

      {/* Seat Rows Grid (Scrollable Container) */}
      <div style={styles.gridContainer}>
        {rows.map((row) => (
          <div key={row.name} style={styles.rowWrapper}>
            <span style={styles.rowLabel} aria-hidden="true">{row.name}</span>
            <div style={styles.seatsRow}>
              {row.seats.map((seat) => {
                const isSelected = selectedSet.has(seat.showSeatId);
                const isClickable = seat.status === 'AVAILABLE' && !isLocked;

                return (
                  <button
                    key={seat.showSeatId}
                    type="button"
                    disabled={!isClickable && !isSelected}
                    onClick={() => isClickable && onToggleSeat(seat)}
                    style={{
                      ...styles.seatButton,
                      ...getSeatStyle(seat),
                      cursor: isClickable ? 'pointer' : 'not-allowed',
                    }}
                    title={getSeatTitle(seat)}
                    aria-label={`Row ${seat.seatRow} Seat ${seat.seatNumber}, ${seat.seatType || 'Regular'}, ₹${seat.price}, ${seat.status}`}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
            <span style={styles.rowLabel} aria-hidden="true">{row.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    padding: '16px 0',
  },
  screenArea: {
    width: '85%',
    maxWidth: '540px',
    textAlign: 'center',
    marginBottom: '28px',
  },
  screenCurve: {
    height: '6px',
    background: 'linear-gradient(90deg, transparent 0%, #e50914 50%, transparent 100%)',
    borderRadius: '50%',
    boxShadow: '0 4px 16px rgba(229, 9, 20, 0.5)',
    marginBottom: '8px',
  },
  screenLabel: {
    fontSize: '0.75rem',
    letterSpacing: '3px',
    color: '#888888',
    fontWeight: '700',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#bbbbbb',
  },
  legendBox: {
    width: '18px',
    height: '18px',
    borderRadius: '4px',
  },
  mobileHint: {
    color: '#777777',
    fontSize: '0.78rem',
    marginBottom: '14px',
    textAlign: 'center',
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    overflowX: 'auto',
    padding: '10px 4px 16px 4px',
    WebkitOverflowScrolling: 'touch',
  },
  rowWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'center',
    minWidth: 'max-content',
    margin: '0 auto',
  },
  rowLabel: {
    width: '24px',
    textAlign: 'center',
    color: '#888888',
    fontWeight: '700',
    fontSize: '0.9rem',
    userSelect: 'none',
  },
  seatsRow: {
    display: 'flex',
    gap: '8px',
  },
  seatButton: {
    width: '38px',
    height: '38px',
    padding: 0,
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s, background-color 0.15s',
  },
  seatAvailable: {
    backgroundColor: '#262626',
    border: '1px solid #444444',
    color: '#ffffff',
  },
  seatSelected: {
    backgroundColor: '#2e7d32',
    border: '1px solid #4caf50',
    color: '#ffffff',
    boxShadow: '0 0 8px rgba(76, 175, 80, 0.4)',
    transform: 'scale(1.05)',
  },
  seatLocked: {
    backgroundColor: '#3d2c14',
    border: '1px solid #b26a00',
    color: '#ffa726',
    opacity: 0.85,
  },
  seatBooked: {
    backgroundColor: '#1d1d1d',
    border: '1px solid #2e2e2e',
    color: '#555555',
    textDecoration: 'line-through',
    opacity: 0.6,
  },
};
