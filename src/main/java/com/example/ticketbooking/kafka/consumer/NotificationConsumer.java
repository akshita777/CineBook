package com.example.ticketbooking.kafka.consumer;

import com.example.ticketbooking.config.KafkaConfig;
import com.example.ticketbooking.entity.ProcessedEvent;
import com.example.ticketbooking.kafka.event.BookingConfirmedEvent;
import com.example.ticketbooking.repository.ProcessedEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    private final ProcessedEventService processedEventService;

    public NotificationConsumer(ProcessedEventService processedEventService) {
        this.processedEventService = processedEventService;
    }

    /**
     * Consumes BookingConfirmedEvent and simulates dispatching email/SMS notifications.
     * Enforces strict idempotency via ProcessedEvent table to discard duplicate event deliveries.
     */
    @KafkaListener(
            topics = KafkaConfig.BOOKING_CONFIRMED_TOPIC,
            groupId = "${spring.kafka.consumer.group-id:notification-service-group}"
    )
    public void handleBookingConfirmed(BookingConfirmedEvent event) {
        log.info("Received BookingConfirmedEvent: eventId={}, bookingId={}", event.eventId(), event.bookingId());

        // Atomically claim event processing rights in an isolated transaction
        boolean claimed;
        try {
            claimed = processedEventService.tryClaimEventProcessing(event.eventId(), "BOOKING_CONFIRMED");
        } catch (Exception ex) {
            log.info("Duplicate event or transaction conflict detected for eventId={}: {}", event.eventId(), ex.getMessage());
            claimed = false;
        }

        if (!claimed) {
            log.warn("Event already processed or duplicate detected for eventId={}. Discarding duplicate safely.", event.eventId());
            return;
        }

        // Dispatch notification only if processing rights were successfully claimed
        sendNotification(event);
    }

    private void sendNotification(BookingConfirmedEvent event) {
        log.info("======================================================================");
        log.info("[NOTIFICATION DISPATCH] Booking Confirmation");
        log.info("Recipient: {} <{}>", event.userName(), event.userEmail());
        log.info("Movie:     {} | Venue: {} ({})", event.movieTitle(), event.venueName(), event.screenName());
        log.info("Seats:     {}", String.join(", ", event.seats()));
        log.info("Total:     INR {}", event.totalAmount());
        log.info("Txn Ref:   {}", event.transactionReference());
        log.info("BookingId: {}", event.bookingId());
        log.info("======================================================================");
    }
}
