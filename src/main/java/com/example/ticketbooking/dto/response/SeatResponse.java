package com.example.ticketbooking.dto.response;

import com.example.ticketbooking.entity.enums.SeatType;
import java.util.UUID;

public record SeatResponse(
    UUID id,
    UUID screenId,
    String seatRow,
    Integer seatNumber,
    SeatType seatType
) {}
