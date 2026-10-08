package com.example.ticketbooking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ScreenRequest(
    @NotNull(message = "Venue ID is required")
    UUID venueId,

    @NotBlank(message = "Screen name is required")
    @Size(max = 50, message = "Screen name cannot exceed 50 characters")
    String name,

    @NotNull(message = "Total capacity is required")
    @Positive(message = "Capacity must be positive")
    Integer totalCapacity
) {}
