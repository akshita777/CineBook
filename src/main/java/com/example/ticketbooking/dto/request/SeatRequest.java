package com.example.ticketbooking.dto.request;

import com.example.ticketbooking.entity.enums.SeatType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.UUID;

public record SeatRequest(
    @NotNull(message = "Screen ID is required")
    UUID screenId,

    @NotBlank(message = "Seat row is required")
    String seatRow,

    @NotNull(message = "Seat number is required")
    @Positive(message = "Seat number must be positive")
    Integer seatNumber,

    SeatType seatType
) {}
