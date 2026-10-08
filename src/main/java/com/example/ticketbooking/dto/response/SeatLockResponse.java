package com.example.ticketbooking.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SeatLockResponse(
    String lockToken,
    UUID showId,
    List<UUID> lockedSeatIds,
    Instant expiresAt,
    long ttlSeconds
) {}
