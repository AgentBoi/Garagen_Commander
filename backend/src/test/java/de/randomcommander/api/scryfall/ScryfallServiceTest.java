package de.randomcommander.api.scryfall;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import org.springframework.test.web.client.MockRestServiceServer;

class ScryfallServiceTest {

    private MockRestServiceServer mockServer;
    private ScryfallService service;

    @BeforeEach
    void setUp() {
        ScryfallProperties properties = new ScryfallProperties(
                "https://api.scryfall.com",
                10
        );
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        RestClient restClient = new ScryfallClientConfig()
                .scryfallRestClient(builder, properties);
        service = new ScryfallService(restClient, properties);
    }

    @Test
    void randomCardForwardsTheSearchQuery() {
        mockServer.expect(request -> {
                    assertThat(request.getURI().getPath()).isEqualTo("/cards/random");
                    assertThat(request.getURI().getQuery()).contains("q=is:commander");
                })
                .andRespond(withSuccess("{\"name\":\"Alela\"}", APPLICATION_JSON));

        JsonNode card = service.randomCard("is:commander");

        assertThat(card.path("name").asText()).isEqualTo("Alela");
        mockServer.verify();
    }

    @Test
    void searchCardsCollectsAllPages() {
        mockServer.expect(request -> {
                    assertThat(request.getURI().getPath()).isEqualTo("/cards/search");
                    assertThat(request.getURI().getQuery()).contains("q=partner");
                    assertThat(request.getURI().getQuery()).contains("unique=cards");
                })
                .andRespond(withSuccess(
                        "{\"data\":[{\"name\":\"First\"}],\"has_more\":true,"
                                + "\"next_page\":\"https://api.scryfall.com/cards/search?page=2\"}",
                        APPLICATION_JSON
                ));
        mockServer.expect(requestTo("https://api.scryfall.com/cards/search?page=2"))
                .andRespond(withSuccess(
                        "{\"data\":[{\"name\":\"Second\"}],\"has_more\":false}",
                        APPLICATION_JSON
                ));

        List<JsonNode> cards = service.searchCards("partner");

        assertThat(cards)
                .extracting(card -> card.path("name").asText())
                .containsExactly("First", "Second");
        mockServer.verify();
    }
}
