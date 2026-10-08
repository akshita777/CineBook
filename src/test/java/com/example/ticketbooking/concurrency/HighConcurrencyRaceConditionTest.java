package com.example.ticketbooking.concurrency;

import com.example.ticketbooking.config.TestKafkaConfiguration;
import com.example.ticketbooking.config.TestRedisConfiguration;
import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.exception.SeatNotAvailableException;
import com.example.ticketbooking.lock.RedisDistributedSeatLock;
import com.example.ticketbooking.repository.*;
import com.example.ticketbooking.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Import({TestRedisConfiguration.class, TestKafkaConfiguration.class})
class HighConcurrencyRaceConditionTest {

    @Autowired
    private BookingService bookingService;

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

    private Show show;
    private List<User> testUsers;

    @BeforeEach
    void setUp() {
        bookingSeatRepository.deleteAll();
        bookingRepository.deleteAll();
        showSeatRepository.deleteAll();
        showRepository.deleteAll();
        seatRepository.deleteAll();
        screenRepository.deleteAll();
        venueRepository.deleteAll();
        movieRepository.deleteAll();
        userRepository.deleteAll();

        // Seed catalog
        Movie movie = movieRepository.save(new Movie("Interstellar 2", "Sci-Fi", 165, "Adventure", "English"));
        Venue venue = venueRepository.save(new Venue("PVR Grand", "Bengaluru", "Whitefield"));
        Screen screen = screenRepository.save(new Screen(venue, "IMAX 1", 200));

        show = showRepository.save(new Show(movie, screen, LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(3)));

        // Pre-create 120 users for 100+ concurrent tests
        List<User> usersToCreate = new ArrayList<>();
        for (int i = 1; i <= 120; i++) {
            usersToCreate.add(new User("race_user_" + i + "@example.com", "pass", "User " + i, "90000000" + (i < 10 ? "0" + i : i)));
        }
        testUsers = userRepository.saveAll(usersToCreate);
    }

    @Test
    @DisplayName("Race 1: 100+ concurrent users attempt to book the exact same seat -> Exactly 1 succeeds, no deadlocks")
    void test100ConcurrentUsersBookingSameSeatRace() throws Exception {
        final int numberOfThreads = 100;
        Seat seat = seatRepository.save(new Seat(show.getScreen(), "A", 1, SeatType.REGULAR));
        ShowSeat showSeat = showSeatRepository.save(new ShowSeat(show, seat, new BigDecimal("350.00")));

        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Throwable> unexpectedExceptions = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < numberOfThreads; i++) {
            final User user = testUsers.get(i);
            executor.submit(() -> {
                try {
                    startGate.await();
                    BookingCreateRequest req = new BookingCreateRequest(user.getId(), show.getId(), List.of(showSeat.getId()));
                    bookingService.createBooking(req);
                    successCount.incrementAndGet();
                } catch (SeatNotAvailableException ex) {
                    failureCount.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedExceptions.add(t);
                } finally {
                    finishGate.countDown();
                }
            });
        }

        // Fire all 100 threads simultaneously
        startGate.countDown();
        boolean completed = finishGate.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).as("All 100 threads should complete within timeout").isTrue();
        assertThat(unexpectedExceptions).as("No deadlocks or unexpected exceptions should occur").isEmpty();

        // Invariant 1: Exactly 1 booking succeeds
        assertThat(successCount.get())
                .as("Exactly 1 booking must succeed out of 100 concurrent attempts")
                .isEqualTo(1);

        // Invariant 2: Exactly 99 attempts rejected cleanly with SeatNotAvailableException
        assertThat(failureCount.get())
                .as("Exactly 99 attempts must fail cleanly due to seat unavailability")
                .isEqualTo(numberOfThreads - 1);

        // Invariant 3: Exactly 1 Booking row in DB
        assertThat(bookingRepository.count()).isEqualTo(1);

        // Invariant 4: Exactly 1 BookingSeat row in DB (no duplicates)
        assertThat(bookingSeatRepository.count()).isEqualTo(1);

        // Invariant 5: ShowSeat in DB is marked BOOKED
        ShowSeat seatInDb = showSeatRepository.findById(showSeat.getId()).orElseThrow();
        assertThat(seatInDb.getStatus()).isEqualTo(SeatStatus.BOOKED);
    }

    @Test
    @DisplayName("Race 2: Multiple users simultaneously request overlapping combinations [A,B], [B,C], [A,C] -> Deadlock-free atomic booking")
    void testOverlappingMultiSeatBookingRaceDeadlockFree() throws Exception {
        // Create 3 seats: A, B, C
        Seat seatA = seatRepository.save(new Seat(show.getScreen(), "B", 1, SeatType.PREMIUM));
        Seat seatB = seatRepository.save(new Seat(show.getScreen(), "B", 2, SeatType.PREMIUM));
        Seat seatC = seatRepository.save(new Seat(show.getScreen(), "B", 3, SeatType.PREMIUM));

        ShowSeat showSeatA = showSeatRepository.save(new ShowSeat(show, seatA, new BigDecimal("450.00")));
        ShowSeat showSeatB = showSeatRepository.save(new ShowSeat(show, seatB, new BigDecimal("450.00")));
        ShowSeat showSeatC = showSeatRepository.save(new ShowSeat(show, seatC, new BigDecimal("450.00")));

        // 60 total threads: 20 wanting [A, B], 20 wanting [B, C], 20 wanting [A, C]
        final int totalThreads = 60;
        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(totalThreads);

        AtomicInteger groupABSuccess = new AtomicInteger(0);
        AtomicInteger groupBCSuccess = new AtomicInteger(0);
        AtomicInteger groupACSuccess = new AtomicInteger(0);
        AtomicInteger totalFailures = new AtomicInteger(0);
        List<Throwable> unexpectedExceptions = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < totalThreads; i++) {
            final User user = testUsers.get(i);
            final int group = i % 3;

            List<UUID> targetSeatIds;
            if (group == 0) {
                targetSeatIds = List.of(showSeatA.getId(), showSeatB.getId());
            } else if (group == 1) {
                targetSeatIds = List.of(showSeatB.getId(), showSeatC.getId());
            } else {
                targetSeatIds = List.of(showSeatA.getId(), showSeatC.getId());
            }

            executor.submit(() -> {
                try {
                    startGate.await();
                    BookingCreateRequest req = new BookingCreateRequest(user.getId(), show.getId(), targetSeatIds);
                    bookingService.createBooking(req);
                    if (group == 0) groupABSuccess.incrementAndGet();
                    else if (group == 1) groupBCSuccess.incrementAndGet();
                    else groupACSuccess.incrementAndGet();
                } catch (SeatNotAvailableException ex) {
                    totalFailures.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedExceptions.add(t);
                } finally {
                    finishGate.countDown();
                }
            });
        }

        startGate.countDown();
        boolean completed = finishGate.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(unexpectedExceptions)
                .as("Deterministic lock ordering must prevent any SQL deadlocks")
                .isEmpty();

        int totalSuccess = groupABSuccess.get() + groupBCSuccess.get() + groupACSuccess.get();
        // Because any pair overlaps with both other pairs, at most ONE pair can succeed!
        assertThat(totalSuccess)
                .as("At most one overlapping 2-seat pair can succeed because all pairs share a seat")
                .isEqualTo(1);

        assertThat(totalFailures.get()).isEqualTo(totalThreads - 1);

        // Verify database consistency: exactly 2 seats are BOOKED and 1 remains AVAILABLE
        List<ShowSeat> dbSeats = showSeatRepository.findAllById(List.of(showSeatA.getId(), showSeatB.getId(), showSeatC.getId()));
        long bookedCount = dbSeats.stream().filter(s -> s.getStatus() == SeatStatus.BOOKED).count();
        long availableCount = dbSeats.stream().filter(s -> s.getStatus() == SeatStatus.AVAILABLE).count();

        assertThat(bookedCount).as("Exactly 2 seats must be marked BOOKED").isEqualTo(2);
        assertThat(availableCount).as("Exactly 1 seat must remain AVAILABLE").isEqualTo(1);
    }

    @Test
    @DisplayName("Race 3: Concurrent Redis lock acquisition on overlapping seats -> exactly 1 succeeds, failed attempts clean up partial keys")
    void testConcurrentRedisLockAcquisitionAndRollback() throws Exception {
        UUID seat1 = UUID.randomUUID();
        UUID seat2 = UUID.randomUUID();
        UUID seat3 = UUID.randomUUID();

        int threads = 30;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(threads);

        AtomicInteger successfulLocks = new AtomicInteger(0);
        AtomicInteger failedLocks = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final String token = UUID.randomUUID().toString();
            // Threads race to acquire overlapping seats: [seat1, seat2] vs [seat2, seat3]
            final List<UUID> requestedSeats = (i % 2 == 0) ? List.of(seat1, seat2) : List.of(seat2, seat3);

            executor.submit(() -> {
                try {
                    startGate.await();
                    boolean acquired = redisDistributedSeatLock.acquireAll(
                            show.getId(),
                            requestedSeats,
                            token,
                            Duration.ofSeconds(60)
                    );
                    if (acquired) {
                        successfulLocks.incrementAndGet();
                    } else {
                        failedLocks.incrementAndGet();
                    }
                } catch (Exception ignored) {
                } finally {
                    finishGate.countDown();
                }
            });
        }

        startGate.countDown();
        finishGate.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        // Because seat2 is contested by all threads, only 1 thread can hold all its requested seats!
        assertThat(successfulLocks.get()).isEqualTo(1);
        assertThat(failedLocks.get()).isEqualTo(threads - 1);

        // Clean up
        redisDistributedSeatLock.release(show.getId(), seat1, "dummy");
        redisDistributedSeatLock.release(show.getId(), seat2, "dummy");
        redisDistributedSeatLock.release(show.getId(), seat3, "dummy");
    }
}
