package com.devflow.authregister.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.Map;

import com.devflow.authregister.auth.KeycloakAdminClient;
import com.devflow.authregister.dto.CurrentUserResponse;
import com.devflow.authregister.dto.RegisterRequest;
import com.devflow.authregister.dto.RegisteredUserResponse;
import com.devflow.authregister.exceptions.CurrentUserNotFoundException;
import com.devflow.authregister.exceptions.RegistrationConflictException;
import com.devflow.authregister.user.AppUser;
import com.devflow.authregister.user.AppUserRepository;
import com.devflow.authregister.user.UserRole;
import com.devflow.authregister.config.KeycloakProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationService.class);

    private final AppUserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final KeycloakProperties keycloakProperties;

    public RegistrationService(
            AppUserRepository userRepository,
            KeycloakAdminClient keycloakAdminClient,
            KeycloakProperties keycloakProperties) {
        this.userRepository = userRepository;
        this.keycloakAdminClient = keycloakAdminClient;
        this.keycloakProperties = keycloakProperties;
    }

    @Transactional
    public RegisteredUserResponse register(RegisterRequest request) {
        String username = normalizeUsername(request.username());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String firstName = request.firstName().trim();
        String lastName = request.lastName().trim();

        if (userRepository.findByUsernameIgnoreCase(username).isPresent()
                || userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new RegistrationConflictException("An account with this username or email already exists");
        }

        String keycloakUserId = null;
        boolean keycloakUserCreated = false;
        try {
            keycloakUserId = keycloakAdminClient.createUser(
                    username,
                    email,
                    firstName,
                    lastName,
                    request.password());
            keycloakUserCreated = true;
            keycloakAdminClient.assignDefaultRole(keycloakUserId);
        } catch (RuntimeException exception) {
            if (keycloakUserCreated && keycloakUserId != null) {
                compensateKeycloakUser(keycloakUserId);
            }
            throw exception;
        }

        try {
            UserRole defaultRole = UserRole.valueOf(keycloakProperties.defaultRole());
            AppUser user = userRepository.saveAndFlush(AppUser.create(
                    keycloakUserId,
                    username,
                    email,
                    firstName,
                    lastName,
                    defaultRole));
            return toRegistrationResponse(user);
        } catch (DataIntegrityViolationException exception) {
            compensateKeycloakUser(keycloakUserId);
            throw new RegistrationConflictException("An account with this username or email already exists");
        } catch (RuntimeException exception) {
            compensateKeycloakUser(keycloakUserId);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse currentUser(Jwt jwt) {
        String subject = jwt.getSubject();
        String preferredUsername = jwt.getClaimAsString("preferred_username");
        AppUser user = userRepository.findByKeycloakUserId(subject)
                .or(() -> preferredUsername == null
                        ? java.util.Optional.empty()
                        : userRepository.findByUsernameIgnoreCase(preferredUsername))
                .orElse(null);

        if (user != null) {
            return new CurrentUserResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getFirstName(),
                    user.getLastName(),
                    user.getRole().name(),
                    user.isEnabled(),
                    user.getCreatedAt());
        }

        if (preferredUsername == null || preferredUsername.startsWith("service-account-")) {
            throw new CurrentUserNotFoundException("The authenticated user is not registered locally");
        }

        String name = jwt.getClaimAsString("name");
        String firstName = jwt.getClaimAsString("given_name");
        String lastName = jwt.getClaimAsString("family_name");
        if ((firstName == null || firstName.isBlank()) && name != null) {
            String[] nameParts = name.trim().split("\\s+", 2);
            firstName = nameParts[0];
            lastName = nameParts.length > 1 ? nameParts[1] : null;
        }

        return new CurrentUserResponse(
                UUID.nameUUIDFromBytes(("devflow:" + subject).getBytes(StandardCharsets.UTF_8)),
                preferredUsername,
                jwt.getClaimAsString("email"),
                firstName == null ? preferredUsername : firstName,
                lastName == null ? "" : lastName,
                roleFromToken(jwt),
                true,
                null);
    }

    private String roleFromToken(Jwt jwt) {
        Object realmAccessClaim = jwt.getClaim("realm_access");
        if (realmAccessClaim instanceof Map<?, ?> realmAccess) {
            Object rolesClaim = realmAccess.get("roles");
            if (rolesClaim instanceof Iterable<?> roles) {
                for (Object roleClaim : roles) {
                    String role = String.valueOf(roleClaim);
                    try {
                        UserRole.valueOf(role);
                        return role;
                    } catch (IllegalArgumentException ignored) {
                        // Ignore unrelated Keycloak realm roles and keep looking.
                    }
                }
            }
        }
        return UserRole.ROLE_SUPPORT.name();
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private RegisteredUserResponse toRegistrationResponse(AppUser user) {
        return new RegisteredUserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.isEnabled(),
                user.getCreatedAt());
    }

    private void compensateKeycloakUser(String keycloakUserId) {
        try {
            keycloakAdminClient.deleteUser(keycloakUserId);
        } catch (RuntimeException compensationFailure) {
            log.error("Failed to compensate Keycloak user {}", keycloakUserId, compensationFailure);
        }
    }
}
