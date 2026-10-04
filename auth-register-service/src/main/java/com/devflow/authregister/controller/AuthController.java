package com.devflow.authregister.controller;

import java.net.URI;

import com.devflow.authregister.dto.CurrentUserResponse;
import com.devflow.authregister.dto.RegisterRequest;
import com.devflow.authregister.dto.RegisteredUserResponse;
import com.devflow.authregister.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RegistrationService registrationService;

    public AuthController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisteredUserResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisteredUserResponse response = registrationService.register(request);
        URI location = URI.create("/api/auth/users/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping("/me")
    public CurrentUserResponse currentUser(@AuthenticationPrincipal Jwt jwt) {
        return registrationService.currentUser(jwt);
    }
}
