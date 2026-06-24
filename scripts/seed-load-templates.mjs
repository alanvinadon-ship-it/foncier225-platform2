/**
 * Seed script: Load Templates for Solar Module
 * Inserts all standard load balance templates (Domestic, Telecom, Office, Commerce, Medical, Construction, Pumping)
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(DATABASE_URL);
const now = Date.now();

// Helper to insert template + items
async function insertTemplate(template, items) {
  const [result] = await conn.execute(
    `INSERT INTO erp_solar_load_templates (template_code, template_name, domain, profile_type, comfort_level, description, recommended_site_type, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [template.code, template.name, template.domain, template.profileType, template.comfortLevel, template.description, template.recommendedSiteType, now, now]
  );
  const templateId = result.insertId;
  for (const item of items) {
    await conn.execute(
      `INSERT INTO erp_solar_load_template_items (template_id, equipment_name, domain, category, power_w, quantity, hours_per_day, simultaneity_coefficient, startup_factor, is_critical_load, is_night_load, is_motor_load, priority_level, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [templateId, item.name, item.domain || template.domain, item.category || "General", item.powerW, item.qty, item.hours, item.simult || "1.00", item.startup || "1.0", item.critical ? 1 : 0, item.night ? 1 : 0, item.motor ? 1 : 0, item.priority || "Important", item.notes || null, now, now]
    );
  }
  console.log(`✓ ${template.code}: ${template.name} (${items.length} items)`);
  return templateId;
}

// ===== DOMESTIQUE =====

await insertTemplate(
  { code: "DOM_F1_ECO", name: "Famille 1 personne — Économique", domain: "Domestic", profileType: "Famille 1 personne", comfortLevel: "Economic", description: "Studio ou chambre individuelle avec équipements de base", recommendedSiteType: "Appartement / Studio" },
  [
    { name: "Ampoules LED 9W", category: "Éclairage", powerW: 9, qty: 4, hours: 6, simult: "1.00", critical: true, night: true, priority: "Essential" },
    { name: "Téléviseur LED 32 pouces", category: "Multimédia", powerW: 60, qty: 1, hours: 4, simult: "1.00" },
    { name: "Ventilateur", category: "Climatisation", powerW: 75, qty: 1, hours: 8, simult: "1.00", startup: "1.2", night: true },
    { name: "Réfrigérateur domestique", category: "Froid", powerW: 150, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Chargeur téléphone", category: "Multimédia", powerW: 10, qty: 2, hours: 3, priority: "Comfort" },
    { name: "Routeur internet", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "DOM_F2_STD", name: "Famille 2 personnes — Standard", domain: "Domestic", profileType: "Famille 2 personnes", comfortLevel: "Standard", description: "Appartement 2 pièces pour couple", recommendedSiteType: "Appartement 2 pièces" },
  [
    { name: "Ampoules LED 9W", category: "Éclairage", powerW: 9, qty: 6, hours: 6, critical: true, night: true, priority: "Essential" },
    { name: "Téléviseur LED 32 pouces", category: "Multimédia", powerW: 60, qty: 1, hours: 5 },
    { name: "Ventilateurs", category: "Climatisation", powerW: 75, qty: 2, hours: 8, startup: "1.2", night: true },
    { name: "Réfrigérateur", category: "Froid", powerW: 150, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Chargeurs téléphone", category: "Multimédia", powerW: 10, qty: 3, hours: 3, priority: "Comfort" },
    { name: "Routeur internet", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Fer à repasser", category: "Électroménager", powerW: 1200, qty: 1, hours: 0.5, simult: "0.30", priority: "Comfort" },
    { name: "Machine à laver", category: "Électroménager", powerW: 500, qty: 1, hours: 1, simult: "0.30", startup: "2.0", motor: true, priority: "Comfort" },
  ]
);

await insertTemplate(
  { code: "DOM_F3_STD", name: "Famille 3 personnes — Standard +", domain: "Domestic", profileType: "Famille 3 personnes", comfortLevel: "Standard", description: "Appartement 3 pièces pour famille", recommendedSiteType: "Appartement 3 pièces" },
  [
    { name: "Ampoules LED 9W", category: "Éclairage", powerW: 9, qty: 8, hours: 6, critical: true, night: true, priority: "Essential" },
    { name: "Téléviseur LED 43 pouces", category: "Multimédia", powerW: 80, qty: 1, hours: 5 },
    { name: "Ventilateurs", category: "Climatisation", powerW: 75, qty: 3, hours: 8, startup: "1.2", night: true },
    { name: "Réfrigérateur", category: "Froid", powerW: 150, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Congélateur petit", category: "Froid", powerW: 200, qty: 1, hours: 10, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Routeur internet", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Chargeurs téléphone", category: "Multimédia", powerW: 10, qty: 4, hours: 3, priority: "Comfort" },
    { name: "Machine à laver", category: "Électroménager", powerW: 500, qty: 1, hours: 1.5, simult: "0.30", startup: "2.0", motor: true, priority: "Comfort" },
    { name: "Fer à repasser", category: "Électroménager", powerW: 1200, qty: 1, hours: 0.5, simult: "0.30", priority: "Comfort" },
    { name: "Climatiseur 1 CV", category: "Climatisation", powerW: 1000, qty: 1, hours: 2, simult: "0.70", startup: "3.0", motor: true, priority: "Comfort" },
  ]
);

await insertTemplate(
  { code: "DOM_F4_CONF", name: "Famille 4 personnes — Confort", domain: "Domestic", profileType: "Famille 4 personnes", comfortLevel: "Comfort", description: "Villa ou grand appartement pour famille", recommendedSiteType: "Villa / Grand appartement" },
  [
    { name: "Ampoules LED 9W", category: "Éclairage", powerW: 9, qty: 10, hours: 6, critical: true, night: true, priority: "Essential" },
    { name: "Téléviseur LED 55 pouces", category: "Multimédia", powerW: 120, qty: 1, hours: 5 },
    { name: "Ventilateurs", category: "Climatisation", powerW: 75, qty: 4, hours: 8, startup: "1.2", night: true },
    { name: "Réfrigérateur", category: "Froid", powerW: 150, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Congélateur", category: "Froid", powerW: 250, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Routeur internet", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Chargeurs téléphone", category: "Multimédia", powerW: 10, qty: 5, hours: 3, priority: "Comfort" },
    { name: "Machine à laver", category: "Électroménager", powerW: 500, qty: 1, hours: 1.5, simult: "0.30", startup: "2.0", motor: true, priority: "Comfort" },
    { name: "Fer à repasser", category: "Électroménager", powerW: 1200, qty: 1, hours: 0.75, simult: "0.30", priority: "Comfort" },
    { name: "Micro-ondes", category: "Électroménager", powerW: 1000, qty: 1, hours: 0.5, simult: "0.30", priority: "Comfort" },
    { name: "Climatiseur 1,5 CV", category: "Climatisation", powerW: 1500, qty: 1, hours: 3, simult: "0.70", startup: "3.0", motor: true, priority: "Comfort" },
    { name: "Pompe eau 1 CV", category: "Pompage", powerW: 750, qty: 1, hours: 1, startup: "3.0", critical: true, motor: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "DOM_F5_VILLA", name: "Famille 5 personnes — Villa standard", domain: "Domestic", profileType: "Famille 5 personnes", comfortLevel: "Comfort", description: "Villa standard pour grande famille", recommendedSiteType: "Villa standard" },
  [
    { name: "Ampoules LED 9W", category: "Éclairage", powerW: 9, qty: 12, hours: 6, critical: true, night: true, priority: "Essential" },
    { name: "Téléviseur LED 55 pouces", category: "Multimédia", powerW: 120, qty: 2, hours: 5 },
    { name: "Ventilateurs", category: "Climatisation", powerW: 75, qty: 5, hours: 8, startup: "1.2", night: true },
    { name: "Réfrigérateur", category: "Froid", powerW: 150, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Congélateur", category: "Froid", powerW: 250, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Routeur internet", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Chargeurs téléphone", category: "Multimédia", powerW: 10, qty: 6, hours: 3, priority: "Comfort" },
    { name: "Machine à laver", category: "Électroménager", powerW: 500, qty: 1, hours: 1.5, simult: "0.30", startup: "2.0", motor: true, priority: "Comfort" },
    { name: "Fer à repasser", category: "Électroménager", powerW: 1200, qty: 1, hours: 1, simult: "0.30", priority: "Comfort" },
    { name: "Micro-ondes", category: "Électroménager", powerW: 1000, qty: 1, hours: 0.5, simult: "0.30", priority: "Comfort" },
    { name: "Climatiseur 1,5 CV", category: "Climatisation", powerW: 1500, qty: 1, hours: 3, simult: "0.70", startup: "3.0", motor: true },
    { name: "Climatiseur 2 CV", category: "Climatisation", powerW: 2000, qty: 1, hours: 3, simult: "0.70", startup: "3.0", motor: true },
    { name: "Pompe eau 1 CV", category: "Pompage", powerW: 750, qty: 1, hours: 1, startup: "3.0", critical: true, motor: true, priority: "Essential" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 4, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "DOM_VILLA_PREM", name: "Villa premium", domain: "Domestic", profileType: "Villa premium", comfortLevel: "Premium", description: "Villa haut de gamme avec équipements complets", recommendedSiteType: "Villa premium / Résidence" },
  [
    { name: "Ampoules LED 9W", category: "Éclairage", powerW: 9, qty: 20, hours: 6, critical: true, night: true, priority: "Essential" },
    { name: "Téléviseur LED 55 pouces", category: "Multimédia", powerW: 120, qty: 2, hours: 5 },
    { name: "Réfrigérateur", category: "Froid", powerW: 150, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Congélateur", category: "Froid", powerW: 250, qty: 1, hours: 12, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Routeur internet", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 8, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "NVR 8 canaux", category: "Sécurité", powerW: 80, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Climatiseur 1,5 CV", category: "Climatisation", powerW: 1500, qty: 2, hours: 4, simult: "0.70", startup: "3.0", motor: true },
    { name: "Climatiseur 2 CV", category: "Climatisation", powerW: 2000, qty: 2, hours: 4, simult: "0.70", startup: "3.0", motor: true },
    { name: "Machine à laver", category: "Électroménager", powerW: 500, qty: 1, hours: 1.5, simult: "0.30", startup: "2.0", motor: true, priority: "Comfort" },
    { name: "Chauffe-eau", category: "Électroménager", powerW: 2000, qty: 1, hours: 1.5, simult: "0.30", priority: "Comfort" },
    { name: "Pompe eau", category: "Pompage", powerW: 750, qty: 1, hours: 1, startup: "3.0", critical: true, motor: true, priority: "Essential" },
    { name: "Portail électrique", category: "Sécurité", powerW: 300, qty: 1, hours: 0.3, startup: "2.0", critical: true, motor: true, priority: "Essential" },
  ]
);

// ===== TELECOM =====

await insertTemplate(
  { code: "TEL_2G_RURAL", name: "Site 2G rural", domain: "Telecom", profileType: "Site 2G", comfortLevel: "Standard", description: "Site radio 2G en zone rurale", recommendedSiteType: "Pylône / Shelter rural" },
  [
    { name: "Équipement radio 2G", category: "Radio", powerW: 300, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Routeur / modem", category: "Réseau", powerW: 30, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch réseau", category: "Réseau", powerW: 50, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Ventilation baie", category: "Climatisation", powerW: 100, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage technique", category: "Éclairage", powerW: 30, qty: 2, hours: 2, night: true, priority: "Important" },
    { name: "Caméra IP", category: "Sécurité", powerW: 10, qty: 2, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "TEL_3G", name: "Site 3G", domain: "Telecom", profileType: "Site 3G", comfortLevel: "Standard", description: "Site radio 3G standard", recommendedSiteType: "Pylône / Shelter" },
  [
    { name: "Équipement radio 3G", category: "Radio", powerW: 600, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Routeur / transmission", category: "Réseau", powerW: 50, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch réseau", category: "Réseau", powerW: 50, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Baie réseau ventilée", category: "Climatisation", powerW: 150, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage technique", category: "Éclairage", powerW: 30, qty: 2, hours: 2, night: true, priority: "Important" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 2, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Système alarme", category: "Sécurité", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "TEL_4G_STD", name: "Site 4G standard", domain: "Telecom", profileType: "Site 4G", comfortLevel: "Standard", description: "Site radio 4G avec climatisation shelter", recommendedSiteType: "Pylône / Shelter climatisé" },
  [
    { name: "Équipement radio 4G", category: "Radio", powerW: 1000, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Transmission microwave / fibre active", category: "Réseau", powerW: 120, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Routeur cœur / agrégation", category: "Réseau", powerW: 80, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch réseau", category: "Réseau", powerW: 80, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Baie ventilée", category: "Climatisation", powerW: 200, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Climatisation shelter", category: "Climatisation", powerW: 1500, qty: 1, hours: 8, simult: "0.70", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 4, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "NVR", category: "Sécurité", powerW: 40, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Alarme / contrôle accès", category: "Sécurité", powerW: 30, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage site", category: "Éclairage", powerW: 50, qty: 2, hours: 4, night: true, priority: "Important" },
  ]
);

await insertTemplate(
  { code: "TEL_5G_STD", name: "Site 5G standard", domain: "Telecom", profileType: "Site 5G", comfortLevel: "Standard", description: "Site radio 5G avec climatisation renforcée", recommendedSiteType: "Pylône / Shelter climatisé renforcé" },
  [
    { name: "Équipement radio 5G", category: "Radio", powerW: 1800, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Transmission active", category: "Réseau", powerW: 150, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Routeur / agrégation", category: "Réseau", powerW: 120, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch réseau", category: "Réseau", powerW: 100, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Baie ventilée", category: "Climatisation", powerW: 250, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Climatisation shelter", category: "Climatisation", powerW: 2200, qty: 1, hours: 10, simult: "0.70", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 4, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "NVR", category: "Sécurité", powerW: 40, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Alarme / contrôle accès", category: "Sécurité", powerW: 30, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage site", category: "Éclairage", powerW: 50, qty: 2, hours: 4, night: true, priority: "Important" },
  ]
);

await insertTemplate(
  { code: "TEL_5G_CRIT", name: "Site 5G critique haute disponibilité", domain: "Telecom", profileType: "Site 5G critique", comfortLevel: "Critical", description: "Site 5G haute capacité avec redondance climatisation", recommendedSiteType: "Shelter renforcé / Data center edge" },
  [
    { name: "Équipement radio 5G haute capacité", category: "Radio", powerW: 3000, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Transmission active", category: "Réseau", powerW: 250, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Routeur agrégation", category: "Réseau", powerW: 200, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch réseau", category: "Réseau", powerW: 150, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Baie ventilée", category: "Climatisation", powerW: 300, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Climatisation shelter 1", category: "Climatisation", powerW: 2200, qty: 1, hours: 10, simult: "0.70", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Climatisation shelter 2 secours", category: "Climatisation", powerW: 2200, qty: 1, hours: 5, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 6, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "NVR", category: "Sécurité", powerW: 80, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Alarme / contrôle accès", category: "Sécurité", powerW: 50, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage site", category: "Éclairage", powerW: 100, qty: 2, hours: 4, night: true, priority: "Important" },
  ]
);

// ===== BUREAU =====

await insertTemplate(
  { code: "OFF_5P", name: "Bureau 5 postes", domain: "Office", profileType: "Bureau 5 postes", comfortLevel: "Standard", description: "Petit bureau avec 5 postes de travail", recommendedSiteType: "Bureau / Open space" },
  [
    { name: "Ordinateur portable", category: "Informatique", powerW: 65, qty: 5, hours: 8, critical: true, priority: "Essential" },
    { name: "Écrans LED", category: "Informatique", powerW: 40, qty: 5, hours: 8, priority: "Important" },
    { name: "Éclairage LED", category: "Éclairage", powerW: 15, qty: 8, hours: 8, critical: true, priority: "Essential" },
    { name: "Routeur", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch", category: "Réseau", powerW: 50, qty: 1, hours: 10, critical: true, priority: "Essential" },
    { name: "Imprimante", category: "Informatique", powerW: 50, qty: 1, hours: 1, simult: "0.30", priority: "Comfort" },
    { name: "Ventilateurs", category: "Climatisation", powerW: 75, qty: 2, hours: 8, startup: "1.2" },
  ]
);

await insertTemplate(
  { code: "OFF_10P", name: "Bureau 10 postes", domain: "Office", profileType: "Bureau 10 postes", comfortLevel: "Comfort", description: "Bureau moyen avec 10 postes, climatisation et imprimante laser", recommendedSiteType: "Bureau / Open space climatisé" },
  [
    { name: "Ordinateurs portables", category: "Informatique", powerW: 65, qty: 10, hours: 8, critical: true, priority: "Essential" },
    { name: "Écrans", category: "Informatique", powerW: 40, qty: 10, hours: 8, priority: "Important" },
    { name: "Éclairage LED", category: "Éclairage", powerW: 15, qty: 15, hours: 8, critical: true, priority: "Essential" },
    { name: "Routeur", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Switch 24 ports", category: "Réseau", powerW: 50, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Imprimante laser", category: "Informatique", powerW: 600, qty: 1, hours: 1, simult: "0.30", priority: "Comfort" },
    { name: "Photocopieuse", category: "Informatique", powerW: 1200, qty: 1, hours: 1, simult: "0.20", priority: "Comfort" },
    { name: "Climatiseur 1,5 CV", category: "Climatisation", powerW: 1500, qty: 2, hours: 6, simult: "0.70", startup: "3.0", motor: true },
  ]
);

// ===== COMMERCE =====

await insertTemplate(
  { code: "COM_PETIT", name: "Petite boutique", domain: "Commercial", profileType: "Petite boutique", comfortLevel: "Economic", description: "Boutique de proximité sans chaîne de froid", recommendedSiteType: "Local commercial" },
  [
    { name: "Ampoules LED", category: "Éclairage", powerW: 15, qty: 6, hours: 8, critical: true, priority: "Essential" },
    { name: "Caisse enregistreuse", category: "Commerce", powerW: 80, qty: 1, hours: 10, critical: true, priority: "Essential" },
    { name: "Balance électronique", category: "Commerce", powerW: 20, qty: 1, hours: 10, priority: "Important" },
    { name: "Routeur", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Ventilateur", category: "Climatisation", powerW: 75, qty: 1, hours: 8, startup: "1.2" },
  ]
);

await insertTemplate(
  { code: "COM_FROID", name: "Boutique avec froid", domain: "Commercial", profileType: "Boutique avec froid", comfortLevel: "Standard", description: "Boutique avec congélateur et vitrine réfrigérée", recommendedSiteType: "Local commercial avec froid" },
  [
    { name: "Ampoules LED", category: "Éclairage", powerW: 15, qty: 8, hours: 10, critical: true, priority: "Essential" },
    { name: "Congélateur commercial", category: "Froid", powerW: 500, qty: 1, hours: 14, simult: "0.60", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Vitrine réfrigérée", category: "Froid", powerW: 700, qty: 1, hours: 14, simult: "0.70", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Caisse", category: "Commerce", powerW: 80, qty: 1, hours: 10, critical: true, priority: "Essential" },
    { name: "Balance", category: "Commerce", powerW: 20, qty: 1, hours: 10, priority: "Important" },
    { name: "Routeur", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Caméra IP", category: "Sécurité", powerW: 10, qty: 2, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

// ===== SANTÉ =====

await insertTemplate(
  { code: "MED_POSTE", name: "Poste de santé", domain: "Medical", profileType: "Poste de santé", comfortLevel: "Standard", description: "Poste de santé rural avec équipements de base", recommendedSiteType: "Centre de santé rural" },
  [
    { name: "Éclairage LED", category: "Éclairage", powerW: 15, qty: 10, hours: 8, critical: true, priority: "Essential" },
    { name: "Réfrigérateur médical", category: "Froid médical", powerW: 250, qty: 1, hours: 24, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Ordinateur portable", category: "Informatique", powerW: 65, qty: 2, hours: 8, critical: true, priority: "Essential" },
    { name: "Routeur", category: "Réseau", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Concentrateur oxygène", category: "Médical", powerW: 350, qty: 1, hours: 8, critical: true, priority: "Essential" },
    { name: "Ventilateurs", category: "Climatisation", powerW: 75, qty: 2, hours: 8, startup: "1.2" },
    { name: "Caméras IP", category: "Sécurité", powerW: 10, qty: 2, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "MED_CENTRE", name: "Centre médical standard", domain: "Medical", profileType: "Centre médical", comfortLevel: "Comfort", description: "Centre médical avec imagerie et stérilisation", recommendedSiteType: "Centre médical urbain" },
  [
    { name: "Éclairage LED", category: "Éclairage", powerW: 15, qty: 20, hours: 10, critical: true, priority: "Essential" },
    { name: "Réfrigérateur médical", category: "Froid médical", powerW: 250, qty: 2, hours: 24, simult: "0.50", startup: "3.0", critical: true, night: true, motor: true, priority: "Essential" },
    { name: "Ordinateurs", category: "Informatique", powerW: 65, qty: 5, hours: 8, critical: true, priority: "Essential" },
    { name: "Échographie", category: "Médical", powerW: 500, qty: 1, hours: 4, critical: true, priority: "Essential" },
    { name: "Autoclave", category: "Médical", powerW: 2500, qty: 1, hours: 2, simult: "0.30", priority: "Important" },
    { name: "Concentrateurs oxygène", category: "Médical", powerW: 350, qty: 2, hours: 8, critical: true, priority: "Essential" },
    { name: "Routeur + switch", category: "Réseau", powerW: 80, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Climatisation salle examen", category: "Climatisation", powerW: 1500, qty: 1, hours: 6, simult: "0.70", startup: "3.0", motor: true },
    { name: "Caméras + NVR", category: "Sécurité", powerW: 100, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

// ===== CHANTIER =====

await insertTemplate(
  { code: "CHANT_PETIT", name: "Petit chantier", domain: "Construction Site", profileType: "Petit chantier", comfortLevel: "Economic", description: "Chantier de construction léger", recommendedSiteType: "Chantier BTP" },
  [
    { name: "Éclairage chantier LED", category: "Éclairage", powerW: 100, qty: 4, hours: 6, priority: "Important" },
    { name: "Perceuse", category: "Outillage", powerW: 800, qty: 1, hours: 2, simult: "0.50", startup: "2.0", motor: true, priority: "Important" },
    { name: "Meuleuse", category: "Outillage", powerW: 1200, qty: 1, hours: 2, simult: "0.50", startup: "2.0", motor: true, priority: "Important" },
    { name: "Bétonnière électrique", category: "Outillage", powerW: 1500, qty: 1, hours: 3, simult: "0.50", startup: "3.0", motor: true, priority: "Important" },
    { name: "Pompe chantier", category: "Pompage", powerW: 1500, qty: 1, hours: 2, simult: "0.50", startup: "3.0", motor: true, priority: "Important" },
    { name: "Bureau chantier", category: "Informatique", powerW: 150, qty: 1, hours: 8, critical: true, priority: "Essential" },
    { name: "Routeur 4G", category: "Réseau", powerW: 15, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

await insertTemplate(
  { code: "CHANT_MOYEN", name: "Chantier moyen", domain: "Construction Site", profileType: "Chantier moyen", comfortLevel: "Standard", description: "Chantier de construction moyen avec sécurité", recommendedSiteType: "Chantier BTP moyen" },
  [
    { name: "Éclairage chantier LED", category: "Éclairage", powerW: 100, qty: 8, hours: 8, priority: "Important" },
    { name: "Perceuses", category: "Outillage", powerW: 800, qty: 2, hours: 2, simult: "0.50", startup: "2.0", motor: true },
    { name: "Meuleuses", category: "Outillage", powerW: 1200, qty: 2, hours: 2, simult: "0.50", startup: "2.0", motor: true },
    { name: "Bétonnière", category: "Outillage", powerW: 1500, qty: 1, hours: 4, simult: "0.50", startup: "3.0", motor: true },
    { name: "Vibreur béton", category: "Outillage", powerW: 1000, qty: 1, hours: 2, simult: "0.50", startup: "2.0", motor: true },
    { name: "Pompe chantier", category: "Pompage", powerW: 1500, qty: 1, hours: 3, simult: "0.50", startup: "3.0", motor: true },
    { name: "Bureau chantier", category: "Informatique", powerW: 300, qty: 1, hours: 8, critical: true, priority: "Essential" },
    { name: "Caméras sécurité", category: "Sécurité", powerW: 10, qty: 4, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Routeur 4G", category: "Réseau", powerW: 15, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
  ]
);

// ===== POMPAGE =====

await insertTemplate(
  { code: "PUMP_DOM", name: "Pompage domestique", domain: "Pumping", profileType: "Pompage domestique", comfortLevel: "Economic", description: "Pompage d'eau domestique avec pompe de surface", recommendedSiteType: "Résidence / Forage domestique" },
  [
    { name: "Pompe de surface 1 CV", category: "Pompage", powerW: 750, qty: 1, hours: 2, startup: "3.0", critical: true, motor: true, priority: "Essential" },
    { name: "Contrôleur pompe", category: "Contrôle", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage local technique", category: "Éclairage", powerW: 15, qty: 1, hours: 2, priority: "Comfort" },
  ]
);

await insertTemplate(
  { code: "PUMP_AGRI", name: "Pompage agricole", domain: "Pumping", profileType: "Pompage agricole", comfortLevel: "Standard", description: "Pompage pour irrigation agricole", recommendedSiteType: "Exploitation agricole" },
  [
    { name: "Pompe irrigation", category: "Pompage", powerW: 1500, qty: 1, hours: 5, startup: "3.0", critical: true, motor: true, priority: "Essential" },
    { name: "Contrôleur pompe", category: "Contrôle", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage local technique", category: "Éclairage", powerW: 15, qty: 2, hours: 2, priority: "Comfort" },
  ]
);

await insertTemplate(
  { code: "PUMP_COMM", name: "Pompage communautaire", domain: "Pumping", profileType: "Pompage communautaire", comfortLevel: "Standard", description: "Pompage pour adduction d'eau communautaire", recommendedSiteType: "Station de pompage communautaire" },
  [
    { name: "Pompe immergée 1,5 kW", category: "Pompage", powerW: 1500, qty: 1, hours: 6, startup: "3.0", critical: true, motor: true, priority: "Essential" },
    { name: "Surpresseur", category: "Pompage", powerW: 1100, qty: 1, hours: 2, startup: "3.0", critical: true, motor: true, priority: "Essential" },
    { name: "Contrôleur pompe", category: "Contrôle", powerW: 20, qty: 1, hours: 24, critical: true, night: true, priority: "Essential" },
    { name: "Éclairage local technique", category: "Éclairage", powerW: 15, qty: 2, hours: 2, priority: "Comfort" },
  ]
);

console.log("\n✅ Tous les templates ont été insérés avec succès !");
await conn.end();
process.exit(0);
