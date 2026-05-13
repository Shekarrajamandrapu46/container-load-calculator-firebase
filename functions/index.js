"use strict";

const crypto = require("crypto");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

admin.initializeApp();

const db = admin.firestore();
const ACCESS_PINS = "accessPins";
const VALID_ROLES = new Set(["admin", "planner", "viewer"]);
const BOOTSTRAP_ADMIN_PIN = process.env.BOOTSTRAP_ADMIN_PIN || "8421";

function cleanPin(pin) {
  return String(pin || "").trim();
}

function cleanLabel(label) {
  return String(label || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function cleanRole(role) {
  const r = String(role || "viewer").trim().toLowerCase();
  return VALID_ROLES.has(r) ? r : "viewer";
}

function hashPin(pin) {
  const salt = process.env.PIN_HASH_SALT || "meher-container-loader-spark-v1";
  return crypto.createHash("sha256").update(`${salt}:${cleanPin(pin)}`).digest("hex");
}

async function createRoleToken(uid, role, pinId, label) {
  return admin.auth().createCustomToken(uid, {
    role,
    pinId,
    label
  });
}

function requireAdmin(request) {
  if (!request.auth || request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

async function activePinDocs() {
  const snap = await db.collection(ACCESS_PINS).where("active", "==", true).get();
  return snap.docs;
}

async function activeAdminExists() {
  const snap = await db.collection(ACCESS_PINS)
    .where("active", "==", true)
    .where("role", "==", "admin")
    .limit(1)
    .get();
  return !snap.empty;
}

exports.validatePin = onCall({ cors: true }, async (request) => {
  const pin = cleanPin(request.data && request.data.pin);
  if (pin.length < 4) {
    throw new HttpsError("invalid-argument", "Enter a valid PIN.");
  }

  const pinHash = hashPin(pin);
  const docs = await activePinDocs();
  const now = Date.now();
  let matched = null;
  let activeAdminFound = false;

  for (const doc of docs) {
    const data = doc.data() || {};
    if (data.role === "admin") activeAdminFound = true;
    if (data.expiresAt && Number(data.expiresAt) < now) continue;
    if (data.pinHash === pinHash) {
      matched = { id: doc.id, data };
      break;
    }
  }

  if (!matched) {
    if (!activeAdminFound && BOOTSTRAP_ADMIN_PIN && pin === BOOTSTRAP_ADMIN_PIN) {
      const token = await createRoleToken("pin_bootstrap_admin", "admin", "bootstrap-admin", "Initial admin");
      return { token, role: "admin", label: "Initial admin", pinId: "bootstrap-admin" };
    }
    throw new HttpsError("unauthenticated", "Incorrect or inactive PIN.");
  }

  const role = cleanRole(matched.data.role);
  const label = cleanLabel(matched.data.label) || "Team member";
  await db.collection(ACCESS_PINS).doc(matched.id).set({
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const uid = `pin_${matched.id}`;
  const token = await createRoleToken(uid, role, matched.id, label);

  return { token, role, label, pinId: matched.id };
});

exports.bootstrapAdminPin = onCall({ cors: true }, async (request) => {
  const setupKey = String(request.data && request.data.setupKey || "").trim();
  const requiredSetupKey = String(process.env.MEHER_SETUP_KEY || "").trim();
  if (!requiredSetupKey || setupKey !== requiredSetupKey) {
    throw new HttpsError("permission-denied", "Setup key is required.");
  }
  if (await activeAdminExists()) {
    throw new HttpsError("already-exists", "An active admin PIN already exists.");
  }

  const pin = cleanPin(request.data && request.data.pin);
  if (pin.length < 4) {
    throw new HttpsError("invalid-argument", "Admin PIN must be at least 4 digits.");
  }

  const label = cleanLabel(request.data && request.data.label) || "Initial admin";
  await db.collection(ACCESS_PINS).add({
    pinHash: hashPin(pin),
    label,
    role: "admin",
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { ok: true };
});

exports.listAccessPins = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const snap = await db.collection(ACCESS_PINS).orderBy("createdAt", "desc").limit(100).get();
  return {
    pins: snap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        label: data.label || "",
        role: cleanRole(data.role),
        active: data.active === true,
        createdAt: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : null,
        lastUsedAt: data.lastUsedAt && data.lastUsedAt.toMillis ? data.lastUsedAt.toMillis() : null,
        expiresAt: data.expiresAt || null
      };
    })
  };
});

exports.createAccessPin = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const pin = cleanPin(request.data && request.data.pin);
  if (pin.length < 4) {
    throw new HttpsError("invalid-argument", "PIN must be at least 4 digits.");
  }

  const label = cleanLabel(request.data && request.data.label);
  if (!label) {
    throw new HttpsError("invalid-argument", "Label is required.");
  }

  const role = cleanRole(request.data && request.data.role);
  const doc = await db.collection(ACCESS_PINS).add({
    pinHash: hashPin(pin),
    label,
    role,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: request.auth.uid
  });

  return { id: doc.id, label, role, active: true };
});

exports.disableAccessPin = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const pinId = String(request.data && request.data.pinId || "").trim();
  if (!pinId) {
    throw new HttpsError("invalid-argument", "PIN id is required.");
  }

  await db.collection(ACCESS_PINS).doc(pinId).set({
    active: false,
    disabledAt: admin.firestore.FieldValue.serverTimestamp(),
    disabledBy: request.auth.uid
  }, { merge: true });

  return { ok: true };
});

exports.updateAccessPin = onCall({ cors: true }, async (request) => {
  requireAdmin(request);
  const pinId = String(request.data && request.data.pinId || "").trim();
  if (!pinId) {
    throw new HttpsError("invalid-argument", "PIN id is required.");
  }

  const pin = cleanPin(request.data && request.data.pin);
  if (pin.length < 4) {
    throw new HttpsError("invalid-argument", "PIN must be at least 4 characters.");
  }

  const label = cleanLabel(request.data && request.data.label);
  if (!label) {
    throw new HttpsError("invalid-argument", "Label is required.");
  }

  const role = cleanRole(request.data && request.data.role);

  await db.collection(ACCESS_PINS).doc(pinId).set({
    pinHash: hashPin(pin),
    label,
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: request.auth.uid
  }, { merge: true });

  return { ok: true, label, role };
});
