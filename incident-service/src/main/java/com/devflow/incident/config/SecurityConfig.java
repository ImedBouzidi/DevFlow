package com.devflow.incident.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakJwtGrantedAuthoritiesConverter());
        return converter;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter)
            throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt ->
                    jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)))
                .authorizeHttpRequests(auth -> auth
                        // Actuator probes accessible without auth
                        .requestMatchers("/actuator/health/**").permitAll()
                        // Developers can read only their own assignment queue.
                        .requestMatchers(HttpMethod.GET, "/api/incidents/assigned-to-me").hasRole("DEVELOPER")
                        // General incident reads are limited to operational roles.
                        .requestMatchers(HttpMethod.GET, "/api/incidents/**").hasAnyRole("SUPPORT", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/assignment").hasAnyRole("MANAGER", "ADMIN")
                        // Mutations for developers and admins
                        .requestMatchers(HttpMethod.POST, "/api/incidents").hasAnyRole("DEVELOPER", "ADMIN", "SUPPORT")
                        .requestMatchers(HttpMethod.PUT, "/api/incidents/**").hasAnyRole("DEVELOPER", "ADMIN", "SUPPORT")
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/**").hasAnyRole("DEVELOPER", "ADMIN", "SUPPORT")
                        .requestMatchers(HttpMethod.DELETE, "/api/incidents/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .build();
    }

    @Bean
    CorsConfigurationSource corsSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
