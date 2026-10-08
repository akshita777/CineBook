package com.example.ticketbooking.entity;

import com.example.ticketbooking.entity.enums.SeatStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
    name = "show_seats",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_show_seat", columnNames = {"show_id", "seat_id"})
    },
    indexes = {
        @Index(name = "idx_show_seats_show_status", columnList = "show_id, status")
    }
)
public class ShowSeat extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SeatStatus status = SeatStatus.AVAILABLE;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    public ShowSeat() {
    }

    public ShowSeat(Show show, Seat seat, BigDecimal price) {
        this.show = show;
        this.seat = seat;
        this.price = price;
        this.status = SeatStatus.AVAILABLE;
    }

    public boolean isCurrentlyAvailable() {
        if (this.status == SeatStatus.AVAILABLE) {
            return true;
        }
        // If seat was locked, but the lock timestamp expired, it is eligible for re-lock
        if (this.status == SeatStatus.LOCKED && this.lockedUntil != null && this.lockedUntil.isBefore(Instant.now())) {
            return true;
        }
        return false;
    }

    public Show getShow() {
        return show;
    }

    public void setShow(Show show) {
        this.show = show;
    }

    public Seat getSeat() {
        return seat;
    }

    public void setSeat(Seat seat) {
        this.seat = seat;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public SeatStatus getStatus() {
        return status;
    }

    public void setStatus(SeatStatus status) {
        this.status = status;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}

