import { describe, it, expect } from "vitest";
import { detectOffPlatform } from "../lib/moderation";

describe("detectOffPlatform — outside payment (serious violation)", () => {
  const cases = [
    "can you pay me on paypal instead?",
    "send it via western union",
    "I accept JazzCash or EasyPaisa",
    "let's do a bank transfer to avoid the fee",
    "pay outside the platform and save 10%",
    "my payoneer id works too",
    "I take USDT on binance",
    "p a y p a l works for me", // spacing trick
    "pay-pal me half now", // punctuation trick
  ];
  for (const c of cases) {
    it(`flags as payment: "${c}"`, () => {
      const r = detectOffPlatform(c);
      expect(r.flagged).toBe(true);
      expect(r.category).toBe("payment");
    });
  }
});

describe("detectOffPlatform — contact sharing", () => {
  const cases: [string, string][] = [
    ["write me at john@gmail.com", "plain email"],
    ["john (at) gmail (dot) com", "obfuscated email"],
    ["john at gmail dot com", "spelled-out email"],
    ["call me at +92 300 1234567", "phone"],
    ["0 3 0 0 1 2 3 4 5 6 7", "spaced digits"],
    ["zero three zero zero one two three four five six", "digit words"],
    ["add me on whatsapp", "whatsapp"],
    ["w h a t s a p p me", "spaced whatsapp"],
    ["my telegram is fast", "telegram"],
    ["let's continue on discord", "discord"],
    ["here's my portfolio https://mysite.com", "external link"],
    ["reach me at my hotmail", "email provider"],
    ["let's chat outside xwork", "off-platform"],
  ];
  for (const [c, label] of cases) {
    it(`flags contact (${label})`, () => {
      const r = detectOffPlatform(c);
      expect(r.flagged).toBe(true);
      expect(r.category).toBe("contact");
    });
  }
});

describe("detectOffPlatform — clean messages pass", () => {
  const cases = [
    "Hi! I can deliver the logo in 3 days for the budget we agreed.",
    "Please fund the milestone on Xwork so I can start.",
    "I've sent the files through the contract page.",
    "I specialize in cryptography and security audits.", // no 'crypto' keyword FP
    "I'll text messages copy for the landing page.", // no compact 'textme' FP
    "The payout arrives after the security period.",
    "Let's schedule the review for Monday.",
    "My rate is $25 per hour, 5 hours total.",
  ];
  for (const c of cases) {
    it(`passes: "${c}"`, () => {
      expect(detectOffPlatform(c).flagged).toBe(false);
    });
  }
});
