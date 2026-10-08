package com.example.ticketbooking.controller;

import com.example.ticketbooking.common.ApiResponse;
import com.example.ticketbooking.dto.request.MovieRequest;
import com.example.ticketbooking.dto.response.MovieResponse;
import com.example.ticketbooking.service.MovieService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

    private final MovieService movieService;

    public MovieController(MovieService movieService) {
        this.movieService = movieService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MovieResponse>>> getAllMovies(
            @RequestParam(required = false) String search) {
        List<MovieResponse> movies = (search != null && !search.isBlank())
                ? movieService.searchMoviesByTitle(search)
                : movieService.getAllMovies();
        return ResponseEntity.ok(ApiResponse.ok(movies));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MovieResponse>> getMovieById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(movieService.getMovieById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MovieResponse>> createMovie(@Valid @RequestBody MovieRequest request) {
        MovieResponse created = movieService.createMovie(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Movie created successfully", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MovieResponse>> updateMovie(
            @PathVariable UUID id,
            @Valid @RequestBody MovieRequest request) {
        MovieResponse updated = movieService.updateMovie(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Movie updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMovie(@PathVariable UUID id) {
        movieService.deleteMovie(id);
        return ResponseEntity.ok(ApiResponse.ok("Movie deleted successfully", null));
    }
}
