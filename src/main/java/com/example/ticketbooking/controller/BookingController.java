package com.example.ticketbooking.controller;

import com.example.ticketbooking.common.ApiResponse;
import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.dto.response.BookingResponse;
import com.example.ticketbooking.exception.UnauthorizedException;
import com.example.ticketbooking.security.SecurityUtils;
import com.example.ticketbooking.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final SecurityUtils securityUtils;

    public BookingController(BookingService bookingService, SecurityUtils securityUtils) {
        this.bookingService = bookingService;
        this.securityUtils = securityUtils;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(@Valid @RequestBody BookingCreateRequest request) {
        UUID currentUserId = securityUtils.getCurrentUserId();
        if (request.userId() != null && !request.userId().equals(currentUserId) && !securityUtils.isAdmin()) {
            throw new UnauthorizedException("You are not authorized to create a booking for another user");
        }

        // Derive user identity from authenticated security context
        BookingCreateRequest effectiveRequest = new BookingCreateRequest(
                currentUserId,
                request.showId(),
                request.showSeatIds(),
                request.lockToken()
        );

        BookingResponse booking = bookingService.createBooking(effectiveRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Booking confirmed successfully", booking));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(@PathVariable UUID id) {
        BookingResponse booking = bookingService.getBookingById(id);
        securityUtils.validateUserAccess(booking.userId(), "view this booking");
        return ResponseEntity.ok(ApiResponse.ok(booking));
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings() {
        UUID currentUserId = securityUtils.getCurrentUserId();
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getUserBookings(currentUserId)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getUserBookings(@PathVariable UUID userId) {
        securityUtils.validateUserAccess(userId, "view bookings for this user");
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getUserBookings(userId)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(@PathVariable UUID id) {
        BookingResponse booking = bookingService.getBookingById(id);
        securityUtils.validateUserAccess(booking.userId(), "cancel this booking");
        BookingResponse cancelled = bookingService.cancelBooking(id);
        return ResponseEntity.ok(ApiResponse.ok("Booking cancelled successfully", cancelled));
    }
}
