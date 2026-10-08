package com.example.ticketbooking.concurrency;

import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.exception.SeatNotAvailableException;
import com.example.ticketbooking.repository.*;
import com.example.ticketbooking.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.context.annotation.Import({com.example.ticketbooking.config.TestRedisConfiguration.class, com.example.ticketbooking.config.TestKafkaConfiguration.class})
class PessimisticLockingConcurrencyTest {

    @Autowired
    private BookingService bookingService;

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

    private Show targetShow;
    private ShowSeat contestedSeat;
    private final List<User> testUsers = new ArrayList<>();

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

        // 1. Create 50 distinct test users
        testUsers.clear();
        for (int i = 1; i <= 50; i++) {
            User user = new User("concurrent_user_" + i + "@example.com", "pass", "User " + i, "99999999" + i);
            testUsers.add(userRepository.save(user));
        }

        // 2. Setup Cinema Catalog
        Movie movie = movieRepository.save(new Movie("Oppenheimer", "Biographical thriller", 180, "Drama", "English"));
        Venue venue = venueRepository.save(new Venue("PVR City Center", "Delhi", "Connaught Place"));
        Screen screen = screenRepository.save(new Screen(venue, "Audi 1", 100));
        Seat physicalSeat = seatRepository.save(new Seat(screen, "A", 1, SeatType.PREMIUM));

        // 3. Create Show and target ShowSeat
        targetShow = showRepository.save(new Show(movie, screen, LocalDateTime.now().plusDays(1), LocalDateTime.now().plusDays(1).plusHours(3)));
        contestedSeat = showSeatRepository.save(new ShowSeat(targetShow, physicalSeat, new BigDecimal("450.00")));
    }

    @Test
    @DisplayName("High Concurrency: 50 concurrent threads try to book the exact same seat simultaneously")
    void testConcurrentBookingConflictResolution() throws InterruptedException {
        int numberOfThreads = 50;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch finishGate = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);
        List<Throwable> unexpectedExceptions = Collections.synchronizedList(new ArrayList<>());

        UUID showId = targetShow.getId();
        UUID showSeatId = contestedSeat.getId();

        for (int i = 0; i < numberOfThreads; i++) {
            final User user = testUsers.get(i);
            executor.submit(() -> {
                try {
                    // Wait at the starting gate to ensure simultaneous request dispatch
                    startGate.await();

                    BookingCreateRequest request = new BookingCreateRequest(
                            user.getId(),
                            showId,
                            List.of(showSeatId)
                    );

                    bookingService.createBooking(request);
                    successCount.incrementAndGet();
                } catch (SeatNotAvailableException ex) {
                    // Expected business rejection for 49 threads
                    rejectedCount.incrementAndGet();
                } catch (Exception ex) {
                    // Check if caused by duplicate database constraint violation
                    if (ex.getCause() instanceof org.hibernate.exception.ConstraintViolationException
                            || ex.getMessage() != null && ex.getMessage().contains("constraint")) {
                        rejectedCount.incrementAndGet();
                    } else {
                        unexpectedExceptions.add(ex);
                    }
                } finally {
                    finishGate.countDown();
                }
            });
        }

        // Release the starting gate simultaneously across all 50 threads!
        startGate.countDown();

        // Await completion of all 50 threads
        boolean completed = finishGate.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        assertThat(unexpectedExceptions).isEmpty();

        // INVARIANT GUARANTEE: Exactly 1 user must succeed, and 49 must be rejected!
        assertThat(successCount.get())
                .as("Exactly ONE user should successfully book the contested seat")
                .isEqualTo(1);

        assertThat(rejectedCount.get())
                .as("All other 49 concurrent users must be cleanly rejected")
                .isEqualTo(49);

        // Verify Database State
        ShowSeat updatedSeat = showSeatRepository.findById(showSeatId).orElseThrow();
        assertThat(updatedSeat.getStatus()).isEqualTo(SeatStatus.BOOKED);

        long confirmedBookingsCount = bookingRepository.count();
        assertThat(confirmedBookingsCount)
                .as("Total confirmed bookings in DB must be exactly 1")
                .isEqualTo(1);

        long bookingSeatsCount = bookingSeatRepository.count();
        assertThat(bookingSeatsCount)
                .as("Total booking seat entries in DB must be exactly 1")
                .isEqualTo(1);
    }
}
