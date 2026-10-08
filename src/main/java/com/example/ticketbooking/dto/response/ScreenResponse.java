package com.example.ticketbooking.dto.response;

import java.util.UUID;

public record ScreenResponse(
    UUID id,
    UUID venueId,
    String venueName,
    String name,
    Integer totalCapacity
) {}
