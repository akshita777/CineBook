package com.example.ticketbooking.payment;

import com.example.ticketbooking.dto.request.PaymentProcessRequest;
import com.example.ticketbooking.dto.response.PaymentResponse;
import com.example.ticketbooking.entity.Booking;
import com.example.ticketbooking.entity.BookingSeat;
import com.example.ticketbooking.entity.Payment;
import com.example.ticketbooking.entity.ShowSeat;
import com.example.ticketbooking.entity.enums.BookingStatus;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.exception.BadRequestException;
import com.example.ticketbooking.exception.PaymentFailedException;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.lock.RedisDistributedSeatLock;
import com.example.ticketbooking.repository.BookingRepository;
import com.example.ticketbooking.repository.BookingSeatRepository;
import com.example.ticketbooking.repository.PaymentRepository;
import com.example.ticketbooking.repository.ShowSeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MockPaymentService {

    private static final Logger log = LoggerFactory.getLogger(MockPaymentService.class);

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowSeatRepository showSeatRepository;
    private final PaymentRepository paymentRepository;
    private final RedisDistributedSeatLock redisDistributedSeatLock;
    private final com.example.ticketbooking.kafka.producer.BookingEventProducer bookingEventProducer;

    public MockPaymentService(BookingRepository bookingRepository,
                              BookingSeatRepository bookingSeatRepository,
                              ShowSeatRepository showSeatRepository,
                              PaymentRepository paymentRepository,
                              RedisDistributedSeatLock redisDistributedSeatLock,
                              com.example.ticketbooking.kafka.producer.BookingEventProducer bookingEventProducer) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.showSeatRepository = showSeatRepository;
        this.paymentRepository = paymentRepository;
        this.redisDistributedSeatLock = redisDistributedSeatLock;
        this.bookingEventProducer = bookingEventProducer;
    }

    /**
     * Executes mock payment processing.
     * Note on architecture:
     * 1. Simulated payment call/latency is performed OUTSIDE of any database row-lock.
     * 2. Transaction begins only when persisting the payment entity and updating booking/seat statuses.
     */
    public PaymentResponse processPayment(PaymentProcessRequest request) {
        // Step 1: Pre-validation read without holding row locks
        Booking booking = bookingRepository.findById(request.bookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + request.bookingId()));

        if (booking.getStatus() == BookingStatus.CONFIRMED) {
            throw new BadRequestException("Booking is already paid and confirmed");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BadRequestException("Cannot pay for a " + booking.getStatus() + " booking");
        }
        if (request.amount().compareTo(booking.getTotalAmount()) != 0) {
            throw new BadRequestException("Payment amount (" + request.amount() + ") does not match booking total (" + booking.getTotalAmount() + ")");
        }

        // Step 2: Simulated external payment gateway call (mock latency/decision)
        // No DB row locks are held during this mock computation!
        boolean isSuccess = simulateGatewayDecision(request.simulateStatus());
        String transactionRef = "MOCK_TXN_" + UUID.randomUUID().toString().substring(0, 18).toUpperCase();

        // Step 3: Transactional status transition
        if (isSuccess) {
            return handlePaymentSuccess(booking.getId(), request.amount(), transactionRef);
        } else {
            return handlePaymentFailure(booking.getId(), request.amount(), transactionRef);
        }
    }

    @Transactional
    public PaymentResponse handlePaymentSuccess(UUID bookingId, java.math.BigDecimal amount, String transactionRef) {
        Booking booking = bookingRepository.findByIdWithUserAndShow(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
        UUID showId = booking.getShow().getId();
        String userIdStr = booking.getUser().getId().toString();

        // Mark booking CONFIRMED
        booking.setStatus(BookingStatus.CONFIRMED);
        bookingRepository.save(booking);

        // Update seats to BOOKED and clear temporary lock timestamp
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingIdWithShowSeat(bookingId);
        List<ShowSeat> showSeats = bookingSeats.stream().map(BookingSeat::getShowSeat).toList();
        for (ShowSeat ss : showSeats) {
            ss.setStatus(SeatStatus.BOOKED);
            ss.setLockedUntil(null);
            // Release Redis key if it was still active
            redisDistributedSeatLock.release(showId, ss.getId(), userIdStr);
        }
        showSeatRepository.saveAll(showSeats);

        // Persist successful payment record
        Payment payment = new Payment(booking, amount, "SUCCESS", transactionRef);
        Payment saved = paymentRepository.save(payment);

        log.info("Payment SUCCESS for booking {}. Txn: {}", bookingId, transactionRef);

        // Publish asynchronous BookingConfirmedEvent to Kafka after database state is successfully persisted
        List<String> seatLabels = showSeats.stream()
                .map(ss -> ss.getSeat().getSeatRow() + ss.getSeat().getSeatNumber())
                .toList();

        com.example.ticketbooking.kafka.event.BookingConfirmedEvent confirmedEvent =
                new com.example.ticketbooking.kafka.event.BookingConfirmedEvent(
                        UUID.randomUUID(),
                        booking.getId(),
                        booking.getUser().getId(),
                        booking.getUser().getEmail(),
                        booking.getUser().getFullName(),
                        booking.getShow().getId(),
                        booking.getShow().getMovie().getTitle(),
                        booking.getShow().getScreen().getName(),
                        booking.getShow().getScreen().getVenue().getName(),
                        seatLabels,
                        amount,
                        transactionRef,
                        Instant.now()
                );
        bookingEventProducer.publishBookingConfirmed(confirmedEvent);

        return new PaymentResponse(
                saved.getId(),
                booking.getId(),
                amount,
                "SUCCESS",
                transactionRef,
                "Payment processed successfully",
                saved.getCreatedAt()
        );
    }

    @Transactional
    public PaymentResponse handlePaymentFailure(UUID bookingId, java.math.BigDecimal amount, String transactionRef) {
        Booking booking = bookingRepository.findByIdWithUserAndShow(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
        UUID showId = booking.getShow().getId();
        String userIdStr = booking.getUser().getId().toString();

        // Mark booking CANCELLED / EXPIRED due to payment failure
        booking.setStatus(BookingStatus.CANCELLED);
        bookingRepository.save(booking);

        // Release locked seats back to AVAILABLE so other users can book them immediately
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingIdWithShowSeat(bookingId);
        List<ShowSeat> showSeats = bookingSeats.stream().map(BookingSeat::getShowSeat).toList();
        for (ShowSeat ss : showSeats) {
            if (ss.getStatus() == SeatStatus.LOCKED || ss.getStatus() == SeatStatus.BOOKED) {
                ss.setStatus(SeatStatus.AVAILABLE);
                ss.setLockedUntil(null);
                // Also release any Redis key held
                redisDistributedSeatLock.release(showId, ss.getId(), userIdStr);
            }
        }
        showSeatRepository.saveAll(showSeats);

        // Persist failed payment record for audit
        Payment payment = new Payment(booking, amount, "FAILED", transactionRef);
        Payment saved = paymentRepository.save(payment);

        log.warn("Payment FAILED for booking {}. Released {} seats back to AVAILABLE. Txn: {}", bookingId, showSeats.size(), transactionRef);

        throw new PaymentFailedException("Payment failed for booking " + bookingId + ". The reserved seats have been released.");
    }

    private boolean simulateGatewayDecision(String simulateStatus) {
        if ("FAILURE".equalsIgnoreCase(simulateStatus)) {
            return false;
        }
        // Default deterministic success
        return true;
    }
}
