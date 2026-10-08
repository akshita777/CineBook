package com.example.ticketbooking.dto.response;

import java.time.Instant;
import java.util.UUID;

public record MovieResponse(
    UUID id,
    String title,
    String description,
    Integer durationMinutes,
    String genre,
    String language,
    Instant createdAt
) {}
