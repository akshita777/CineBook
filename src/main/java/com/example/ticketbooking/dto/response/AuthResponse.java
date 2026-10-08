package com.example.ticketbooking.dto.response;

import java.util.Set;
import java.util.UUID;

public record AuthResponse(
    String token,
    String tokenType,
    UUID userId,
    String email,
    String fullName,
    Set<String> roles
) {
    public static AuthResponse of(String token, UUID userId, String email, String fullName, Set<String> roles) {
        return new AuthResponse(token, "Bearer", userId, email, fullName, roles);
    }
}
