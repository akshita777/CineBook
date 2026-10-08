package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.request.ShowRequest;
import com.example.ticketbooking.dto.response.ShowResponse;
import com.example.ticketbooking.entity.Movie;
import com.example.ticketbooking.entity.Screen;
import com.example.ticketbooking.entity.Seat;
import com.example.ticketbooking.entity.Show;
import com.example.ticketbooking.entity.ShowSeat;
import com.example.ticketbooking.exception.BadRequestException;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.repository.MovieRepository;
import com.example.ticketbooking.repository.ScreenRepository;
import com.example.ticketbooking.repository.SeatRepository;
import com.example.ticketbooking.repository.ShowRepository;
import com.example.ticketbooking.repository.ShowSeatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ShowService {

    private final ShowRepository showRepository;
    private final MovieRepository movieRepository;
    private final ScreenRepository screenRepository;
    private final SeatRepository seatRepository;
    private final ShowSeatRepository showSeatRepository;

    public ShowService(ShowRepository showRepository,
                       MovieRepository movieRepository,
                       ScreenRepository screenRepository,
                       SeatRepository seatRepository,
                       ShowSeatRepository showSeatRepository) {
        this.showRepository = showRepository;
        this.movieRepository = movieRepository;
        this.screenRepository = screenRepository;
        this.seatRepository = seatRepository;
        this.showSeatRepository = showSeatRepository;
    }

    public List<ShowResponse> getShowsByMovie(UUID movieId) {
        return showRepository.findByMovieId(movieId)
                .stream()
                .map(this::mapToShowResponse)
                .toList();
    }

    public ShowResponse getShowById(UUID id) {
        Show show = showRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found with id: " + id));
        return mapToShowResponse(show);
    }

    @Transactional
    public ShowResponse createShow(ShowRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new BadRequestException("Show end time must be after start time");
        }

        Movie movie = movieRepository.findById(request.movieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with id: " + request.movieId()));

        Screen screen = screenRepository.findById(request.screenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found with id: " + request.screenId()));

        Show show = new Show(movie, screen, request.startTime(), request.endTime());
        Show savedShow = showRepository.save(show);

        // Populate ShowSeats automatically based on screen's seat layout
        List<Seat> physicalSeats = seatRepository.findByScreenId(screen.getId());
        List<ShowSeat> showSeats = physicalSeats.stream()
                .map(seat -> new ShowSeat(savedShow, seat, request.defaultSeatPrice()))
                .toList();

        showSeatRepository.saveAll(showSeats);

        return mapToShowResponse(savedShow);
    }

    private ShowResponse mapToShowResponse(Show show) {
        return new ShowResponse(
                show.getId(),
                show.getMovie().getId(),
                show.getMovie().getTitle(),
                show.getScreen().getId(),
                show.getScreen().getName(),
                show.getScreen().getVenue().getName(),
                show.getStartTime(),
                show.getEndTime()
        );
    }
}
