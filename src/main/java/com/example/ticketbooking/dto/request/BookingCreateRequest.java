package com.example.ticketbooking.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record BookingCreateRequest(
    @NotNull(message = "User ID is required")
    UUID userId,

    @NotNull(message = "Show ID is required")
    UUID showId,

    @NotEmpty(message = "At least one show seat must be selected")
    List<UUID> showSeatIds,

    String lockToken
) {
    public BookingCreateRequest(UUID userId, UUID showId, List<UUID> showSeatIds) {
        this(userId, showId, showSeatIds, null);
    }
}
