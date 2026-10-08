package com.devflow.authregister.seeder;

import com.devflow.authregister.auth.KeycloakAdminClient;
import com.devflow.authregister.config.KeycloakProperties;
import com.devflow.authregister.exceptions.RegistrationConflictException;
import com.devflow.authregister.user.AppUser;
import com.devflow.authregister.user.AppUserRepository;
import com.devflow.authregister.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds a single admin user into Keycloak and the local {@code app_users} table
 * on service startup. The operation is <em>idempotent</em>:
 * <ul>
 * <li>If {@code ADMIN_SEED_USERNAME} is blank the seeder is silently
 * skipped.</li>
 * <li>If the admin already exists locally nothing is created.</li>
 * <li>If Keycloak already has the user, its identity is resolved and local-DB
 * persistence is still attempted.</li>
 * </ul>
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final KeycloakAdminClient keycloakAdminClient;
    private final AppUserRepository userRepository;
    private final KeycloakProperties properties;

    public AdminSeeder(
            KeycloakAdminClient keycloakAdminClient,
            AppUserRepository userRepository,
            KeycloakProperties properties) {
        this.keycloakAdminClient = keycloakAdminClient;
        this.userRepository = userRepository;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(String... args) {
        String username = properties.adminSeedUsername();
        String email = properties.adminSeedEmail();
        String password = properties.adminSeedPassword();
        String roleName = properties.adminSeedRole();

        if (username == null || username.isBlank()) {
            log.warn("AdminSeeder: ADMIN_SEED_USERNAME is not set — skipping admin seeding.");
            return;
        }

        String normalizedUsername = username.trim().toLowerCase();

        if (userRepository.findByUsernameIgnoreCase(normalizedUsername).isPresent()) {
            log.info("AdminSeeder: admin user '{}' already exists — skipping.", normalizedUsername);
            return;
        }

        log.info("AdminSeeder: seeding admin user '{}'…", normalizedUsername);

        // --- Step 1: create the Keycloak identity ---
        String keycloakUserId;
        boolean keycloakUserCreated = false;
        try {
            keycloakUserId = keycloakAdminClient.createUser(
                    normalizedUsername,
                    email.trim().toLowerCase(),
                    "Admin",
                    "User",
                    password);
                    keycloakUserCreated = true;
            log.debug("AdminSeeder: Keycloak user created with id '{}'.", keycloakUserId);
        } catch (RegistrationConflictException e) {
            log.warn("AdminSeeder: Keycloak user '{}' already exists — will attempt local persistence.",
                    normalizedUsername);
                    keycloakUserId = keycloakAdminClient.findUserIdByUsername(normalizedUsername);
        }

        // --- Step 2: assign the admin role in Keycloak ---
        try {
            keycloakAdminClient.assignRole(keycloakUserId, roleName);
            log.debug("AdminSeeder: role '{}' assigned on Keycloak.", roleName);
        } catch (RuntimeException e) {
            log.error("AdminSeeder: failed to assign role '{}' — rolling back Keycloak user '{}'.", roleName,
                    keycloakUserId, e);
            if (keycloakUserCreated) {
                keycloakAdminClient.deleteUser(keycloakUserId);
            }
            throw e;
        }

        // --- Step 3: persist locally ---
        try {
            UserRole role = UserRole.valueOf(roleName);
            userRepository.saveAndFlush(AppUser.create(
                    keycloakUserId,
                    normalizedUsername,
                    email.trim().toLowerCase(),
                    "Admin",
                    "User",
                    role));
            log.info("AdminSeeder: admin user '{}' seeded successfully.", normalizedUsername);
        } catch (RuntimeException e) {
            log.error("AdminSeeder: local persistence failed for Keycloak user '{}'.", keycloakUserId, e);
            if (keycloakUserCreated) {
                keycloakAdminClient.deleteUser(keycloakUserId);
            }
            throw e;
        }
    }
}
