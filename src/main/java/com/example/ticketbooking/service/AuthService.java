package com.example.ticketbooking.service;

import com.example.ticketbooking.dto.request.LoginRequest;
import com.example.ticketbooking.dto.request.RegisterRequest;
import com.example.ticketbooking.dto.response.AuthResponse;
import com.example.ticketbooking.entity.User;
import com.example.ticketbooking.entity.enums.RoleType;
import com.example.ticketbooking.exception.BadRequestException;
import com.example.ticketbooking.exception.ConflictException;
import com.example.ticketbooking.repository.UserRepository;
import com.example.ticketbooking.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email().toLowerCase().trim())) {
            throw new ConflictException("An account already exists with email: " + request.email());
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        User user = new User(
                request.email().toLowerCase().trim(),
                encodedPassword,
                request.fullName(),
                request.phoneNumber()
        );

        User savedUser = userRepository.save(user);

        List<String> roleNames = savedUser.getRoles().stream()
                .map(Enum::name)
                .toList();

        String token = tokenProvider.generateToken(savedUser.getId(), savedUser.getEmail(), roleNames);

        return AuthResponse.of(
                token,
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRoles().stream().map(Enum::name).collect(Collectors.toSet())
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadRequestException("Invalid email or password");
        }

        List<String> roleNames = user.getRoles().stream()
                .map(Enum::name)
                .toList();

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), roleNames);

        return AuthResponse.of(
                token,
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRoles().stream().map(Enum::name).collect(Collectors.toSet())
        );
    }
}
