package com.example.ticketbooking.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "booking_seats",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_booking_show_seat", columnNames = {"booking_id", "show_seat_id"})
    },
    indexes = {
        @Index(name = "idx_booking_seats_show_seat", columnList = "show_seat_id")
    }
)
public class BookingSeat extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_seat_id", nullable = false)
    private ShowSeat showSeat;

    public BookingSeat() {
    }

    public BookingSeat(Booking booking, ShowSeat showSeat) {
        this.booking = booking;
        this.showSeat = showSeat;
    }

    public Booking getBooking() {
        return booking;
    }

    public void setBooking(Booking booking) {
        this.booking = booking;
    }

    public ShowSeat getShowSeat() {
        return showSeat;
    }

    public void setShowSeat(ShowSeat showSeat) {
        this.showSeat = showSeat;
    }
}
