package com.devflow.authregister.dto;

import java.time.Instant;
import java.util.UUID;

public record RegisteredUserResponse(
        UUID id,
        String username,
        String email,
        String firstName,
        String lastName,
        String role,
        boolean enabled,
        Instant createdAt) {
}
