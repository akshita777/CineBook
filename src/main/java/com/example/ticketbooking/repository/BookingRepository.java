package com.example.ticketbooking.repository;

import com.example.ticketbooking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Booking> findByShowId(UUID showId);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Booking b " +
           "JOIN FETCH b.user " +
           "JOIN FETCH b.show s " +
           "JOIN FETCH s.movie " +
           "JOIN FETCH s.screen sc " +
           "JOIN FETCH sc.venue " +
           "WHERE b.id = :id")
    java.util.Optional<Booking> findByIdWithUserAndShow(@org.springframework.data.repository.query.Param("id") UUID id);
}
