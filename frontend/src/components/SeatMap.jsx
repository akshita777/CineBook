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
        <div style={styles.screenBar}>
          <span style={styles.screenLabel}>▲ SCREEN / FRONT OF HOUSE ▲</span>
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatAvailable }}></div>
          <span>AVAILABLE</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatSelected }}></div>
          <span>SELECTED</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatLocked }}></div>
          <span>LOCKED (HELD)</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendBox, ...styles.seatBooked }}></div>
          <span>BOOKED</span>
        </div>
      </div>

      {/* Mobile Scroll Hint */}
      <div style={styles.mobileHint}>
        <span>[ ↔ SCROLL HORIZONTALLY TO VIEW ALL SEATS ]</span>
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
    padding: '12px 0',
  },
  screenArea: {
    width: '90%',
    maxWidth: '560px',
    textAlign: 'center',
    marginBottom: '28px',
  },
  screenBar: {
    backgroundColor: '#121218',
    borderTop: '3px solid #e50914',
    borderBottom: '1px solid #282834',
    borderLeft: '1px solid #282834',
    borderRight: '1px solid #282834',
    borderRadius: '2px',
    boxShadow: '0 4px 18px rgba(229, 9, 20, 0.25)',
    padding: '8px 16px',
  },
  screenLabel: {
    fontSize: '0.72rem',
    letterSpacing: '2.5px',
    color: '#a0a0b2',
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '18px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.75rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    color: '#a0a0b2',
  },
  legendBox: {
    width: '18px',
    height: '18px',
    borderRadius: '2px',
  },
  mobileHint: {
    color: '#656578',
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '14px',
    textAlign: 'center',
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    overflowX: 'auto',
    padding: '10px 4px 16px 4px',
    WebkitOverflowScrolling: 'touch',
  },
  rowWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: 'center',
    minWidth: 'max-content',
    margin: '0 auto',
  },
  rowLabel: {
    width: '26px',
    textAlign: 'center',
    color: '#808094',
    fontWeight: '900',
    fontFamily: 'monospace',
    fontSize: '0.88rem',
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
    borderRadius: '2px',
    fontSize: '0.82rem',
    fontWeight: '800',
    fontFamily: 'monospace',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease',
  },
  seatAvailable: {
    backgroundColor: '#16161e',
    border: '2px solid #2e2e3e',
    color: '#e2e2ec',
    boxShadow: '1px 1px 0px #000000',
  },
  seatSelected: {
    backgroundColor: '#16a34a',
    border: '2px solid #22c55e',
    color: '#ffffff',
    boxShadow: '2px 2px 0px #000000',
    transform: 'scale(1.04)',
  },
  seatLocked: {
    backgroundColor: '#2e1c03',
    border: '2px solid #d97706',
    color: '#fbbf24',
    opacity: 0.9,
  },
  seatBooked: {
    backgroundColor: '#0f0f13',
    border: '2px solid #1a1a22',
    color: '#454552',
    textDecoration: 'line-through',
    opacity: 0.65,
  },
};
