package com.example.ticketbooking.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
    name = "screens",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_venue_screen_name", columnNames = {"venue_id", "name"})
    }
)
public class Screen extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "total_capacity", nullable = false)
    private Integer totalCapacity;

    @OneToMany(mappedBy = "screen", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Seat> seats = new ArrayList<>();

    public Screen() {
    }

    public Screen(Venue venue, String name, Integer totalCapacity) {
        this.venue = venue;
        this.name = name;
        this.totalCapacity = totalCapacity;
    }

    public void addSeat(Seat seat) {
        seats.add(seat);
        seat.setScreen(this);
    }

    public Venue getVenue() {
        return venue;
    }

    public void setVenue(Venue venue) {
        this.venue = venue;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getTotalCapacity() {
        return totalCapacity;
    }

    public void setTotalCapacity(Integer totalCapacity) {
        this.totalCapacity = totalCapacity;
    }

    public List<Seat> getSeats() {
        return seats;
    }

    public void setSeats(List<Seat> seats) {
        this.seats = seats;
    }
}
