package com.example.ticketbooking.repository;

import com.example.ticketbooking.entity.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VenueRepository extends JpaRepository<Venue, UUID> {
    List<Venue> findByCityIgnoreCase(String city);
}
