package com.example.ticketbooking;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
@org.springframework.context.annotation.Import({com.example.ticketbooking.config.TestRedisConfiguration.class, com.example.ticketbooking.config.TestKafkaConfiguration.class})
class TicketBookingApplicationTests {

    @Test
    @DisplayName("Verify Spring application context loads cleanly with all JPA entities and repositories")
    void contextLoads() {
    }
}
