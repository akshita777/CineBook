package com.example.ticketbooking.edgecase;

import com.example.ticketbooking.config.TestKafkaConfiguration;
import com.example.ticketbooking.config.TestRedisConfiguration;
import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.dto.request.PaymentProcessRequest;
import com.example.ticketbooking.dto.request.SeatLockRequest;
import com.example.ticketbooking.dto.response.BookingResponse;
import com.example.ticketbooking.dto.response.SeatLockResponse;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.BookingStatus;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.exception.BadRequestException;
import com.example.ticketbooking.exception.PaymentFailedException;
import com.example.ticketbooking.exception.SeatNotAvailableException;
import com.example.ticketbooking.lock.RedisDistributedSeatLock;
import com.example.ticketbooking.payment.MockPaymentService;
import com.example.ticketbooking.repository.*;
import com.example.ticketbooking.service.BookingService;
import com.example.ticketbooking.service.SeatLockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Import({TestRedisConfiguration.class, TestKafkaConfiguration.class})
class LifecycleAndStateTransitionEdgeCaseTest {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private SeatLockService seatLockService;

    @Autowired
    private MockPaymentService mockPaymentService;

    @Autowired
    private RedisDistributedSeatLock redisDistributedSeatLock;

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

    private User user1;
    private User user2;
    private Show show;
    private ShowSeat showSeat1;
    private ShowSeat showSeat2;

    @BeforeEach
    void setUp() {
        TestRedisConfiguration.clear();
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

        user1 = userRepository.save(new User("edge_u1@example.com", "pass", "Edge User 1", "9111111111"));
        user2 = userRepository.save(new User("edge_u2@example.com", "pass", "Edge User 2", "9222222222"));

        Movie movie = movieRepository.save(new Movie("Oppenheimer", "Biopic", 180, "Drama", "English"));
        Venue venue = venueRepository.save(new Venue("PVR Director's Cut", "New Delhi", "Vasant Kunj"));
        Screen screen = screenRepository.save(new Screen(venue, "Lounge 1", 30));

        Seat seat1 = seatRepository.save(new Seat(screen, "A", 1, SeatType.VIP));
        Seat seat2 = seatRepository.save(new Seat(screen, "A", 2, SeatType.VIP));

        show = showRepository.save(new Show(movie, screen, LocalDateTime.now().plusDays(2), LocalDateTime.now().plusDays(2).plusHours(3)));
        showSeat1 = showSeatRepository.save(new ShowSeat(show, seat1, new BigDecimal("600.00")));
        showSeat2 = showSeatRepository.save(new ShowSeat(show, seat2, new BigDecimal("600.00")));
    }

    // ==========================================
    // 1. Schema & Re-booking Lifecycle Check
    // ==========================================

    @Test
    @DisplayName("Lifecycle: Cancelling a booking and re-booking the same seat does not violate database constraints")
    void testCancelledBookingSeatCanBeRebookedWithoutConstraintViolation() {
        // Step 1: User 1 books showSeat1
        BookingCreateRequest req1 = new BookingCreateRequest(user1.getId(), show.getId(), List.of(showSeat1.getId()));
        BookingResponse booking1 = bookingService.createBooking(req1);

        assertThat(booking1.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.BOOKED);
        assertThat(bookingSeatRepository.count()).isEqualTo(1);

        // Step 2: User 1 cancels booking
        BookingResponse cancelledBooking = bookingService.cancelBooking(booking1.id());
        assertThat(cancelledBooking.status()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.AVAILABLE);

        // Step 3: User 2 subsequently books the exact same showSeat1
        BookingCreateRequest req2 = new BookingCreateRequest(user2.getId(), show.getId(), List.of(showSeat1.getId()));
        BookingResponse booking2 = bookingService.createBooking(req2);

        assertThat(booking2.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(booking2.id()).isNotEqualTo(booking1.id());
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.BOOKED);

        // Crucial verification: Both BookingSeat records are preserved (one for cancelled booking, one for confirmed)
        List<BookingSeat> seatRecords = bookingSeatRepository.findAll();
        assertThat(seatRecords).hasSize(2);
        assertThat(seatRecords.stream().map(bs -> bs.getBooking().getId()).toList())
                .containsExactlyInAnyOrder(booking1.id(), booking2.id());
    }

    // ==========================================
    // 2. State-Machine Edge Cases
    // ==========================================

    @Test
    @DisplayName("State-Machine: Complete lifecycle transitions (AVAILABLE -> LOCKED -> AVAILABLE -> LOCKED -> BOOKED -> CANCELLED -> AVAILABLE)")
    void testCompleteStateMachineTransitions() {
        // AVAILABLE -> LOCKED
        SeatLockResponse lockRes = seatLockService.lockSeats(
                new SeatLockRequest(user1.getId(), show.getId(), List.of(showSeat1.getId()))
        );
        assertThat(lockRes.lockToken()).isNotEmpty();
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.LOCKED);

        // LOCKED -> AVAILABLE (manual unlock)
        seatLockService.unlockSeats(show.getId(), List.of(showSeat1.getId()), lockRes.lockToken());
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.AVAILABLE);

        // AVAILABLE -> LOCKED again
        SeatLockResponse lockRes2 = seatLockService.lockSeats(
                new SeatLockRequest(user2.getId(), show.getId(), List.of(showSeat1.getId()))
        );

        // LOCKED -> BOOKED (with valid lock token)
        BookingCreateRequest bookReq = new BookingCreateRequest(
                user2.getId(), show.getId(), List.of(showSeat1.getId()), lockRes2.lockToken()
        );
        BookingResponse booking = bookingService.createBooking(bookReq);
        assertThat(booking.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.BOOKED);

        // BOOKED seats cannot be locked
        assertThatThrownBy(() -> seatLockService.lockSeats(
                new SeatLockRequest(user1.getId(), show.getId(), List.of(showSeat1.getId()))
        )).isInstanceOf(SeatNotAvailableException.class);

        // BOOKED seats cannot be booked again
        assertThatThrownBy(() -> bookingService.createBooking(
                new BookingCreateRequest(user1.getId(), show.getId(), List.of(showSeat1.getId()))
        )).isInstanceOf(SeatNotAvailableException.class);

        // BOOKED -> CANCELLED -> AVAILABLE
        bookingService.cancelBooking(booking.id());
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.AVAILABLE);
    }

    // ==========================================
    // 3. Lock Expiry Race Conditions
    // ==========================================

    @Test
    @DisplayName("Lock Expiry Race A: Redis lock expired before DB lock -> DB remains final authority, unowned booking rejected")
    void testRedisExpiredBeforeDbLockAuthority() {
        // Seat locked in DB for 5 minutes
        showSeat1.setStatus(SeatStatus.LOCKED);
        showSeat1.setLockedUntil(Instant.now().plusSeconds(300));
        showSeatRepository.save(showSeat1);

        // Redis lock has already expired (no key exists in Redis)
        // A user attempting to book without valid token must be rejected because DB is source of truth
        BookingCreateRequest requestWithoutToken = new BookingCreateRequest(
                user1.getId(), show.getId(), List.of(showSeat1.getId()), null
        );

        assertThatThrownBy(() -> bookingService.createBooking(requestWithoutToken))
                .isInstanceOf(SeatNotAvailableException.class)
                .hasMessageContaining("currently locked");
    }

    @Test
    @DisplayName("Lock Expiry Race B: DB lock expired before Redis TTL -> DB allows re-locking and booking")
    void testDbExpiredBeforeRedisAllowsRelocking() {
        // DB lock has expired 10 seconds ago
        showSeat1.setStatus(SeatStatus.LOCKED);
        showSeat1.setLockedUntil(Instant.now().minusSeconds(10));
        showSeatRepository.save(showSeat1);

        // Even if an expired Redis key lingers, DB is authoritative: User 2 can book it cleanly
        BookingCreateRequest request = new BookingCreateRequest(
                user2.getId(), show.getId(), List.of(showSeat1.getId()), null
        );

        BookingResponse booking = bookingService.createBooking(request);
        assertThat(booking.status()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(showSeatRepository.findById(showSeat1.getId()).orElseThrow().getStatus()).isEqualTo(SeatStatus.BOOKED);
    }

    // ==========================================
    // 4. Booking & Payment Races
    // ==========================================

    @Test
    @DisplayName("Payment Race: Concurrent payment and cancellation -> exactly one transition wins cleanly")
    void testConcurrentPaymentAndCancellationRace() throws Exception {
        // Setup a PENDING booking
        showSeat1.setStatus(SeatStatus.LOCKED);
        showSeat1.setLockedUntil(Instant.now().plusSeconds(300));
        showSeatRepository.save(showSeat1);

        Booking pendingBooking = new Booking(user1, show, new BigDecimal("600.00"), Instant.now().plusSeconds(300));
        pendingBooking.setStatus(BookingStatus.PENDING);
        Booking savedBooking = bookingRepository.save(pendingBooking);
        bookingSeatRepository.save(new BookingSeat(savedBooking, showSeat1));

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(2);

        AtomicBoolean paymentSucceeded = new AtomicBoolean(false);
        AtomicBoolean cancelSucceeded = new AtomicBoolean(false);

        // Thread 1: Process Payment
        executor.submit(() -> {
            try {
                startGate.await();
                mockPaymentService.processPayment(new PaymentProcessRequest(
                        savedBooking.getId(),
                        new BigDecimal("600.00"),
                        "CREDIT_CARD",
                        "SUCCESS"
                ));
                paymentSucceeded.set(true);
            } catch (Exception ignored) {
            } finally {
                finishGate.countDown();
            }
        });

        // Thread 2: Cancel Booking
        executor.submit(() -> {
            try {
                startGate.await();
                bookingService.cancelBooking(savedBooking.getId());
                cancelSucceeded.set(true);
            } catch (Exception ignored) {
            } finally {
                finishGate.countDown();
            }
        });

        startGate.countDown();
        finishGate.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        Booking finalBooking = bookingRepository.findById(savedBooking.getId()).orElseThrow();
        ShowSeat finalSeat = showSeatRepository.findById(showSeat1.getId()).orElseThrow();

        // Valid terminal states only:
        // Case 1: Cancel won first -> Booking CANCELLED, seat AVAILABLE
        // Case 2: Payment won first -> Booking CONFIRMED, seat BOOKED, cancel may later have run or was blocked
        assertThat(finalBooking.getStatus()).isIn(BookingStatus.CONFIRMED, BookingStatus.CANCELLED);
        if (finalBooking.getStatus() == BookingStatus.CONFIRMED) {
            assertThat(finalSeat.getStatus()).isEqualTo(SeatStatus.BOOKED);
        } else {
            assertThat(finalSeat.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
        }
    }

    @Test
    @DisplayName("Idempotency: Repeated payment request for already confirmed booking is rejected")
    void testDuplicatePaymentRequestIsRejected() {
        showSeat1.setStatus(SeatStatus.LOCKED);
        showSeatRepository.save(showSeat1);

        Booking booking = new Booking(user1, show, new BigDecimal("600.00"), Instant.now().plusSeconds(300));
        booking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(booking);
        bookingSeatRepository.save(new BookingSeat(saved, showSeat1));

        PaymentProcessRequest req = new PaymentProcessRequest(
                saved.getId(),
                new BigDecimal("600.00"),
                "UPI",
                "SUCCESS"
        );

        // First payment succeeds
        mockPaymentService.processPayment(req);

        // Duplicate payment attempt rejected
        assertThatThrownBy(() -> mockPaymentService.processPayment(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already paid and confirmed");
    }

    @Test
    @DisplayName("Payment Failure: Seat released immediately to AVAILABLE and subsequent user can book it")
    void testFailedPaymentReleasesSeatsImmediatelyToAvailable() {
        showSeat1.setStatus(SeatStatus.LOCKED);
        showSeatRepository.save(showSeat1);

        Booking booking = new Booking(user1, show, new BigDecimal("600.00"), Instant.now().plusSeconds(300));
        booking.setStatus(BookingStatus.PENDING);
        Booking saved = bookingRepository.save(booking);
        bookingSeatRepository.save(new BookingSeat(saved, showSeat1));

        PaymentProcessRequest req = new PaymentProcessRequest(
                saved.getId(),
                new BigDecimal("600.00"),
                "CARD",
                "FAILURE" // Force failure
        );

        assertThatThrownBy(() -> mockPaymentService.processPayment(req))
                .isInstanceOf(PaymentFailedException.class);

        // Seat must immediately be AVAILABLE in DB
        ShowSeat seatAfterFail = showSeatRepository.findById(showSeat1.getId()).orElseThrow();
        assertThat(seatAfterFail.getStatus()).isEqualTo(SeatStatus.AVAILABLE);

        // User 2 can now book it immediately
        BookingResponse newBooking = bookingService.createBooking(
                new BookingCreateRequest(user2.getId(), show.getId(), List.of(showSeat1.getId()))
        );
        assertThat(newBooking.status()).isEqualTo(BookingStatus.CONFIRMED);
    }

    // ==========================================
    // 5. Database Constraint & Rollback Testing
    // ==========================================

    @Test
    @DisplayName("Rollback: Multi-seat booking failure rolls back transaction atomically with no orphaned records")
    void testTransactionRollbackLeavesNoOrphanedRecords() {
        long initialBookingCount = bookingRepository.count();
        long initialBookingSeatCount = bookingSeatRepository.count();

        UUID fakeNonExistentSeatId = UUID.randomUUID();

        // User 1 requests [validSeat1, fakeNonExistentSeatId]
        BookingCreateRequest invalidBatch = new BookingCreateRequest(
                user1.getId(), show.getId(), List.of(showSeat1.getId(), fakeNonExistentSeatId)
        );

        assertThatThrownBy(() -> bookingService.createBooking(invalidBatch))
                .isInstanceOf(BadRequestException.class);

        // Invariant: Entire transaction rolled back
        assertThat(bookingRepository.count()).isEqualTo(initialBookingCount);
        assertThat(bookingSeatRepository.count()).isEqualTo(initialBookingSeatCount);

        // showSeat1 must still be AVAILABLE (not BOOKED)
        ShowSeat seat1 = showSeatRepository.findById(showSeat1.getId()).orElseThrow();
        assertThat(seat1.getStatus()).isEqualTo(SeatStatus.AVAILABLE);
    }
}
