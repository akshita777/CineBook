package com.example.ticketbooking.kafka;

import com.example.ticketbooking.config.TestKafkaConfiguration;
import com.example.ticketbooking.config.TestRedisConfiguration;
import com.example.ticketbooking.entity.ProcessedEvent;
import com.example.ticketbooking.kafka.consumer.NotificationConsumer;
import com.example.ticketbooking.kafka.event.BookingConfirmedEvent;
import com.example.ticketbooking.kafka.producer.BookingEventProducer;
import com.example.ticketbooking.repository.ProcessedEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@Import({TestRedisConfiguration.class, TestKafkaConfiguration.class})
class NotificationEventIntegrationTest {

    @Autowired
    private NotificationConsumer notificationConsumer;

    @Autowired
    private BookingEventProducer bookingEventProducer;

    @Autowired
    private ProcessedEventRepository processedEventRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @BeforeEach
    void setUp() {
        processedEventRepository.deleteAll();
        reset(kafkaTemplate);
    }

    @Test
    @DisplayName("Producer publishes BookingConfirmedEvent with bookingId partition key")
    void testBookingEventProducerPublishesWithPartitionKey() {
        UUID eventId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        BookingConfirmedEvent event = new BookingConfirmedEvent(
                eventId,
                bookingId,
                UUID.randomUUID(),
                "sarah@example.com",
                "Sarah Connor",
                UUID.randomUUID(),
                "Terminator 2",
                "Screen 1",
                "PVR Cinemas",
                List.of("A1", "A2"),
                new BigDecimal("600.00"),
                "MOCK_TXN_12345678",
                Instant.now()
        );

        bookingEventProducer.publishBookingConfirmed(event);

        verify(kafkaTemplate, times(1)).send(
                eq("booking-confirmed-events"),
                eq(bookingId.toString()),
                eq(event)
        );
    }

    @Test
    @DisplayName("Consumer Idempotency: Duplicate Kafka message with same eventId is processed only once")
    void testConsumerIdempotencyPreventsDuplicateProcessing() {
        UUID eventId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        BookingConfirmedEvent event = new BookingConfirmedEvent(
                eventId,
                bookingId,
                UUID.randomUUID(),
                "john@example.com",
                "John Wick",
                UUID.randomUUID(),
                "John Wick 4",
                "IMAX 1",
                "INOX Megaplex",
                List.of("F10"),
                new BigDecimal("450.00"),
                "MOCK_TXN_99999999",
                Instant.now()
        );

        // First delivery: Event is processed and recorded in DB
        notificationConsumer.handleBookingConfirmed(event);

        assertThat(processedEventRepository.existsByEventId(eventId))
                .as("Event should be recorded in ProcessedEvent table")
                .isTrue();

        long countAfterFirstDelivery = processedEventRepository.count();
        assertThat(countAfterFirstDelivery).isEqualTo(1);

        // Second delivery (simulating Kafka redelivery / duplicate message):
        // Must safely identify duplicate and discard without side-effects
        notificationConsumer.handleBookingConfirmed(event);

        long countAfterDuplicateDelivery = processedEventRepository.count();
        assertThat(countAfterDuplicateDelivery)
                .as("Duplicate event must not create duplicate processed records")
                .isEqualTo(1);
    }

    @Test
    @DisplayName("Concurrent Duplicate Delivery: Multiple concurrent consumer threads racing on the exact same eventId")
    void testConcurrentDuplicateEventDelivery() throws InterruptedException {
        int numberOfThreads = 10;
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(numberOfThreads);
        java.util.concurrent.CountDownLatch startGate = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.CountDownLatch finishGate = new java.util.concurrent.CountDownLatch(numberOfThreads);

        UUID eventId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        BookingConfirmedEvent event = new BookingConfirmedEvent(
                eventId,
                bookingId,
                UUID.randomUUID(),
                "neo@matrix.org",
                "Thomas Anderson",
                UUID.randomUUID(),
                "The Matrix",
                "Auditorium 1",
                "PVR Icon",
                List.of("M1", "M2"),
                new BigDecimal("800.00"),
                "MOCK_TXN_MATRIX",
                Instant.now()
        );

        java.util.List<Throwable> exceptions = java.util.Collections.synchronizedList(new java.util.ArrayList<>());

        for (int i = 0; i < numberOfThreads; i++) {
            executor.submit(() -> {
                try {
                    startGate.await();
                    notificationConsumer.handleBookingConfirmed(event);
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    finishGate.countDown();
                }
            });
        }

        // Release all 10 racing threads simultaneously
        startGate.countDown();
        boolean completed = finishGate.await(10, java.util.concurrent.TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();
        // The consumer loop must NOT fail with unhandled exceptions
        assertThat(exceptions)
                .as("Consumer must handle concurrent duplicate delivery gracefully without failing")
                .isEmpty();

        // Exactly 1 record must be inserted in ProcessedEvent table
        assertThat(processedEventRepository.count())
                .as("Only one processed event record should exist despite 10 concurrent racing deliveries")
                .isEqualTo(1);
    }
}
