package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.request.MovieRequest;
import com.example.ticketbooking.dto.response.MovieResponse;
import com.example.ticketbooking.entity.Movie;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.repository.MovieRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class MovieService {

    private final MovieRepository movieRepository;

    public MovieService(MovieRepository movieRepository) {
        this.movieRepository = movieRepository;
    }

    public List<MovieResponse> getAllMovies() {
        return movieRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public MovieResponse getMovieById(UUID id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with id: " + id));
        return mapToResponse(movie);
    }

    public List<MovieResponse> searchMoviesByTitle(String query) {
        return movieRepository.findByTitleContainingIgnoreCase(query)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public MovieResponse createMovie(MovieRequest request) {
        Movie movie = new Movie(
                request.title(),
                request.description(),
                request.durationMinutes(),
                request.genre(),
                request.language()
        );
        Movie saved = movieRepository.save(movie);
        return mapToResponse(saved);
    }

    @Transactional
    public MovieResponse updateMovie(UUID id, MovieRequest request) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with id: " + id));

        movie.setTitle(request.title());
        movie.setDescription(request.description());
        movie.setDurationMinutes(request.durationMinutes());
        movie.setGenre(request.genre());
        movie.setLanguage(request.language());

        return mapToResponse(movie);
    }

    @Transactional
    public void deleteMovie(UUID id) {
        if (!movieRepository.existsById(id)) {
            throw new ResourceNotFoundException("Movie not found with id: " + id);
        }
        movieRepository.deleteById(id);
    }

    private MovieResponse mapToResponse(Movie movie) {
        return new MovieResponse(
                movie.getId(),
                movie.getTitle(),
                movie.getDescription(),
                movie.getDurationMinutes(),
                movie.getGenre(),
                movie.getLanguage(),
                movie.getCreatedAt()
        );
    }
}
