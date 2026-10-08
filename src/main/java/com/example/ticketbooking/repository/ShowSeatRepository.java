package com.example.ticketbooking.repository;

import com.example.ticketbooking.entity.ShowSeat;
import com.example.ticketbooking.entity.enums.SeatStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShowSeatRepository extends JpaRepository<ShowSeat, UUID> {

    @Query("SELECT ss FROM ShowSeat ss " +
           "JOIN FETCH ss.seat s " +
           "WHERE ss.show.id = :showId " +
           "ORDER BY s.seatRow ASC, s.seatNumber ASC")
    List<ShowSeat> findByShowIdWithSeatDetails(@Param("showId") UUID showId);

    @Query("SELECT ss FROM ShowSeat ss " +
           "WHERE ss.show.id = :showId AND ss.status = :status")
    List<ShowSeat> findByShowIdAndStatus(@Param("showId") UUID showId, @Param("status") SeatStatus status);

    @Query("SELECT ss FROM ShowSeat ss " +
           "WHERE ss.show.id = :showId AND ss.seat.id IN :seatIds")
    List<ShowSeat> findByShowIdAndSeatIdIn(@Param("showId") UUID showId, @Param("seatIds") List<UUID> seatIds);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ss FROM ShowSeat ss " +
           "JOIN FETCH ss.seat " +
           "WHERE ss.id IN :showSeatIds " +
           "ORDER BY ss.id ASC")
    List<ShowSeat> findByIdInWithPessimisticWriteLock(@Param("showSeatIds") List<UUID> showSeatIds);

    Optional<ShowSeat> findByShowIdAndSeatId(UUID showId, UUID seatId);
}
