package com.example.ticketbooking.dto.response;

import com.example.ticketbooking.entity.enums.BookingStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record BookingResponse(
    UUID id,
    UUID userId,
    UUID showId,
    String movieTitle,
    String screenName,
    String venueName,
    LocalDateTime showStartTime,
    List<String> bookedSeats,
    BigDecimal totalAmount,
    BookingStatus status,
    Instant createdAt,
    Instant expiresAt
) {}
