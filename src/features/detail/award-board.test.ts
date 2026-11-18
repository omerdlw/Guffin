import { describe, expect, it } from "vitest";
import { craftOf, prestigeOf, shortName } from "./award-board";

const craft = (
  category: string,
  organization = "Some Awards",
  medium: "movie" | "tv" | null = "movie",
) => craftOf(category, organization, medium).key;

describe("craftOf", () => {
  it("folds each ceremony's wording into one craft", () => {
    expect(craft("Best Director")).toBe("director");
    expect(
      craft("Outstanding Directorial Achievement in Theatrical Feature Film"),
    ).toBe("director");
    expect(craft("Best Director – Motion Picture")).toBe("director");
    expect(craft("Best Picture")).toBe("work");
    expect(craft("Best Film")).toBe("work");
    expect(craft("Best Motion Picture – Drama")).toBe("work");
    expect(craft("AFI Movies of the Year")).toBe("work");
  });

  it("reads acting by role and gender", () => {
    expect(
      craft("Best Performance by a Male Actor in a Motion Picture – Drama"),
    ).toBe("lead-actor");
    expect(craft("Best Leading Actor")).toBe("lead-actor");
    expect(
      craft(
        "Best Performance by a Female Actor in a Supporting Role in any Motion Picture",
      ),
    ).toBe("supporting-actress");
    expect(
      craft("Outstanding Performance by a Male Actor in a Supporting Role"),
    ).toBe("supporting-actor");
    expect(craft("Outstanding Performance by a Cast in a Motion Picture")).toBe(
      "ensemble",
    );
    expect(craft("Best Actress in Motion Picture, Comedy or Musical")).toBe(
      "lead-actress",
    );
  });

  it("keeps a specific craft over the work it names", () => {
    expect(craft("Best Sound (Editing and Mixing)")).toBe("sound");
    expect(craft("Best Edited Feature Film (Drama, Theatrical)")).toBe(
      "editing",
    );
    expect(craft("Outstanding Original Score for a Studio Film")).toBe("score");
    expect(craft("Outstanding Foreign Language Film")).toBe("international");
    expect(craft("Best Make Up & Hair")).toBe("makeup");
  });

  it("takes a guild's craft from its name", () => {
    expect(craft("Period Feature Film", "ADG Awards")).toBe(
      "production-design",
    );
    expect(
      craft("Excellence in Period Film", "Costume Designers Guild Awards"),
    ).toBe("costume");
    expect(craft("Best Episodic Drama", "Writers Guild Awards")).toBe(
      "screenplay",
    );
  });

  it("names the work by its medium", () => {
    expect(craftOf("Outstanding Drama Series", "Emmy Awards", "tv").label).toBe(
      "Series",
    );
    expect(craftOf("Best Picture", "Academy Awards", "movie").label).toBe(
      "Picture",
    );
  });

  it("leaves the unknown to other honors", () => {
    expect(craft("Cinematic and Box Office Achievement")).toBe("other");
  });
});

describe("shortName", () => {
  it("keeps tags short", () => {
    expect(shortName("Academy Awards")).toBe("Oscars");
    expect(shortName("BAFTA Film Awards")).toBe("BAFTA");
    expect(shortName("Critics Choice Awards")).toBe("Critics Choice");
    expect(shortName("National Board of Review Awards")).toBe("NBR");
    expect(shortName("Costume Designers Guild Awards")).toBe("CDG");
    expect(shortName("Mainichi Film Awards")).toBe("Mainichi");
    expect(shortName("Gotham Television Awards")).toBe("Gotham TV");
    expect(shortName("ACE Eddie Awards")).toBe("ACE Eddie");
  });
});

describe("prestigeOf", () => {
  it("puts the season's ceremonies first", () => {
    expect(prestigeOf("Academy Awards")).toBeLessThan(
      prestigeOf("BAFTA Film Awards"),
    );
    expect(prestigeOf("Critics Choice Awards")).toBeLessThan(
      prestigeOf("Critics Choice Super Awards"),
    );
  });
});
