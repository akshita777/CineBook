package com.example.ticketbooking.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BookingConfirmedEvent(
    UUID eventId,
    UUID bookingId,
    UUID userId,
    String userEmail,
    String userName,
    UUID showId,
    String movieTitle,
    String screenName,
    String venueName,
    List<String> seats,
    BigDecimal totalAmount,
    String transactionReference,
    Instant timestamp
) {}
