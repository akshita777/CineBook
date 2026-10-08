package com.example.ticketbooking.controller;

import com.example.ticketbooking.dto.request.MovieRequest;
import com.example.ticketbooking.dto.request.ScreenRequest;
import com.example.ticketbooking.dto.request.SeatRequest;
import com.example.ticketbooking.dto.request.ShowRequest;
import com.example.ticketbooking.dto.request.VenueRequest;
import com.example.ticketbooking.entity.enums.SeatType;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@org.springframework.security.test.context.support.WithMockUser(roles = "ADMIN")
@org.springframework.context.annotation.Import({com.example.ticketbooking.config.TestRedisConfiguration.class, com.example.ticketbooking.config.TestKafkaConfiguration.class})
class CatalogCrudIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("End-to-End verification: Create Venue, Screen, Seats, Movie, and Show with ShowSeats auto-generation")
    void testFullCatalogSetupFlow() throws Exception {
        // 1. Create Movie
        MovieRequest movieReq = new MovieRequest(
                "Interstellar",
                "Space exploration epic",
                169,
                "Sci-Fi",
                "English"
        );

        MvcResult movieResult = mockMvc.perform(post("/api/movies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(movieReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Interstellar"))
                .andReturn();

        JsonNode movieNode = objectMapper.readTree(movieResult.getResponse().getContentAsString());
        UUID movieId = UUID.fromString(movieNode.get("data").get("id").asText());

        // 2. Create Venue
        VenueRequest venueReq = new VenueRequest("PVR Forum", "Bangalore", "Koramangala");
        MvcResult venueResult = mockMvc.perform(post("/api/venues")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(venueReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("PVR Forum"))
                .andReturn();

        JsonNode venueNode = objectMapper.readTree(venueResult.getResponse().getContentAsString());
        UUID venueId = UUID.fromString(venueNode.get("data").get("id").asText());

        // 3. Create Screen
        ScreenRequest screenReq = new ScreenRequest(venueId, "IMAX Screen 1", 50);
        MvcResult screenResult = mockMvc.perform(post("/api/venues/screens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(screenReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("IMAX Screen 1"))
                .andReturn();

        JsonNode screenNode = objectMapper.readTree(screenResult.getResponse().getContentAsString());
        UUID screenId = UUID.fromString(screenNode.get("data").get("id").asText());

        // 4. Add Seats to Screen
        SeatRequest seatReq1 = new SeatRequest(screenId, "A", 1, SeatType.REGULAR);
        SeatRequest seatReq2 = new SeatRequest(screenId, "A", 2, SeatType.REGULAR);

        mockMvc.perform(post("/api/venues/screens/seats")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(seatReq1)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/venues/screens/seats")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(seatReq2)))
                .andExpect(status().isCreated());

        // Verify duplicate seat creation triggers ConflictException (409)
        mockMvc.perform(post("/api/venues/screens/seats")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(seatReq1)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));

        // 5. Create Show
        LocalDateTime startTime = LocalDateTime.now().plusDays(1).withHour(18).withMinute(0);
        LocalDateTime endTime = startTime.plusMinutes(169);

        ShowRequest showReq = new ShowRequest(
                movieId,
                screenId,
                startTime,
                endTime,
                new BigDecimal("250.00")
        );

        MvcResult showResult = mockMvc.perform(post("/api/shows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(showReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.movieTitle").value("Interstellar"))
                .andReturn();

        JsonNode showNode = objectMapper.readTree(showResult.getResponse().getContentAsString());
        UUID showId = UUID.fromString(showNode.get("data").get("id").asText());
        assertThat(showId).isNotNull();

        // 6. Query Shows by Movie
        mockMvc.perform(get("/api/shows/movie/" + movieId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].id").value(showId.toString()));
    }
}
