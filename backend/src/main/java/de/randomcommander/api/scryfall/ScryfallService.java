package de.randomcommander.api.scryfall;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScryfallService {

    private final RestClient restClient;
    private final ScryfallProperties properties;

    public ScryfallService(RestClient scryfallRestClient, ScryfallProperties properties) {
        this.restClient = scryfallRestClient;
        this.properties = properties;
    }

    public JsonNode randomCard(String query) {
        return get("/cards/random", "q", query);
    }

    public JsonNode namedCardExact(String name) {
        return get("/cards/named", "exact", name);
    }

    public JsonNode namedCardFuzzy(String name) {
        return get("/cards/named", "fuzzy", name);
    }

    public List<JsonNode> searchCards(String query) {
        List<JsonNode> cards = new ArrayList<>();
        JsonNode page = get("/cards/search", "q", query, "unique", "cards");
        int pageCount = 0;

        while (true) {
            page.path("data").forEach(cards::add);
            pageCount++;

            if (!page.path("has_more").asBoolean()) {
                return cards;
            }
            if (pageCount >= properties.maxSearchPages()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Scryfall search exceeded the configured page limit."
                );
            }

            String nextPage = page.path("next_page").asText();
            if (nextPage.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Scryfall returned an invalid next-page URL."
                );
            }
            URI nextPageUri = URI.create(nextPage);
            String expectedHost = URI.create(properties.baseUrl()).getHost();
            String receivedHost = nextPageUri.getHost();
            if (expectedHost == null || receivedHost == null
                    || !expectedHost.equalsIgnoreCase(receivedHost)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Scryfall returned a next-page URL outside its API."
                );
            }
            page = restClient.get()
                    .uri(nextPageUri)
                    .retrieve()
                    .body(JsonNode.class);
        }
    }

    private JsonNode get(String path, String... parameters) {
        return restClient.get()
                .uri(uriBuilder -> {
                    uriBuilder.path(path);
                    for (int index = 0; index < parameters.length; index += 2) {
                        uriBuilder.queryParam(parameters[index], parameters[index + 1]);
                    }
                    return uriBuilder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }
}
