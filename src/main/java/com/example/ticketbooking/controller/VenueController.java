package com.example.ticketbooking.controller;

import com.example.ticketbooking.common.ApiResponse;
import com.example.ticketbooking.dto.request.ScreenRequest;
import com.example.ticketbooking.dto.request.SeatRequest;
import com.example.ticketbooking.dto.request.VenueRequest;
import com.example.ticketbooking.dto.response.ScreenResponse;
import com.example.ticketbooking.dto.response.SeatResponse;
import com.example.ticketbooking.dto.response.VenueResponse;
import com.example.ticketbooking.service.VenueService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/venues")
public class VenueController {

    private final VenueService venueService;

    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<VenueResponse>>> getAllVenues() {
        return ResponseEntity.ok(ApiResponse.ok(venueService.getAllVenues()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VenueResponse>> getVenueById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(venueService.getVenueById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VenueResponse>> createVenue(@Valid @RequestBody VenueRequest request) {
        VenueResponse created = venueService.createVenue(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Venue created successfully", created));
    }

    @GetMapping("/{venueId}/screens")
    public ResponseEntity<ApiResponse<List<ScreenResponse>>> getScreensByVenue(@PathVariable UUID venueId) {
        return ResponseEntity.ok(ApiResponse.ok(venueService.getScreensByVenue(venueId)));
    }

    @PostMapping("/screens")
    public ResponseEntity<ApiResponse<ScreenResponse>> addScreen(@Valid @RequestBody ScreenRequest request) {
        ScreenResponse screen = venueService.addScreenToVenue(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Screen added successfully", screen));
    }

    @GetMapping("/screens/{screenId}/seats")
    public ResponseEntity<ApiResponse<List<SeatResponse>>> getSeatsByScreen(@PathVariable UUID screenId) {
        return ResponseEntity.ok(ApiResponse.ok(venueService.getSeatsByScreen(screenId)));
    }

    @PostMapping("/screens/seats")
    public ResponseEntity<ApiResponse<SeatResponse>> addSeat(@Valid @RequestBody SeatRequest request) {
        SeatResponse seat = venueService.addSeatToScreen(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Seat added successfully", seat));
    }
}
