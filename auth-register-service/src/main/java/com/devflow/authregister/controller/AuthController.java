package com.devflow.authregister.controller;

import java.net.URI;
import java.util.List;

import com.devflow.authregister.dto.CurrentUserResponse;
import com.devflow.authregister.dto.ChangePasswordRequest;
import com.devflow.authregister.dto.AdminCreateUserRequest;
import com.devflow.authregister.dto.AdminUpdateUserRequest;
import com.devflow.authregister.dto.RegisteredUserResponse;
import com.devflow.authregister.dto.UpdateCurrentUserRequest;
import com.devflow.authregister.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

    @GetMapping("/users")
    public List<RegisteredUserResponse> users() {
        return registrationService.users();
    }

    @PostMapping("/users")
    public ResponseEntity<RegisteredUserResponse> createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        RegisteredUserResponse response = registrationService.createUser(request);
        URI location = URI.create("/api/auth/users/" + response.id());
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/users/{id}")
    public RegisteredUserResponse updateUser(
            @PathVariable java.util.UUID id,
            @Valid @RequestBody AdminUpdateUserRequest request) {
        return registrationService.updateUser(id, request);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable java.util.UUID id) {
        registrationService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public CurrentUserResponse currentUser(@AuthenticationPrincipal Jwt jwt) {
        return registrationService.currentUser(jwt);
    }

    @PutMapping("/me")
    public CurrentUserResponse updateCurrentUser(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateCurrentUserRequest request) {
        return registrationService.updateCurrentUser(jwt, request);
    }

    @PostMapping("/me/password")
    public ResponseEntity<Void> changeCurrentPassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request) {
        registrationService.changeCurrentPassword(jwt, request);
        return ResponseEntity.noContent().build();
    }
}
