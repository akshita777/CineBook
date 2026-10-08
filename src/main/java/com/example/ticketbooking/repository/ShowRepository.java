package com.example.ticketbooking.repository;

import com.example.ticketbooking.entity.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ShowRepository extends JpaRepository<Show, UUID> {
    List<Show> findByMovieId(UUID movieId);
    List<Show> findByMovieIdAndStartTimeBetween(UUID movieId, LocalDateTime start, LocalDateTime end);
}
