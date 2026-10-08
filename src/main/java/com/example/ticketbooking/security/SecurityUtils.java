package com.example.ticketbooking.security;

import com.example.ticketbooking.entity.User;
import com.example.ticketbooking.exception.UnauthorizedException;
import com.example.ticketbooking.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SecurityUtils {

    private final UserRepository userRepository;

    public SecurityUtils(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User is not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        String name = authentication.getName();
        return userRepository.findByEmail(name.toLowerCase().trim())
                .map(User::getId)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found in database: " + name));
    }

    public boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    public void validateUserAccess(UUID targetUserId, String actionDescription) {
        if (isAdmin()) {
            return;
        }
        UUID currentUserId = getCurrentUserId();
        if (!currentUserId.equals(targetUserId)) {
            throw new UnauthorizedException("You are not authorized to " + actionDescription);
        }
    }
}
