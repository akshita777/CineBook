package com.example.ticketbooking.kafka.producer;

import com.example.ticketbooking.config.KafkaConfig;
import com.example.ticketbooking.kafka.event.BookingConfirmedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class BookingEventProducer {

    private static final Logger log = LoggerFactory.getLogger(BookingEventProducer.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public BookingEventProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Publishes a BookingConfirmedEvent to Kafka using the bookingId as message key
     * for partition affinity (guaranteeing ordered processing per booking).
     */
    public void publishBookingConfirmed(BookingConfirmedEvent event) {
        try {
            log.info("Publishing BookingConfirmedEvent to Kafka: eventId={}, bookingId={}",
                    event.eventId(), event.bookingId());
            kafkaTemplate.send(
                    KafkaConfig.BOOKING_CONFIRMED_TOPIC,
                    event.bookingId().toString(),
                    event
            );
        } catch (Exception ex) {
            log.error("Failed to publish BookingConfirmedEvent to Kafka: eventId={}", event.eventId(), ex);
            // Non-blocking: Do not fail the committed DB booking transaction if asynchronous notification publish encounters an issue
        }
    }
}
