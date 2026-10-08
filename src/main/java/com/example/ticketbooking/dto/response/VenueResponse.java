package com.example.ticketbooking.dto.response;

import java.util.UUID;

public record VenueResponse(
    UUID id,
    String name,
    String city,
    String address
) {}
