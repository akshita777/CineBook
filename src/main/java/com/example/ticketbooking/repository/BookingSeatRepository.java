package com.example.ticketbooking.repository;

import com.example.ticketbooking.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
    List<BookingSeat> findByBookingId(UUID bookingId);

    @org.springframework.data.jpa.repository.Query("SELECT bs FROM BookingSeat bs " +
           "JOIN FETCH bs.showSeat ss " +
           "JOIN FETCH ss.seat " +
           "WHERE bs.booking.id = :bookingId")
    List<BookingSeat> findByBookingIdWithShowSeat(@org.springframework.data.repository.query.Param("bookingId") UUID bookingId);
}
