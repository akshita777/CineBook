package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.request.ScreenRequest;
import com.example.ticketbooking.dto.request.SeatRequest;
import com.example.ticketbooking.dto.request.VenueRequest;
import com.example.ticketbooking.dto.response.ScreenResponse;
import com.example.ticketbooking.dto.response.SeatResponse;
import com.example.ticketbooking.dto.response.VenueResponse;
import com.example.ticketbooking.entity.Screen;
import com.example.ticketbooking.entity.Seat;
import com.example.ticketbooking.entity.Venue;
import com.example.ticketbooking.entity.enums.SeatType;
import com.example.ticketbooking.exception.ConflictException;
import com.example.ticketbooking.exception.ResourceNotFoundException;
import com.example.ticketbooking.repository.ScreenRepository;
import com.example.ticketbooking.repository.SeatRepository;
import com.example.ticketbooking.repository.VenueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class VenueService {

    private final VenueRepository venueRepository;
    private final ScreenRepository screenRepository;
    private final SeatRepository seatRepository;

    public VenueService(VenueRepository venueRepository,
                        ScreenRepository screenRepository,
                        SeatRepository seatRepository) {
        this.venueRepository = venueRepository;
        this.screenRepository = screenRepository;
        this.seatRepository = seatRepository;
    }

    public List<VenueResponse> getAllVenues() {
        return venueRepository.findAll()
                .stream()
                .map(this::mapVenueToResponse)
                .toList();
    }

    public VenueResponse getVenueById(UUID id) {
        Venue venue = venueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found with id: " + id));
        return mapVenueToResponse(venue);
    }

    @Transactional
    public VenueResponse createVenue(VenueRequest request) {
        Venue venue = new Venue(request.name(), request.city(), request.address());
        Venue saved = venueRepository.save(venue);
        return mapVenueToResponse(saved);
    }

    public List<ScreenResponse> getScreensByVenue(UUID venueId) {
        if (!venueRepository.existsById(venueId)) {
            throw new ResourceNotFoundException("Venue not found with id: " + venueId);
        }
        return screenRepository.findByVenueId(venueId)
                .stream()
                .map(this::mapScreenToResponse)
                .toList();
    }

    @Transactional
    public ScreenResponse addScreenToVenue(ScreenRequest request) {
        Venue venue = venueRepository.findById(request.venueId())
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found with id: " + request.venueId()));

        Screen screen = new Screen(venue, request.name(), request.totalCapacity());
        Screen saved = screenRepository.save(screen);
        return mapScreenToResponse(saved);
    }

    public List<SeatResponse> getSeatsByScreen(UUID screenId) {
        if (!screenRepository.existsById(screenId)) {
            throw new ResourceNotFoundException("Screen not found with id: " + screenId);
        }
        return seatRepository.findByScreenId(screenId)
                .stream()
                .map(this::mapSeatToResponse)
                .toList();
    }

    @Transactional
    public SeatResponse addSeatToScreen(SeatRequest request) {
        Screen screen = screenRepository.findById(request.screenId())
                .orElseThrow(() -> new ResourceNotFoundException("Screen not found with id: " + request.screenId()));

        SeatType type = request.seatType() != null ? request.seatType() : SeatType.REGULAR;
        Seat seat = new Seat(screen, request.seatRow(), request.seatNumber(), type);

        try {
            Seat saved = seatRepository.save(seat);
            return mapSeatToResponse(saved);
        } catch (Exception ex) {
            throw new ConflictException("Seat " + request.seatRow() + request.seatNumber() + " already exists in this screen.");
        }
    }

    private VenueResponse mapVenueToResponse(Venue v) {
        return new VenueResponse(v.getId(), v.getName(), v.getCity(), v.getAddress());
    }

    private ScreenResponse mapScreenToResponse(Screen s) {
        return new ScreenResponse(s.getId(), s.getVenue().getId(), s.getVenue().getName(), s.getName(), s.getTotalCapacity());
    }

    private SeatResponse mapSeatToResponse(Seat s) {
        return new SeatResponse(s.getId(), s.getScreen().getId(), s.getSeatRow(), s.getSeatNumber(), s.getSeatType());
    }
}
