package com.devflow.authregister.exceptions;

public class RegistrationConflictException extends RuntimeException {

    public RegistrationConflictException(String message) {
        super(message);
    }
}
