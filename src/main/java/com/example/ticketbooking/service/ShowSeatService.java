package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.response.ShowSeatMapResponse;
import com.example.ticketbooking.dto.response.ShowSeatResponse;
import com.example.ticketbooking.entity.Show;
import com.example.ticketbooking.entity.ShowSeat;
import com.example.ticketbooking.entity.enums.SeatStatus;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.repository.ShowRepository;
import com.example.ticketbooking.repository.ShowSeatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ShowSeatService {

    private final ShowRepository showRepository;
    private final ShowSeatRepository showSeatRepository;

    public ShowSeatService(ShowRepository showRepository, ShowSeatRepository showSeatRepository) {
        this.showRepository = showRepository;
        this.showSeatRepository = showSeatRepository;
    }

    public ShowSeatMapResponse getSeatMapForShow(UUID showId) {
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with id: " + showId));

        List<ShowSeat> showSeats = showSeatRepository.findByShowIdWithSeatDetails(showId);

        Instant now = Instant.now();
        List<ShowSeatResponse> seatResponses = showSeats.stream()
                .map(ss -> {
                    SeatStatus effectiveStatus = ss.getStatus();
                    // If locked but lock expiration time has elapsed, display as AVAILABLE
                    if (effectiveStatus == SeatStatus.LOCKED && ss.getLockedUntil() != null && ss.getLockedUntil().isBefore(now)) {
                        effectiveStatus = SeatStatus.AVAILABLE;
                    }
                    return new ShowSeatResponse(
                            ss.getId(),
                            ss.getSeat().getId(),
                            ss.getSeat().getSeatRow(),
                            ss.getSeat().getSeatNumber(),
                            ss.getSeat().getSeatType(),
                            ss.getPrice(),
                            effectiveStatus
                    );
                })
                .toList();

        int totalSeats = seatResponses.size();
        int availableSeats = (int) seatResponses.stream()
                .filter(s -> s.status() == SeatStatus.AVAILABLE)
                .count();

        return new ShowSeatMapResponse(
                show.getId(),
                show.getMovie().getTitle(),
                show.getScreen().getName(),
                show.getScreen().getVenue().getName(),
                show.getStartTime(),
                totalSeats,
                availableSeats,
                seatResponses
        );
    }
}
