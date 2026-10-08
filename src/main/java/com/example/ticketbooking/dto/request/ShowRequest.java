package com.example.ticketbooking.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ShowRequest(
    @NotNull(message = "Movie ID is required")
    UUID movieId,

    @NotNull(message = "Screen ID is required")
    UUID screenId,

    @NotNull(message = "Start time is required")
    LocalDateTime startTime,

    @NotNull(message = "End time is required")
    LocalDateTime endTime,

    @NotNull(message = "Default seat price is required")
    @Positive(message = "Default seat price must be positive")
    BigDecimal defaultSeatPrice
) {}
