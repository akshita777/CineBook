package com.example.ticketbooking.controller;

import com.example.ticketbooking.common.ApiResponse;
import com.example.ticketbooking.dto.request.SeatLockRequest;
import com.example.ticketbooking.dto.response.SeatLockResponse;
import com.example.ticketbooking.exception.UnauthorizedException;
import com.example.ticketbooking.security.SecurityUtils;
import com.example.ticketbooking.service.SeatLockService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/seat-locks")
public class SeatLockController {

    private final SeatLockService seatLockService;
    private final SecurityUtils securityUtils;

    public SeatLockController(SeatLockService seatLockService, SecurityUtils securityUtils) {
        this.seatLockService = seatLockService;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SeatLockResponse>> lockSeats(@Valid @RequestBody SeatLockRequest request) {
        UUID currentUserId = securityUtils.getCurrentUserId();
        if (request.userId() != null && !request.userId().equals(currentUserId) && !securityUtils.isAdmin()) {
            throw new UnauthorizedException("You are not authorized to lock seats for another user");
        }

        // Derive user identity from authenticated security context
        SeatLockRequest effectiveRequest = new SeatLockRequest(
                currentUserId,
                request.showId(),
                request.showSeatIds()
        );

        SeatLockResponse response = seatLockService.lockSeats(effectiveRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Seats temporarily locked for 5 minutes", response));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> unlockSeats(
            @RequestParam UUID showId,
            @RequestParam List<UUID> seatIds,
            @RequestParam String lockToken) {
        seatLockService.unlockSeats(showId, seatIds, lockToken);
        return ResponseEntity.ok(ApiResponse.ok("Seat lock released successfully", null));
    }
}
