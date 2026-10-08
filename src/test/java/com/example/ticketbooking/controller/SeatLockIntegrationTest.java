package com.example.ticketbooking.controller;

import com.example.ticketbooking.config.TestKafkaConfiguration;
import com.example.ticketbooking.config.TestRedisConfiguration;
import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.dto.request.SeatLockRequest;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.lock.RedisDistributedSeatLock;
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
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestRedisConfiguration.class, TestKafkaConfiguration.class})
class SeatLockIntegrationTest {

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
    private RedisDistributedSeatLock redisDistributedSeatLock;

    @Autowired
    private com.example.ticketbooking.security.JwtTokenProvider jwtTokenProvider;

    private User user1;
    private User user2;
    private String tokenUser1;
    private String tokenUser2;
    private Show show;
    private ShowSeat showSeat1;
    private ShowSeat showSeat2;

    @BeforeEach
    void setUp() {
        TestRedisConfiguration.clear();
        bookingSeatRepository.deleteAll();
        bookingRepository.deleteAll();
        showSeatRepository.deleteAll();
        showRepository.deleteAll();
        seatRepository.deleteAll();
        screenRepository.deleteAll();
        venueRepository.deleteAll();
        movieRepository.deleteAll();
        userRepository.deleteAll();

        user1 = userRepository.save(new User("lock_u1@example.com", "pass", "User One", "1111111111"));
        user2 = userRepository.save(new User("lock_u2@example.com", "pass", "User Two", "2222222222"));

        tokenUser1 = "Bearer " + jwtTokenProvider.generateToken(user1.getId(), user1.getEmail(), List.of("ROLE_USER"));
        tokenUser2 = "Bearer " + jwtTokenProvider.generateToken(user2.getId(), user2.getEmail(), List.of("ROLE_USER"));

        Movie movie = movieRepository.save(new Movie("Dune", "Sci-Fi", 155, "Adventure", "English"));
        Venue venue = venueRepository.save(new Venue("Cinepolis", "Pune", "Kalyani Nagar"));
        Screen screen = screenRepository.save(new Screen(venue, "Screen 1", 50));
        Seat seat1 = seatRepository.save(new Seat(screen, "C", 5, SeatType.VIP));
        Seat seat2 = seatRepository.save(new Seat(screen, "C", 6, SeatType.VIP));

        show = showRepository.save(new Show(movie, screen, LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(3)));
        showSeat1 = showSeatRepository.save(new ShowSeat(show, seat1, new BigDecimal("350.00")));
        showSeat2 = showSeatRepository.save(new ShowSeat(show, seat2, new BigDecimal("350.00")));
    }

    private String lockSeatAsUser1(UUID seatId) throws Exception {
        SeatLockRequest lockReq = new SeatLockRequest(user1.getId(), show.getId(), List.of(seatId));
        MvcResult res = mockMvc.perform(post("/api/seat-locks")
                        .header("Authorization", tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.lockToken").isNotEmpty())
                .andReturn();
        JsonNode node = objectMapper.readTree(res.getResponse().getContentAsString());
        return node.get("data").get("lockToken").asText();
    }

    @Test
    @DisplayName("Case 1: Active LOCKED seat + booking without token -> rejected with 409 Conflict")
    void testActiveLockedSeatBookingWithoutTokenRejected() throws Exception {
        lockSeatAsUser1(showSeat1.getId());

        BookingCreateRequest requestWithoutToken = new BookingCreateRequest(
                user1.getId(),
                show.getId(),
                List.of(showSeat1.getId()),
                null // No token provided!
        );

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestWithoutToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Case 2: Active LOCKED seat + wrong token -> rejected with 409 Conflict")
    void testActiveLockedSeatBookingWithWrongTokenRejected() throws Exception {
        lockSeatAsUser1(showSeat1.getId());

        String fakeWrongToken = UUID.randomUUID().toString();
        BookingCreateRequest requestWithWrongToken = new BookingCreateRequest(
                user1.getId(),
                show.getId(),
                List.of(showSeat1.getId()),
                fakeWrongToken // Wrong token!
        );

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestWithWrongToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Case 3: Active LOCKED seat + correct token -> succeeds and seat becomes BOOKED")
    void testActiveLockedSeatBookingWithCorrectTokenSucceeds() throws Exception {
        String correctToken = lockSeatAsUser1(showSeat1.getId());

        BookingCreateRequest validBooking = new BookingCreateRequest(
                user1.getId(),
                show.getId(),
                List.of(showSeat1.getId()),
                correctToken
        );

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", tokenUser1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validBooking)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        ShowSeat bookedSeat = showSeatRepository.findById(showSeat1.getId()).orElseThrow();
        assertThat(bookedSeat.getStatus()).isEqualTo(SeatStatus.BOOKED);
    }

    @Test
    @DisplayName("Case 4: Expired DB lock -> can be re-locked / booked")
    void testExpiredDbLockCanBeRelockedAndBooked() throws Exception {
        // Seat was previously locked in DB but timestamp is now expired
        showSeat1.setStatus(SeatStatus.LOCKED);
        showSeat1.setLockedUntil(Instant.now().minusSeconds(15));
        showSeatRepository.save(showSeat1);

        // User 2 should be able to lock this seat now
        SeatLockRequest lockReq = new SeatLockRequest(user2.getId(), show.getId(), List.of(showSeat1.getId()));
        MvcResult res = mockMvc.perform(post("/api/seat-locks")
                        .header("Authorization", tokenUser2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        String token = objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("lockToken").asText();

        // User 2 confirms booking
        BookingCreateRequest bookingReq = new BookingCreateRequest(user2.getId(), show.getId(), List.of(showSeat1.getId()), token);
        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", tokenUser2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        ShowSeat bookedSeat = showSeatRepository.findById(showSeat1.getId()).orElseThrow();
        assertThat(bookedSeat.getStatus()).isEqualTo(SeatStatus.BOOKED);
    }

    @Test
    @DisplayName("Case 5: User B cannot unlock User A's seat with User B's token")
    void testUserBCannotUnlockUserASeatWithDifferentToken() throws Exception {
        String tokenUserA = lockSeatAsUser1(showSeat1.getId());
        String tokenUserB = UUID.randomUUID().toString();

        // User B attempts to unlock showSeat1 using tokenUserB
        mockMvc.perform(delete("/api/seat-locks")
                        .header("Authorization", tokenUser2)
                        .param("showId", show.getId().toString())
                        .param("seatIds", showSeat1.getId().toString())
                        .param("lockToken", tokenUserB))
                .andExpect(status().isOk());

        // Verify showSeat1 in DB is STILL LOCKED because User B didn't own the lock
        ShowSeat seatAfterAttempt = showSeatRepository.findById(showSeat1.getId()).orElseThrow();
        assertThat(seatAfterAttempt.getStatus()).isEqualTo(SeatStatus.LOCKED);
        assertThat(redisDistributedSeatLock.isHeldByToken(show.getId(), showSeat1.getId(), tokenUserA)).isTrue();

        // User A unlocks with correct token -> now it must become AVAILABLE
        mockMvc.perform(delete("/api/seat-locks")
                        .header("Authorization", tokenUser1)
                        .param("showId", show.getId().toString())
                        .param("seatIds", showSeat1.getId().toString())
                        .param("lockToken", tokenUserA))
                .andExpect(status().isOk());

        ShowSeat seatAfterUserA = showSeatRepository.findById(showSeat1.getId()).orElseThrow();
        assertThat(seatAfterUserA.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
    }

    @Test
    @DisplayName("Case 6: Multi-seat lock where one seat fails -> no Redis or DB partial reservation remains")
    void testMultiSeatLockAtomicityWhenOneSeatFails() throws Exception {
        // User 1 locks seat 1
        String tokenUserA = lockSeatAsUser1(showSeat1.getId());

        // User 2 attempts to lock BOTH [seat 1, seat 2] in a single batch
        SeatLockRequest multiSeatReq = new SeatLockRequest(user2.getId(), show.getId(), List.of(showSeat1.getId(), showSeat2.getId()));

        mockMvc.perform(post("/api/seat-locks")
                        .header("Authorization", tokenUser2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(multiSeatReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        // Invariant verification:
        // Seat 2 MUST NOT be locked in Redis or DB (it must remain completely AVAILABLE)
        ShowSeat seat2InDb = showSeatRepository.findById(showSeat2.getId()).orElseThrow();
        assertThat(seat2InDb.getStatus())
                .as("Seat 2 must remain AVAILABLE in DB because the batch failed")
                .isEqualTo(SeatStatus.AVAILABLE);

        // Seat 1 must still belong to User 1
        assertThat(redisDistributedSeatLock.isHeldByToken(show.getId(), showSeat1.getId(), tokenUserA)).isTrue();
    }
}
