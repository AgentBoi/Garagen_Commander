package de.randomcommander.api.web;

import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RestClientResponseException.class)
    ResponseEntity<ApiError> handleScryfallError(RestClientResponseException exception) {
        HttpStatusCode upstreamStatus = exception.getStatusCode();
        HttpStatus status = upstreamStatus.value() == HttpStatus.NOT_FOUND.value()
                ? HttpStatus.NOT_FOUND
                : upstreamStatus.is4xxClientError() ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY;

        return ResponseEntity.status(status)
                .body(new ApiError(
                        status.value(),
                        "Scryfall request failed.",
                        Instant.now()
                ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException exception) {
        HttpStatusCode status = exception.getStatusCode();
        return ResponseEntity.status(status)
                .body(new ApiError(
                        status.value(),
                        exception.getReason() == null ? "Request failed." : exception.getReason(),
                        Instant.now()
                ));
    }

    @ExceptionHandler(ResourceAccessException.class)
    ResponseEntity<ApiError> handleUnavailableUpstream(ResourceAccessException exception) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(new ApiError(
                        HttpStatus.BAD_GATEWAY.value(),
                        "Scryfall is currently unavailable.",
                        Instant.now()
                ));
    }

    public record ApiError(int status, String message, Instant timestamp) {
    }
}
