package com.example.ticketbooking.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VenueRequest(
    @NotBlank(message = "Venue name is required")
    @Size(max = 100, message = "Venue name cannot exceed 100 characters")
    String name,

    @NotBlank(message = "City is required")
    @Size(max = 50, message = "City cannot exceed 50 characters")
    String city,

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    String address
) {}
