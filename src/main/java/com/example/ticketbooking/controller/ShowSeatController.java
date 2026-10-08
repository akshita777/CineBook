package com.example.ticketbooking.controller;

import com.example.ticketbooking.common.ApiResponse;
import com.example.ticketbooking.dto.response.ShowSeatMapResponse;
import com.example.ticketbooking.service.ShowSeatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/shows")
public class ShowSeatController {

    private final ShowSeatService showSeatService;

    public ShowSeatController(ShowSeatService showSeatService) {
        this.showSeatService = showSeatService;
    }

    @GetMapping("/{showId}/seats")
    public ResponseEntity<ApiResponse<ShowSeatMapResponse>> getSeatMapForShow(@PathVariable UUID showId) {
        ShowSeatMapResponse seatMap = showSeatService.getSeatMapForShow(showId);
        return ResponseEntity.ok(ApiResponse.ok(seatMap));
    }
}
