package com.devflow.authregister.dto;

import java.time.Instant;
import java.util.UUID;
import java.util.List;

public record RegisteredUserResponse(
        UUID id,
        String username,
        String email,
        String firstName,
        String lastName,
        String role,
        boolean enabled,
        Instant createdAt,
        List<String> roles) {
}
