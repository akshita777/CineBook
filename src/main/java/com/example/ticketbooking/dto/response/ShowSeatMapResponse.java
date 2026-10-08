package com.example.ticketbooking.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ShowSeatMapResponse(
    UUID showId,
    String movieTitle,
    String screenName,
    String venueName,
    LocalDateTime startTime,
    int totalSeats,
    int availableSeats,
    List<ShowSeatResponse> seats
) {}
