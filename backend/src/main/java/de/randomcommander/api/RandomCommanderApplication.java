package de.randomcommander.api;

import de.randomcommander.api.scryfall.ScryfallProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(ScryfallProperties.class)
public class RandomCommanderApplication {

    public static void main(String[] args) {
        SpringApplication.run(RandomCommanderApplication.class, args);
    }
}
