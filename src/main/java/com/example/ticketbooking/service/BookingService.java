package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.dto.response.BookingResponse;
import com.example.ticketbooking.entity.*;
import com.example.ticketbooking.entity.enums.BookingStatus;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.exception.BadRequestException;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.exception.SeatNotAvailableException;
import com.example.ticketbooking.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowSeatRepository showSeatRepository;
    private final ShowRepository showRepository;
    private final UserRepository userRepository;
    private final com.example.ticketbooking.lock.RedisDistributedSeatLock redisDistributedSeatLock;

    public BookingService(BookingRepository bookingRepository,
                          BookingSeatRepository bookingSeatRepository,
                          ShowSeatRepository showSeatRepository,
                          ShowRepository showRepository,
                          UserRepository userRepository,
                          com.example.ticketbooking.lock.RedisDistributedSeatLock redisDistributedSeatLock) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.showSeatRepository = showSeatRepository;
        this.showRepository = showRepository;
        this.userRepository = userRepository;
        this.redisDistributedSeatLock = redisDistributedSeatLock;
    }

    @Transactional
    public BookingResponse createBooking(BookingCreateRequest request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.userId()));

        Show show = showRepository.findById(request.showId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with id: " + request.showId()));

        // Sort IDs deterministically to prevent cross-transaction deadlocks
        List<UUID> sortedSeatIds = request.showSeatIds().stream().sorted().toList();

        // 1. Acquire PESSIMISTIC_WRITE (SELECT ... FOR UPDATE) row locks on all requested seats
        List<ShowSeat> selectedSeats = showSeatRepository.findByIdInWithPessimisticWriteLock(sortedSeatIds);
        if (selectedSeats.size() != sortedSeatIds.size()) {
            throw new BadRequestException("One or more selected seat IDs are invalid");
        }

        // 2. Validate seat ownership and atomic availability within the locked transaction
        for (ShowSeat ss : selectedSeats) {
            if (!ss.getShow().getId().equals(show.getId())) {
                throw new BadRequestException("Seat " + ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber() + " does not belong to show " + show.getId());
            }
            // Allow booking if seat is either AVAILABLE, or was LOCKED by the caller with a matching lockToken
            if (ss.getStatus() == SeatStatus.BOOKED) {
                throw new SeatNotAvailableException("Seat " + ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber() + " is already booked.");
            }
            if (ss.getStatus() == SeatStatus.LOCKED) {
                boolean dbLockExpired = ss.getLockedUntil() != null && ss.getLockedUntil().isBefore(Instant.now());
                if (!dbLockExpired) {
                    // Seat is actively LOCKED in DB - caller MUST provide the valid token that holds the Redis lock
                    if (request.lockToken() == null || request.lockToken().isBlank()) {
                        throw new SeatNotAvailableException("Seat " + ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber() + " is currently locked. Lock token is required.");
                    }
                    boolean tokenOwnsLock = redisDistributedSeatLock.isHeldByToken(show.getId(), ss.getId(), request.lockToken());
                    if (!tokenOwnsLock) {
                        throw new SeatNotAvailableException("Seat " + ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber() + " is locked by another transaction.");
                    }
                }
            }
        }

        // Calculate total amount
        BigDecimal totalAmount = selectedSeats.stream()
                .map(ShowSeat::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Mark seats as BOOKED
        for (ShowSeat ss : selectedSeats) {
            ss.setStatus(SeatStatus.BOOKED);
            ss.setLockedUntil(null);
        }
        showSeatRepository.saveAll(selectedSeats);

        // Create confirmed booking
        Booking booking = new Booking(user, show, totalAmount, null);
        booking.setStatus(BookingStatus.CONFIRMED);
        Booking savedBooking = bookingRepository.save(booking);

        // Associate seats to booking
        List<BookingSeat> bookingSeats = new ArrayList<>();
        for (ShowSeat ss : selectedSeats) {
            BookingSeat bs = new BookingSeat(savedBooking, ss);
            bookingSeats.add(bs);
        }
        bookingSeatRepository.saveAll(bookingSeats);

        // Clean up Redis locks if token was active
        if (request.lockToken() != null) {
            redisDistributedSeatLock.releaseAll(show.getId(), sortedSeatIds, request.lockToken());
        }

        return mapToResponse(savedBooking, selectedSeats);
    }

    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(bookingId);
        List<ShowSeat> showSeats = bookingSeats.stream()
                .map(BookingSeat::getShowSeat)
                .toList();

        return mapToResponse(booking, showSeats);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(UUID userId) {
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id: " + userId);
        }
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(b -> {
                    List<BookingSeat> seats = bookingSeatRepository.findByBookingId(b.getId());
                    return mapToResponse(b, seats.stream().map(BookingSeat::getShowSeat).toList());
                })
                .toList();
    }

    @Transactional
    public BookingResponse cancelBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BadRequestException("Booking is already cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);

        // Release seats back to AVAILABLE
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(bookingId);
        List<ShowSeat> showSeats = new ArrayList<>();
        for (BookingSeat bs : bookingSeats) {
            ShowSeat ss = bs.getShowSeat();
            ss.setStatus(SeatStatus.AVAILABLE);
            ss.setLockedUntil(null);
            showSeats.add(ss);
        }
        showSeatRepository.saveAll(showSeats);

        return mapToResponse(booking, showSeats);
    }

    private BookingResponse mapToResponse(Booking booking, List<ShowSeat> showSeats) {
        List<String> seatLabels = showSeats.stream()
                .map(ss -> ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber())
                .toList();

        return new BookingResponse(
                booking.getId(),
                booking.getUser().getId(),
                booking.getShow().getId(),
                booking.getShow().getMovie().getTitle(),
                booking.getShow().getScreen().getName(),
                booking.getShow().getScreen().getVenue().getName(),
                booking.getShow().getStartTime(),
                seatLabels,
                booking.getTotalAmount(),
                booking.getStatus(),
                booking.getCreatedAt(),
                booking.getExpiresAt()
        );
    }
}
