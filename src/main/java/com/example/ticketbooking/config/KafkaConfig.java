package com.example.ticketbooking.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String BOOKING_CONFIRMED_TOPIC = "booking-confirmed-events";

    @Bean
    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
            name = "spring.kafka.listener.auto-startup",
            havingValue = "true",
            matchIfMissing = true
    )
    public NewTopic bookingConfirmedTopic() {
        return TopicBuilder.name(BOOKING_CONFIRMED_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
