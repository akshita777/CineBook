package com.example.ticketbooking.controller;

import com.example.ticketbooking.config.TestKafkaConfiguration;
import com.example.ticketbooking.config.TestRedisConfiguration;
import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.dto.request.PaymentProcessRequest;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.BookingStatus;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestRedisConfiguration.class, TestKafkaConfiguration.class})
class MockPaymentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MovieRepository movieRepository;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private ScreenRepository screenRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private ShowSeatRepository showSeatRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingSeatRepository bookingSeatRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private com.example.ticketbooking.security.JwtTokenProvider jwtTokenProvider;

    private User user;
    private String token;
    private Show show;
    private ShowSeat showSeat;

    @BeforeEach
    void setUp() {
        paymentRepository.deleteAll();
        bookingSeatRepository.deleteAll();
        bookingRepository.deleteAll();
        showSeatRepository.deleteAll();
        showRepository.deleteAll();
        seatRepository.deleteAll();
        screenRepository.deleteAll();
        venueRepository.deleteAll();
        movieRepository.deleteAll();
        userRepository.deleteAll();

        user = userRepository.save(new User("pay_user@example.com", "pass", "Pay User", "9876543210"));
        token = "Bearer " + jwtTokenProvider.generateToken(user.getId(), user.getEmail(), List.of("ROLE_USER"));

        Movie movie = movieRepository.save(new Movie("Gladiator II", "Epic history", 148, "Action", "English"));
        Venue venue = venueRepository.save(new Venue("PVR Icon", "Delhi", "Saket"));
        Screen screen = screenRepository.save(new Screen(venue, "Gold Screen", 40));
        Seat seat = seatRepository.save(new Seat(screen, "G", 1, SeatType.VIP));

        show = showRepository.save(new Show(movie, screen, LocalDateTime.now().plusDays(2), LocalDateTime.now().plusDays(2).plusHours(3)));
        showSeat = showSeatRepository.save(new ShowSeat(show, seat, new BigDecimal("500.00")));
    }

    private Booking createPendingBooking() {
        showSeat.setStatus(SeatStatus.LOCKED);
        showSeat.setLockedUntil(java.time.Instant.now().plusSeconds(300));
        showSeatRepository.save(showSeat);

        Booking booking = new Booking(user, show, new BigDecimal("500.00"), java.time.Instant.now().plusSeconds(300));
        booking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(booking);

        BookingSeat bookingSeat = new BookingSeat(saved, showSeat);
        bookingSeatRepository.save(bookingSeat);

        return saved;
    }

    @Test
    @DisplayName("Payment Success: Confirms booking, transitions ShowSeat to BOOKED, and saves Payment record")
    void testSuccessfulPaymentFlow() throws Exception {
        Booking pendingBooking = createPendingBooking();

        PaymentProcessRequest paymentRequest = new PaymentProcessRequest(
                pendingBooking.getId(),
                new BigDecimal("500.00"),
                "CREDIT_CARD",
                "SUCCESS"
        );

        mockMvc.perform(post("/api/payments/process")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"))
                .andExpect(jsonPath("$.data.transactionReference").isNotEmpty());

        // Verify Database State
        Booking updatedBooking = bookingRepository.findById(pendingBooking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);

        ShowSeat updatedSeat = showSeatRepository.findById(showSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(SeatStatus.BOOKED);
        assertThat(updatedSeat.getLockedUntil()).isNull();

        List<Payment> payments = paymentRepository.findAll();
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("Payment Failure: Cancels booking, releases ShowSeat back to AVAILABLE, and marks Payment as FAILED")
    void testFailedPaymentRollsBackSeatsToAvailable() throws Exception {
        Booking pendingBooking = createPendingBooking();

        PaymentProcessRequest paymentRequest = new PaymentProcessRequest(
                pendingBooking.getId(),
                new BigDecimal("500.00"),
                "UPI",
                "FAILURE" // Force failure simulation
        );

        mockMvc.perform(post("/api/payments/process")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentRequest)))
                .andExpect(status().isPaymentRequired())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Payment failed")));

        // Verify Database State
        Booking updatedBooking = bookingRepository.findById(pendingBooking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.CANCELLED);

        // Crucial Check: Seat must be released back to AVAILABLE so others can book it!
        ShowSeat updatedSeat = showSeatRepository.findById(showSeat.getId()).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
        assertThat(updatedSeat.getLockedUntil()).isNull();
        assertThat(updatedSeat.isCurrentlyAvailable()).isTrue();

        List<Payment> payments = paymentRepository.findAll();
        assertThat(payments).hasSize(1);
        assertThat(payments.get(0).getStatus()).isEqualTo("FAILED");
    }

    @Test
    @DisplayName("Payment Validation: Reject payment if amount does not match booking total")
    void testPaymentAmountMismatchRejected() throws Exception {
        Booking pendingBooking = createPendingBooking();

        PaymentProcessRequest paymentRequest = new PaymentProcessRequest(
                pendingBooking.getId(),
                new BigDecimal("100.00"), // Mismatched amount (booking is 500.00)
                "DEBIT_CARD",
                "SUCCESS"
        );

        mockMvc.perform(post("/api/payments/process")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("does not match booking total")));
    }
}
