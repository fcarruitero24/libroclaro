import assert from "node:assert/strict";
import { test } from "node:test";
import { verificarAccess } from "./access.ts";

const EQUIPO = "libroclaro.cloudflareaccess.com";
const AUD = "aud-de-prueba";
const AHORA = 1_790_000_000_000;
const BASE = { aud: [AUD], iss: `https://${EQUIPO}`, email: "libroclaro.pe@gmail.com", exp: 1_790_000_600 };

const RSA = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};
const par = (await crypto.subtle.generateKey(RSA, true, ["sign", "verify"])) as CryptoKeyPair;
const otroPar = (await crypto.subtle.generateKey(RSA, true, ["sign", "verify"])) as CryptoKeyPair;
// Como las publica Access en /cdn-cgi/access/certs: con kid y alg.
const llavePublica = { ...(await crypto.subtle.exportKey("jwk", par.publicKey)), kid: "llave-1", alg: "RS256" };

const b64url = (datos: Uint8Array | string) => Buffer.from(datos).toString("base64url");

async function firmar(payload: object, llavePrivada = par.privateKey, kid = "llave-1") {
  const cabecera = b64url(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const cuerpo = b64url(JSON.stringify(payload));
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", llavePrivada, new TextEncoder().encode(`${cabecera}.${cuerpo}`));
  return `${cabecera}.${cuerpo}.${b64url(new Uint8Array(firma))}`;
}

const opciones = (cambios: { aud?: string } = {}) => ({
  equipo: EQUIPO,
  aud: AUD,
  llaves: async () => [llavePublica],
  ahora: AHORA,
  ...cambios,
});

test("verificarAccess acepta un token válido de Access y devuelve el correo", async () =>
  assert.deepEqual(await verificarAccess(await firmar(BASE), opciones()), { ok: true, email: "libroclaro.pe@gmail.com" }));

test("verificarAccess rechaza un token de otra aplicación (audiencia)", async () =>
  assert.equal((await verificarAccess(await firmar({ ...BASE, aud: ["otra"] }), opciones())).ok, false));

test("verificarAccess rechaza un token vencido", async () =>
  assert.equal((await verificarAccess(await firmar({ ...BASE, exp: 1_789_999_999 }), opciones())).ok, false));

test("verificarAccess rechaza un token de otro equipo de Access (emisor)", async () =>
  assert.equal(
    (await verificarAccess(await firmar({ ...BASE, iss: "https://otro.cloudflareaccess.com" }), opciones())).ok,
    false,
  ));

test("verificarAccess rechaza un token firmado con otra llave", async () =>
  assert.equal((await verificarAccess(await firmar(BASE, otroPar.privateKey), opciones())).ok, false));

test("verificarAccess rechaza un token cuya llave no publica Access", async () =>
  assert.equal((await verificarAccess(await firmar(BASE, par.privateKey, "llave-x"), opciones())).ok, false));

test("verificarAccess rechaza la falta de token y los tokens mal formados", async () => {
  assert.equal((await verificarAccess(null, opciones())).ok, false);
  assert.equal((await verificarAccess("", opciones())).ok, false);
  assert.equal((await verificarAccess("abc", opciones())).ok, false);
});

test("verificarAccess no deja pasar a nadie si Access no está configurado", async () =>
  assert.equal((await verificarAccess(await firmar(BASE), opciones({ aud: "" }))).ok, false));
