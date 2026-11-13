import assert from "node:assert/strict";
import test from "node:test";
import { creerLienWhatsApp, normaliserNumeroWhatsApp } from "../src/lib/whatsapp.ts";

const message = "Bonjour, voici votre devis : 100 000 FCFA & merci !";
const attendu = `https://wa.me/2250707123456?text=${encodeURIComponent(message)}`;

test("ajoute 225 en conservant les 10 chiffres ivoiriens", () => {
  assert.equal(creerLienWhatsApp("07 07 12 34 56", message), attendu);
  assert.equal(creerLienWhatsApp("0707123456", message), attendu);
  assert.equal(creerLienWhatsApp("(07) 07-12-34-56", message), attendu);
});

test("ne duplique pas l'indicatif 225 déjà présent", () => {
  assert.equal(creerLienWhatsApp("+225 07 07 12 34 56", message), attendu);
  assert.equal(creerLienWhatsApp("2250707123456", message), attendu);
  assert.equal(creerLienWhatsApp("00225 07 07 12 34 56", message), attendu);
  assert.equal(creerLienWhatsApp("tel:+2250707123456", message), attendu);
});

test("conserve aussi le zéro des numéros MTN et Moov", () => {
  assert.equal(creerLienWhatsApp("05 55 44 33 22", "test"), "https://wa.me/2250555443322?text=test");
  assert.equal(creerLienWhatsApp("01 23 45 67 89", "test"), "https://wa.me/2250123456789?text=test");
});

test("un destinataire étranger explicite garde son indicatif", () => {
  assert.equal(creerLienWhatsApp("+33 6 12 34 56 78", "bonjour"), "https://wa.me/33612345678?text=bonjour");
  assert.equal(creerLienWhatsApp("0033 6 12 34 56 78", "bonjour"), "https://wa.me/33612345678?text=bonjour");
});

test("numéro vide : choix du contact dans WhatsApp", () => {
  assert.equal(creerLienWhatsApp("", "Bonjour à vous"), "https://wa.me/?text=Bonjour%20%C3%A0%20vous");
  assert.deepEqual(normaliserNumeroWhatsApp(" "), { valide: true, numero: "", vide: true });
});

test("les anciens numéros courts et les indicatifs incomplets sont refusés", () => {
  for (const numero of ["07071234", "708090910", "+225 07 07 12 34", "00225 07 07 12 34", "225070712345", "+225"]) {
    assert.equal(normaliserNumeroWhatsApp(numero).valide, false, numero);
    assert.equal(creerLienWhatsApp(numero, "bonjour"), null, numero);
  }
});

test("le numéro ne peut pas injecter une URL ou un paramètre", () => {
  for (const numero of ["0707123456?text=spam", "javascript:0707123456", "+225/0707123456", "07abc123456"]) {
    assert.equal(normaliserNumeroWhatsApp(numero).valide, false, numero);
  }
});

test("les caractères du message sont encodés sans modifier le destinataire", () => {
  const lien = creerLienWhatsApp("+225 (07) 07 12 34 56", message);
  const url = new URL(lien);
  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/2250707123456");
  assert.equal(url.searchParams.get("text"), message);
});
