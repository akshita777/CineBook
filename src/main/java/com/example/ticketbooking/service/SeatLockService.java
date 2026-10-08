package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.request.SeatLockRequest;
import com.example.ticketbooking.dto.response.SeatLockResponse;
import com.example.ticketbooking.entity.Show;
import com.example.ticketbooking.entity.ShowSeat;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.exception.BadRequestException;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.exception.SeatNotAvailableException;
import com.example.ticketbooking.lock.RedisDistributedSeatLock;
import com.example.ticketbooking.repository.ShowRepository;
import com.example.ticketbooking.repository.ShowSeatRepository;
import com.example.ticketbooking.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SeatLockService {

    private final RedisDistributedSeatLock redisDistributedSeatLock;
    private final ShowSeatRepository showSeatRepository;
    private final ShowRepository showRepository;
    private final UserRepository userRepository;
    private final long lockTtlSeconds;

    public SeatLockService(RedisDistributedSeatLock redisDistributedSeatLock,
                           ShowSeatRepository showSeatRepository,
                           ShowRepository showRepository,
                           UserRepository userRepository,
                           @Value("${ticket.booking.seat-lock-ttl-seconds:300}") long lockTtlSeconds) {
        this.redisDistributedSeatLock = redisDistributedSeatLock;
        this.showSeatRepository = showSeatRepository;
        this.showRepository = showRepository;
        this.userRepository = userRepository;
        this.lockTtlSeconds = lockTtlSeconds;
    }

    @Transactional
    public SeatLockResponse lockSeats(SeatLockRequest request) {
        if (!userRepository.existsById(request.userId())) {
            throw new ResourceNotFoundException("User not found with id: " + request.userId());
        }

        Show show = showRepository.findById(request.showId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with id: " + request.showId()));

        List<UUID> sortedSeatIds = request.showSeatIds().stream().sorted().toList();

        // 1. Layer 1: Attempt Redis distributed lock (fast rejection memory check)
        String lockToken = UUID.randomUUID().toString();
        Duration ttl = Duration.ofSeconds(lockTtlSeconds);

        boolean redisLockAcquired = redisDistributedSeatLock.acquireAll(
                show.getId(),
                sortedSeatIds,
                lockToken,
                ttl
        );

        if (!redisLockAcquired) {
            throw new SeatNotAvailableException("One or more selected seats are currently locked by another customer. Please try again later.");
        }

        // 2. Layer 2: Lock & update PostgreSQL ShowSeat status to LOCKED with locked_until timestamp
        try {
            List<ShowSeat> showSeats = showSeatRepository.findByIdInWithPessimisticWriteLock(sortedSeatIds);
            if (showSeats.size() != sortedSeatIds.size()) {
                throw new BadRequestException("One or more seat IDs are invalid");
            }

            Instant lockExpiration = Instant.now().plus(ttl);
            for (ShowSeat ss : showSeats) {
                if (!ss.getShow().getId().equals(show.getId())) {
                    throw new BadRequestException("Seat does not belong to the specified show");
                }
                if (!ss.isCurrentlyAvailable()) {
                    throw new SeatNotAvailableException("Seat " + ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber() + " is already booked or locked");
                }
                ss.setStatus(SeatStatus.LOCKED);
                ss.setLockedUntil(lockExpiration);
            }
            showSeatRepository.saveAll(showSeats);

            return new SeatLockResponse(lockToken, show.getId(), sortedSeatIds, lockExpiration, lockTtlSeconds);

        } catch (Exception ex) {
            // Rollback Redis locks if DB transaction encounters conflict
            redisDistributedSeatLock.releaseAll(show.getId(), sortedSeatIds, lockToken);
            throw ex;
        }
    }

    @Transactional
    public void unlockSeats(UUID showId, List<UUID> showSeatIds, String lockToken) {
        if (lockToken == null || lockToken.isBlank()) {
            throw new BadRequestException("Lock token is required to unlock seats");
        }

        List<UUID> sortedSeatIds = showSeatIds.stream().sorted().toList();
        List<ShowSeat> showSeats = showSeatRepository.findByIdInWithPessimisticWriteLock(sortedSeatIds);

        for (ShowSeat ss : showSeats) {
            if (!ss.getShow().getId().equals(showId)) {
                throw new BadRequestException("Seat does not belong to the specified show");
            }
            if (ss.getStatus() == SeatStatus.LOCKED) {
                // Verify the caller actually owns the Redis lock for this seat
                boolean ownsLock = redisDistributedSeatLock.isHeldByToken(showId, ss.getId(), lockToken);
                if (ownsLock) {
                    // Release the Redis lock
                    redisDistributedSeatLock.release(showId, ss.getId(), lockToken);
                    // Revert PostgreSQL state to AVAILABLE
                    ss.setStatus(SeatStatus.AVAILABLE);
                    ss.setLockedUntil(null);
                }
            }
        }
        showSeatRepository.saveAll(showSeats);
    }
}
