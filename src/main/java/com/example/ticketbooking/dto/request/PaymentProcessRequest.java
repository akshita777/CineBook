package com.example.ticketbooking.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.UUID;

public record PaymentProcessRequest(
    @NotNull(message = "Booking ID is required")
    UUID bookingId,

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be positive")
    BigDecimal amount,

    String paymentMethod,

    /**
     * Optional test simulation mode:
     * - "SUCCESS": Force successful payment
     * - "FAILURE": Force failed payment
     * - null / empty: Simulates standard deterministic/success flow
     */
    String simulateStatus
) {}
