package com.devflow.gateway.config;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

public final class KeycloakJwtAuthenticationConverter
        implements Converter<Jwt, org.springframework.security.authentication.AbstractAuthenticationToken> {

    private final JwtAuthenticationConverter delegate = new JwtAuthenticationConverter();
    private final JwtGrantedAuthoritiesConverter scopeConverter = new JwtGrantedAuthoritiesConverter();

    public KeycloakJwtAuthenticationConverter() {
        delegate.setJwtGrantedAuthoritiesConverter(this::extractAuthorities);
    }

    @Override
    public org.springframework.security.authentication.AbstractAuthenticationToken convert(Jwt jwt) {
        return delegate.convert(jwt);
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Set<GrantedAuthority> authorities = new LinkedHashSet<>(scopeConverter.convert(jwt));

        Object realmAccessClaim = jwt.getClaim("realm_access");
        if (realmAccessClaim instanceof Map<?, ?> realmAccess) {
            Object rolesClaim = realmAccess.get("roles");
            if (rolesClaim instanceof Collection<?> roles) {
                roles.stream()
                        .map(String::valueOf)
                        .filter(role -> !role.isBlank())
                        .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
                        .map(SimpleGrantedAuthority::new)
                        .forEach(authorities::add);
            }
        }

        return List.copyOf(new ArrayList<>(authorities));
    }
}
