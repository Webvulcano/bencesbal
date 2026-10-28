import { describe, expect, it } from "vitest";
import { pickSender } from "@/lib/mailer";

const gmailEnv = { GMAIL_USER: "x@gmail.com", GMAIL_APP_PASSWORD: "pw" };

describe("pickSender — melyik fiókból megy a levél", () => {
  it("Gmail címzett → noreply (SMTP)", () => {
    expect(pickSender("anna@gmail.com", gmailEnv)).toBe("smtp");
    expect(pickSender(" Anna@GoogleMail.com ", gmailEnv)).toBe("smtp");
  });

  it("minden más címzett → Gmail fallback", () => {
    expect(pickSender("bela@hotmail.com", gmailEnv)).toBe("gmail");
    expect(pickSender("cili@outlook.hu", gmailEnv)).toBe("gmail");
    expect(pickSender("dani@freemail.hu", gmailEnv)).toBe("gmail");
  });

  it("Gmail env nélkül minden SMTP-n megy", () => {
    expect(pickSender("bela@hotmail.com", {})).toBe("smtp");
    expect(pickSender("bela@hotmail.com", { GMAIL_USER: "x@gmail.com" })).toBe("smtp");
  });
});
