import { scryptSync, randomBytes } from "crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-sales-password.mjs <password>");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const key = scryptSync(password, salt, 64, {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
}).toString("base64url");

console.log(`scrypt$16384$8$1$${salt}$${key}`);
