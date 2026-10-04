package com.devflow.authregister.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        @Pattern(
                regexp = "^[A-Za-z0-9._-]+$",
                message = "Username may contain letters, numbers, dots, underscores, and hyphens")
        String username,

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 254, message = "Email is too long")
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 12, max = 72, message = "Password must be between 12 and 72 characters")
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$",
                message = "Password must contain uppercase, lowercase, number, and special characters")
        String password,

        @NotBlank(message = "First name is required")
        @Size(max = 100, message = "First name is too long")
        String firstName,

        @NotBlank(message = "Last name is required")
        @Size(max = 100, message = "Last name is too long")
        String lastName) {
}
