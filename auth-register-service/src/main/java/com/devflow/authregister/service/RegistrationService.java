package com.devflow.authregister.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import com.devflow.authregister.auth.KeycloakAdminClient;
import com.devflow.authregister.dto.AdminCreateUserRequest;
import com.devflow.authregister.dto.AdminUpdateUserRequest;
import com.devflow.authregister.dto.ChangePasswordRequest;
import com.devflow.authregister.dto.CurrentUserResponse;
import com.devflow.authregister.dto.RegisterRequest;
import com.devflow.authregister.dto.RegisteredUserResponse;
import com.devflow.authregister.dto.UpdateCurrentUserRequest;
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
        return provision(
            request.username(), request.email(), request.firstName(), request.lastName(), request.password(),
            Set.of(UserRole.valueOf(keycloakProperties.defaultRole())), true);
        }

        @Transactional
        public RegisteredUserResponse createUser(AdminCreateUserRequest request) {
        return provision(
            request.username(), request.email(), request.firstName(), request.lastName(), request.password(),
            request.roles(), false);
        }

        @Transactional(readOnly = true)
        public List<RegisteredUserResponse> users() {
        return userRepository.findAll().stream().map(this::toRegistrationResponse).toList();
        }

        @Transactional
        public CurrentUserResponse updateCurrentUser(Jwt jwt, UpdateCurrentUserRequest request) {
        AppUser user = findCurrentAppUser(jwt);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmailIgnoreCase(email)
            .filter(existing -> !existing.getId().equals(user.getId()))
            .ifPresent(existing -> { throw new RegistrationConflictException("That email is already in use"); });
        String firstName = request.firstName().trim();
        String lastName = request.lastName().trim();
        keycloakAdminClient.updateUser(
            user.getKeycloakUserId(), user.getUsername(), email, firstName, lastName, user.isEnabled(),
            email.equalsIgnoreCase(user.getEmail()));
        user.updateContactInfo(email, firstName, lastName);
        return toCurrentUserResponse(userRepository.saveAndFlush(user));
        }

        public void changeCurrentPassword(Jwt jwt, ChangePasswordRequest request) {
        AppUser user = findCurrentAppUser(jwt);
        if (request.currentPassword().equals(request.newPassword())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST, "New password must differ from the current password");
        }
        keycloakAdminClient.verifyPassword(user.getUsername(), request.currentPassword());
        keycloakAdminClient.updatePassword(user.getKeycloakUserId(), request.newPassword());
        }

        @Transactional
        public RegisteredUserResponse updateUser(UUID id, AdminUpdateUserRequest request) {
        AppUser user = userRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmailIgnoreCase(email)
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> { throw new RegistrationConflictException("That email is already in use"); });
        Set<UserRole> roles = request.roles().stream().sorted().collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        keycloakAdminClient.updateUser(
            user.getKeycloakUserId(), user.getUsername(), email, request.firstName().trim(),
            request.lastName().trim(), request.enabled());
        keycloakAdminClient.setRoles(user.getKeycloakUserId(), roles.stream().map(Enum::name).collect(Collectors.toSet()));
        user.updateProfile(email, request.firstName().trim(), request.lastName().trim(), roles, request.enabled());
        return toRegistrationResponse(userRepository.saveAndFlush(user));
        }

        @Transactional
        public void deleteUser(UUID id) {
        AppUser user = userRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        if (user.getRole() == UserRole.ROLE_ADMIN && userRepository.countByRole(UserRole.ROLE_ADMIN) <= 1) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT, "The last administrator cannot be removed");
        }
        keycloakAdminClient.deleteUser(user.getKeycloakUserId());
        userRepository.delete(user);
        }

        private RegisteredUserResponse provision(
            String rawUsername,
            String rawEmail,
            String rawFirstName,
            String rawLastName,
            String password,
            Set<UserRole> roles,
            boolean useDefaultRoleMapping) {
        String username = normalizeUsername(rawUsername);
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        String firstName = rawFirstName.trim();
        String lastName = rawLastName.trim();

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
                        password);
            keycloakUserCreated = true;
            if (useDefaultRoleMapping) {
                keycloakAdminClient.assignDefaultRole(keycloakUserId);
            } else {
                keycloakAdminClient.setRoles(keycloakUserId, roles.stream().map(Enum::name).collect(Collectors.toSet()));
            }
        } catch (RuntimeException exception) {
            if (keycloakUserCreated && keycloakUserId != null) {
                compensateKeycloakUser(keycloakUserId);
            }
            throw exception;
        }

        try {
            AppUser user = userRepository.saveAndFlush(AppUser.create(
                    keycloakUserId,
                    username,
                    email,
                    firstName,
                    lastName,
                    roles));
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

        private AppUser findCurrentAppUser(Jwt jwt) {
        String subject = jwt.getSubject();
        String username = jwt.getClaimAsString("preferred_username");
        return userRepository.findByKeycloakUserId(subject)
            .or(() -> username == null ? java.util.Optional.empty() : userRepository.findByUsernameIgnoreCase(username))
            .orElseThrow(() -> new CurrentUserNotFoundException("Your account is not available for profile updates"));
        }

        private CurrentUserResponse toCurrentUserResponse(AppUser user) {
        return new CurrentUserResponse(
            user.getId(), user.getUsername(), user.getEmail(), user.getFirstName(), user.getLastName(),
            user.getRole().name(), user.isEnabled(), user.getCreatedAt());
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
                user.getCreatedAt(),
                user.getRoles().stream().map(Enum::name).sorted().toList());
    }

    private void compensateKeycloakUser(String keycloakUserId) {
        try {
            keycloakAdminClient.deleteUser(keycloakUserId);
        } catch (RuntimeException compensationFailure) {
            log.error("Failed to compensate Keycloak user {}", keycloakUserId, compensationFailure);
        }
    }
}
