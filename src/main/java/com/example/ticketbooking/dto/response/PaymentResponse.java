package com.example.ticketbooking.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponse(
    UUID paymentId,
    UUID bookingId,
    BigDecimal amount,
    String status, // SUCCESS, FAILED
    String transactionReference,
    String message,
    Instant processedAt
) {}
