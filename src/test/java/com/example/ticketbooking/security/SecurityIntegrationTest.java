package com.example.ticketbooking.security;

import com.example.ticketbooking.config.TestKafkaConfiguration;
import com.example.ticketbooking.config.TestRedisConfiguration;
import com.example.ticketbooking.dto.request.*;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.BookingStatus;
import com.example.ticketbooking.entity.enums.RoleType;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
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
class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

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

    private User userA;
    private User userB;
    private User adminUser;
    private String tokenUserA;
    private String tokenUserB;
    private String tokenAdmin;
    private Show show;
    private ShowSeat showSeat1;
    private Booking userABooking;

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

        // 1. Setup User A
        userA = new User("usera@example.com", passwordEncoder.encode("PasswordA123!"), "User A", "1111111111");
        userA = userRepository.save(userA);
        tokenUserA = "Bearer " + jwtTokenProvider.generateToken(userA.getId(), userA.getEmail(), List.of("ROLE_USER"));

        // 2. Setup User B
        userB = new User("userb@example.com", passwordEncoder.encode("PasswordB123!"), "User B", "2222222222");
        userB = userRepository.save(userB);
        tokenUserB = "Bearer " + jwtTokenProvider.generateToken(userB.getId(), userB.getEmail(), List.of("ROLE_USER"));

        // 3. Setup Admin User
        adminUser = new User("admin@example.com", passwordEncoder.encode("AdminPass123!"), "System Admin", "9999999999");
        adminUser.getRoles().add(RoleType.ROLE_ADMIN);
        adminUser = userRepository.save(adminUser);
        tokenAdmin = "Bearer " + jwtTokenProvider.generateToken(adminUser.getId(), adminUser.getEmail(), List.of("ROLE_ADMIN", "ROLE_USER"));

        // 4. Setup Catalog & Show
        Movie movie = movieRepository.save(new Movie("Inception", "Mind-bending thriller", 148, "Sci-Fi", "English"));
        Venue venue = venueRepository.save(new Venue("IMAX Wadala", "Mumbai", "Wadala"));
        Screen screen = screenRepository.save(new Screen(venue, "IMAX Screen", 60));
        Seat seat1 = seatRepository.save(new Seat(screen, "A", 1, SeatType.REGULAR));
        show = showRepository.save(new Show(movie, screen, LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(3)));
        showSeat1 = showSeatRepository.save(new ShowSeat(show, seat1, new BigDecimal("400.00")));

        // 5. Setup User A's confirmed booking
        userABooking = new Booking(userA, show, new BigDecimal("400.00"), null);
        userABooking.setStatus(BookingStatus.CONFIRMED);
        userABooking = bookingRepository.save(userABooking);
        bookingSeatRepository.save(new BookingSeat(userABooking, showSeat1));
    }

    // ==========================================
    // 1. Authentication: Registration & Password Hashing
    // ==========================================

    @Test
    @DisplayName("Registration: Hashes password with BCrypt and returns JWT token")
    void testRegistrationSuccessAndHashedPassword() throws Exception {
        RegisterRequest registerReq = new RegisterRequest(
                "newuser@example.com",
                "PlainPassword123!",
                "New User",
                "9876543210"
        );

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.email").value("newuser@example.com"))
                .andReturn();

        // Verify password is NOT stored as plaintext in database
        User savedUser = userRepository.findByEmail("newuser@example.com").orElseThrow();
        assertThat(savedUser.getPassword()).isNotEqualTo("PlainPassword123!");
        assertThat(passwordEncoder.matches("PlainPassword123!", savedUser.getPassword())).isTrue();
    }

    @Test
    @DisplayName("Registration: Rejects duplicate email with 409 Conflict")
    void testRegistrationDuplicateEmailRejected() throws Exception {
        RegisterRequest duplicateReq = new RegisterRequest(
                "usera@example.com",
                "AnotherPassword123!",
                "Duplicate User",
                "1234567890"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==========================================
    // 2. Authentication: Login
    // ==========================================

    @Test
    @DisplayName("Login: Valid credentials authenticate and return JWT token")
    void testLoginSuccess() throws Exception {
        LoginRequest loginReq = new LoginRequest("usera@example.com", "PasswordA123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.email").value("usera@example.com"));
    }

    @Test
    @DisplayName("Login: Invalid password rejected with 400 Bad Request")
    void testLoginInvalidPasswordRejected() throws Exception {
        LoginRequest loginReq = new LoginRequest("usera@example.com", "WrongPassword!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==========================================
    // 3. Unauthorized Access & Token Validation
    // ==========================================

    @Test
    @DisplayName("Unauthenticated: Requests without JWT return 401 Unauthorized")
    void testUnauthenticatedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/bookings/my-bookings"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));

        SeatLockRequest lockReq = new SeatLockRequest(userA.getId(), show.getId(), List.of(showSeat1.getId()));
        mockMvc.perform(post("/api/seat-locks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isUnauthorized());

        BookingCreateRequest bookingReq = new BookingCreateRequest(userA.getId(), show.getId(), List.of(showSeat1.getId()));
        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Invalid Token: Malformed or tampered token returns 401 Unauthorized")
    void testMalformedTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/bookings/my-bookings")
                        .header("Authorization", "Bearer invalid.jwt.signature.here"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Expired Token: Expired JWT returns 401 Unauthorized")
    void testExpiredTokenReturns401() throws Exception {
        // Build expired token using provider's signing key with past expiration
        JwtTokenProvider shortLivedProvider = new JwtTokenProvider(
                "ticketBookingSystemSecureJwtSecretKeyMustBeAtLeast256BitsLong2026",
                -1000 // Expired 1 second ago
        );
        String expiredToken = "Bearer " + shortLivedProvider.generateToken(userA.getId(), userA.getEmail(), List.of("ROLE_USER"));

        mockMvc.perform(get("/api/bookings/my-bookings")
                        .header("Authorization", expiredToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==========================================
    // 4. Role-Based Authorization
    // ==========================================

    @Test
    @DisplayName("Role Authorization: ROLE_USER cannot create catalog resources (403 Forbidden)")
    void testCustomerCannotAccessAdminCatalogEndpoints() throws Exception {
        MovieRequest movieReq = new MovieRequest("Avatar 3", "Pandora", 180, "Sci-Fi", "English");

        mockMvc.perform(post("/api/movies")
                        .header("Authorization", tokenUserA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(movieReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Public Access: Browsing movies and seat maps is allowed without authentication")
    void testPublicBrowsingAllowedWithoutToken() throws Exception {
        mockMvc.perform(get("/api/movies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(get("/api/shows/" + show.getId() + "/seats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // ==========================================
    // 5. Cross-User Isolation (User A vs User B)
    // ==========================================

    @Test
    @DisplayName("Cross-User Isolation: User B cannot view User A's booking (403 Forbidden)")
    void testUserBCannotViewUserABooking() throws Exception {
        mockMvc.perform(get("/api/bookings/" + userABooking.getId())
                        .header("Authorization", tokenUserB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Cross-User Isolation: User B cannot cancel User A's booking (403 Forbidden)")
    void testUserBCannotCancelUserABooking() throws Exception {
        mockMvc.perform(post("/api/bookings/" + userABooking.getId() + "/cancel")
                        .header("Authorization", tokenUserB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        // Verify booking in DB is still CONFIRMED
        Booking booking = bookingRepository.findById(userABooking.getId()).orElseThrow();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Cross-User Isolation: User B cannot query User A's booking list (403 Forbidden)")
    void testUserBCannotQueryUserABookingList() throws Exception {
        mockMvc.perform(get("/api/bookings/user/" + userA.getId())
                        .header("Authorization", tokenUserB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Cross-User Isolation: User B cannot pay for User A's booking (403 Forbidden)")
    void testUserBCannotPayForUserABooking() throws Exception {
        PaymentProcessRequest paymentReq = new PaymentProcessRequest(
                userABooking.getId(),
                new BigDecimal("400.00"),
                "UPI",
                "SUCCESS"
        );

        mockMvc.perform(post("/api/payments/process")
                        .header("Authorization", tokenUserB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(paymentReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Cross-User Isolation: User B cannot lock seats on behalf of User A (403 Forbidden)")
    void testUserBCannotLockSeatsAsUserA() throws Exception {
        SeatLockRequest lockReq = new SeatLockRequest(
                userA.getId(), // Specifying User A's id while authenticated as User B
                show.getId(),
                List.of(showSeat1.getId())
        );

        mockMvc.perform(post("/api/seat-locks")
                        .header("Authorization", tokenUserB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lockReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Cross-User Isolation: User B cannot create booking on behalf of User A (403 Forbidden)")
    void testUserBCannotCreateBookingAsUserA() throws Exception {
        BookingCreateRequest bookingReq = new BookingCreateRequest(
                userA.getId(), // Specifying User A's id while authenticated as User B
                show.getId(),
                List.of(showSeat1.getId())
        );

        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", tokenUserB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ==========================================
    // 6. Legitimate User & Admin Access
    // ==========================================

    @Test
    @DisplayName("Authorized Access: User A can view their own booking and booking list")
    void testUserACanAccessOwnBookings() throws Exception {
        mockMvc.perform(get("/api/bookings/" + userABooking.getId())
                        .header("Authorization", tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(userABooking.getId().toString()));

        mockMvc.perform(get("/api/bookings/my-bookings")
                        .header("Authorization", tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(userABooking.getId().toString()));
    }

    @Test
    @DisplayName("Admin Access: Admin can view any user's booking and manage catalog")
    void testAdminCanAccessAnyBookingAndCatalog() throws Exception {
        // Admin views User A's booking
        mockMvc.perform(get("/api/bookings/" + userABooking.getId())
                        .header("Authorization", tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(userABooking.getId().toString()));

        // Admin creates a movie
        MovieRequest movieReq = new MovieRequest("Oppenheimer", "Atomic bomb story", 180, "Biography", "English");
        mockMvc.perform(post("/api/movies")
                        .header("Authorization", tokenAdmin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(movieReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true));
    }
}
