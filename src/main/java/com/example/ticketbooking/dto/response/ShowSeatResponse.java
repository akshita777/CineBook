package com.example.ticketbooking.dto.response;

import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.entity.enums.SeatType;
import java.math.BigDecimal;
import java.util.UUID;

public record ShowSeatResponse(
    UUID showSeatId,
    UUID seatId,
    String seatRow,
    Integer seatNumber,
    SeatType seatType,
    BigDecimal price,
    SeatStatus status
) {}
