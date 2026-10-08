package com.example.ticketbooking.controller;

import com.example.ticketbooking.common.ApiResponse;
import com.example.ticketbooking.dto.request.PaymentProcessRequest;
import com.example.ticketbooking.dto.response.BookingResponse;
import com.example.ticketbooking.dto.response.PaymentResponse;
import com.example.ticketbooking.payment.MockPaymentService;
import com.example.ticketbooking.security.SecurityUtils;
import com.example.ticketbooking.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final MockPaymentService mockPaymentService;
    private final BookingService bookingService;
    private final SecurityUtils securityUtils;

    public PaymentController(MockPaymentService mockPaymentService,
                             BookingService bookingService,
                             SecurityUtils securityUtils) {
        this.mockPaymentService = mockPaymentService;
        this.bookingService = bookingService;
        this.securityUtils = securityUtils;
    }

    @PostMapping("/process")
    public ResponseEntity<ApiResponse<PaymentResponse>> processPayment(@Valid @RequestBody PaymentProcessRequest request) {
        BookingResponse booking = bookingService.getBookingById(request.bookingId());
        securityUtils.validateUserAccess(booking.userId(), "process payment for this booking");

        PaymentResponse response = mockPaymentService.processPayment(request);
        return ResponseEntity.ok(ApiResponse.ok("Payment processed successfully", response));
    }
}
