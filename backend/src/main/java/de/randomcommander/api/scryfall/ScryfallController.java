package de.randomcommander.api.scryfall;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/scryfall/cards")
public class ScryfallController {

    private final ScryfallService scryfallService;

    public ScryfallController(ScryfallService scryfallService) {
        this.scryfallService = scryfallService;
    }

    @GetMapping("/random")
    public JsonNode randomCard(
            @RequestParam @NotBlank @Size(max = 500) String query
    ) {
        return scryfallService.randomCard(query);
    }

    @GetMapping("/named/exact")
    public JsonNode namedCardExact(
            @RequestParam @NotBlank @Size(max = 200) String name
    ) {
        return scryfallService.namedCardExact(name);
    }

    @GetMapping("/named/fuzzy")
    public JsonNode namedCardFuzzy(
            @RequestParam @NotBlank @Size(max = 200) String name
    ) {
        return scryfallService.namedCardFuzzy(name);
    }

    @GetMapping("/search")
    public List<JsonNode> searchCards(
            @RequestParam @NotBlank @Size(max = 500) String query
    ) {
        return scryfallService.searchCards(query);
    }
}
