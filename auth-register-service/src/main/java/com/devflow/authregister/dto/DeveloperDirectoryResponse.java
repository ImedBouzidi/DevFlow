package com.devflow.authregister.dto;

import java.util.UUID;

public record DeveloperDirectoryResponse(
        UUID id,
        String username,
        String firstName,
        String lastName
) {}