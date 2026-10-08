package com.example.ticketbooking.controller;

import com.example.ticketbooking.dto.request.BookingCreateRequest;
import com.example.ticketbooking.dto.request.MovieRequest;
import com.example.ticketbooking.dto.request.ScreenRequest;
import com.example.ticketbooking.dto.request.SeatRequest;
import com.example.ticketbooking.dto.request.ShowRequest;
import com.example.ticketbooking.dto.request.VenueRequest;
import com.example.ticketbooking.entity.User;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.context.annotation.Import({com.example.ticketbooking.config.TestRedisConfiguration.class, com.example.ticketbooking.config.TestKafkaConfiguration.class})
class BookingFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.example.ticketbooking.security.JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("End-to-End Booking Lifecycle: Query seat map, book seats, verify status update, cancel and re-availability")
    void testEndToEndBookingFlow() throws Exception {
        // 1. Create a User with admin + user roles
        User user = new User("alice@example.com", "password123", "Alice Smith", "1234567890");
        user.getRoles().add(com.example.ticketbooking.entity.enums.RoleType.ROLE_ADMIN);
        user = userRepository.save(user);

        String token = "Bearer " + jwtTokenProvider.generateToken(user.getId(), user.getEmail(), List.of("ROLE_ADMIN", "ROLE_USER"));

        // 2. Create Movie
        MovieRequest movieReq = new MovieRequest("The Dark Knight", "Batman vs Joker", 152, "Action", "English");
        MvcResult movieRes = mockMvc.perform(post("/api/movies")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(movieReq)))
                .andExpect(status().isCreated()).andReturn();
        UUID movieId = UUID.fromString(objectMapper.readTree(movieRes.getResponse().getContentAsString()).get("data").get("id").asText());

        // 3. Create Venue, Screen & Seat
        VenueRequest venueReq = new VenueRequest("INOX Central", "Mumbai", "Nariman Point");
        MvcResult venueRes = mockMvc.perform(post("/api/venues")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(venueReq)))
                .andExpect(status().isCreated()).andReturn();
        UUID venueId = UUID.fromString(objectMapper.readTree(venueRes.getResponse().getContentAsString()).get("data").get("id").asText());

        ScreenRequest screenReq = new ScreenRequest(venueId, "Screen 1", 100);
        MvcResult screenRes = mockMvc.perform(post("/api/venues/screens")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(screenReq)))
                .andExpect(status().isCreated()).andReturn();
        UUID screenId = UUID.fromString(objectMapper.readTree(screenRes.getResponse().getContentAsString()).get("data").get("id").asText());

        SeatRequest seatReq1 = new SeatRequest(screenId, "B", 1, SeatType.REGULAR);
        SeatRequest seatReq2 = new SeatRequest(screenId, "B", 2, SeatType.REGULAR);
        mockMvc.perform(post("/api/venues/screens/seats").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(seatReq1))).andExpect(status().isCreated());
        mockMvc.perform(post("/api/venues/screens/seats").header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(seatReq2))).andExpect(status().isCreated());

        // 4. Create Show
        LocalDateTime startTime = LocalDateTime.now().plusDays(2);
        LocalDateTime endTime = startTime.plusMinutes(152);
        ShowRequest showReq = new ShowRequest(movieId, screenId, startTime, endTime, new BigDecimal("300.00"));
        MvcResult showRes = mockMvc.perform(post("/api/shows")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(showReq)))
                .andExpect(status().isCreated()).andReturn();
        UUID showId = UUID.fromString(objectMapper.readTree(showRes.getResponse().getContentAsString()).get("data").get("id").asText());

        // 5. Query Seat Availability Map for Show (Public)
        MvcResult seatMapRes = mockMvc.perform(get("/api/shows/" + showId + "/seats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSeats").value(2))
                .andExpect(jsonPath("$.data.availableSeats").value(2))
                .andReturn();

        JsonNode seatMapNode = objectMapper.readTree(seatMapRes.getResponse().getContentAsString());
        UUID showSeatId1 = UUID.fromString(seatMapNode.get("data").get("seats").get(0).get("showSeatId").asText());
        UUID showSeatId2 = UUID.fromString(seatMapNode.get("data").get("seats").get(1).get("showSeatId").asText());

        // 6. Book Seat 1
        BookingCreateRequest bookingReq = new BookingCreateRequest(user.getId(), showId, List.of(showSeatId1));
        MvcResult bookingRes = mockMvc.perform(post("/api/bookings")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bookingReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.totalAmount").value(300.00))
                .andReturn();

        UUID bookingId = UUID.fromString(objectMapper.readTree(bookingRes.getResponse().getContentAsString()).get("data").get("id").asText());

        // 7. Verify Seat Map reflects only 1 seat available now
        mockMvc.perform(get("/api/shows/" + showId + "/seats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableSeats").value(1));

        // 8. Attempt to double-book Seat 1 -> MUST FAIL with 409 Conflict
        BookingCreateRequest duplicateReq = new BookingCreateRequest(user.getId(), showId, List.of(showSeatId1));
        mockMvc.perform(post("/api/bookings")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        // 9. Cancel Booking and verify seat becomes AVAILABLE again
        mockMvc.perform(post("/api/bookings/" + bookingId + "/cancel")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        mockMvc.perform(get("/api/shows/" + showId + "/seats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.availableSeats").value(2));
    }
}
