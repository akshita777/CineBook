package com.example.ticketbooking.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record SeatLockRequest(
    @NotNull(message = "User ID is required")
    UUID userId,

    @NotNull(message = "Show ID is required")
    UUID showId,

    @NotEmpty(message = "Seat IDs cannot be empty")
    List<UUID> showSeatIds
) {}
