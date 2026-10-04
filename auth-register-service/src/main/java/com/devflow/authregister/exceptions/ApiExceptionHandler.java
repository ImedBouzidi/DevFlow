package com.devflow.authregister.exceptions;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "One or more request fields are invalid",
                request);
        Map<String, String> errors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
                errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ProblemDetail handleConstraintViolation(ConstraintViolationException exception, HttpServletRequest request) {
        return problem(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "One or more request values are invalid",
                request);
    }

    @ExceptionHandler(RegistrationConflictException.class)
    ProblemDetail handleConflict(RegistrationConflictException exception, HttpServletRequest request) {
        return problem(HttpStatus.CONFLICT, "Account conflict", exception.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail handleDataConflict(DataIntegrityViolationException exception, HttpServletRequest request) {
        return problem(
                HttpStatus.CONFLICT,
                "Account conflict",
                "An account with the supplied unique values already exists",
                request);
    }

    @ExceptionHandler(CurrentUserNotFoundException.class)
    ProblemDetail handleCurrentUserNotFound(
            CurrentUserNotFoundException exception,
            HttpServletRequest request) {
        return problem(HttpStatus.NOT_FOUND, "User not found", exception.getMessage(), request);
    }

    @ExceptionHandler(IdentityProviderException.class)
    ProblemDetail handleIdentityProvider(IdentityProviderException exception, HttpServletRequest request) {
        log.error("Identity provider request failed for {}", request.getRequestURI(), exception);
        return problem(
                HttpStatus.BAD_GATEWAY,
                "Identity provider unavailable",
                "The identity provider could not complete the request",
                request);
    }

    private ProblemDetail problem(
            HttpStatus status,
            String title,
            String detail,
            HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setInstance(URI.create(request.getRequestURI()));
        return problem;
    }
}
