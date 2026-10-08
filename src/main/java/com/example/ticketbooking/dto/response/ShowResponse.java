package com.example.ticketbooking.dto.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record ShowResponse(
    UUID id,
    UUID movieId,
    String movieTitle,
    UUID screenId,
    String screenName,
    String venueName,
    LocalDateTime startTime,
    LocalDateTime endTime
) {}
