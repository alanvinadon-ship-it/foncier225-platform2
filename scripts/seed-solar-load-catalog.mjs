/**
 * Seed: Bibliothèque standard des charges électriques solaires
 * 77 équipements répartis en 13 domaines
 * Idempotent: upsert par item_code
 */
import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL manquant"); process.exit(1); }

const url = new URL(DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const now = Date.now();

const items = [
  // === Domestique / Résidentiel ===
  { itemCode: "DOM_LED_9W", name: "Ampoule LED 9W", domain: "Domestic", category: "lighting", defaultPowerW: 9, defaultHoursPerDay: 6, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_LED_15W", name: "Ampoule LED 15W", domain: "Domestic", category: "lighting", defaultPowerW: 15, defaultHoursPerDay: 6, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_TV_32", name: "Téléviseur LED 32 pouces", domain: "Domestic", category: "appliances", defaultPowerW: 60, defaultHoursPerDay: 5, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_TV_55", name: "Téléviseur LED 55 pouces", domain: "Domestic", category: "appliances", defaultPowerW: 150, defaultHoursPerDay: 5, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_FRIDGE", name: "Réfrigérateur domestique", domain: "Domestic", category: "appliances", defaultPowerW: 150, defaultHoursPerDay: 12, defaultSimultaneityCoeff: 0.5, startupFactor: 3 },
  { itemCode: "DOM_FREEZER", name: "Congélateur", domain: "Domestic", category: "appliances", defaultPowerW: 250, defaultHoursPerDay: 12, defaultSimultaneityCoeff: 0.5, startupFactor: 3 },
  { itemCode: "DOM_FAN", name: "Ventilateur", domain: "Domestic", category: "cooling", defaultPowerW: 75, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "DOM_AC_1CV", name: "Climatiseur 1 CV", domain: "Domestic", category: "cooling", defaultPowerW: 900, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "DOM_AC_1_5CV", name: "Climatiseur 1,5 CV", domain: "Domestic", category: "cooling", defaultPowerW: 1500, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "DOM_AC_2CV", name: "Climatiseur 2 CV", domain: "Domestic", category: "cooling", defaultPowerW: 2200, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "DOM_WASHER", name: "Machine à laver", domain: "Domestic", category: "appliances", defaultPowerW: 800, defaultHoursPerDay: 1, defaultSimultaneityCoeff: 1, startupFactor: 2 },
  { itemCode: "DOM_IRON", name: "Fer à repasser", domain: "Domestic", category: "heating", defaultPowerW: 1200, defaultHoursPerDay: 1, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_HEATER", name: "Chauffe-eau électrique", domain: "Domestic", category: "heating", defaultPowerW: 3000, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_MICROWAVE", name: "Micro-ondes", domain: "Domestic", category: "kitchen", defaultPowerW: 1200, defaultHoursPerDay: 0.5, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "DOM_CHARGER", name: "Chargeur téléphone", domain: "Domestic", category: "appliances", defaultPowerW: 10, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 1 },

  // === Bureaux / Administration ===
  { itemCode: "OFF_LAPTOP", name: "Ordinateur portable", domain: "Office", category: "it", defaultPowerW: 65, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "OFF_DESKTOP", name: "Ordinateur de bureau", domain: "Office", category: "it", defaultPowerW: 250, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "OFF_SCREEN", name: "Écran LED", domain: "Office", category: "it", defaultPowerW: 40, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "OFF_INKJET", name: "Imprimante jet d'encre", domain: "Office", category: "office", defaultPowerW: 50, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 0.5, startupFactor: 1.5 },
  { itemCode: "OFF_LASER", name: "Imprimante laser", domain: "Office", category: "office", defaultPowerW: 600, defaultHoursPerDay: 1, defaultSimultaneityCoeff: 0.5, startupFactor: 2 },
  { itemCode: "OFF_COPIER", name: "Photocopieuse", domain: "Office", category: "office", defaultPowerW: 1200, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 0.5, startupFactor: 2 },
  { itemCode: "OFF_PROJECTOR", name: "Vidéoprojecteur", domain: "Office", category: "office", defaultPowerW: 300, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "OFF_ROUTER", name: "Routeur internet bureau", domain: "Office", category: "telecom", defaultPowerW: 20, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "OFF_SWITCH24", name: "Switch réseau 24 ports", domain: "Office", category: "telecom", defaultPowerW: 50, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },

  // === Télécom / Informatique ===
  { itemCode: "TEL_ROUTER_4G", name: "Routeur 4G/5G", domain: "Telecom IT", category: "telecom", defaultPowerW: 15, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "TEL_ANTENNA", name: "Antenne radio telecom", domain: "Telecom IT", category: "telecom", defaultPowerW: 150, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "TEL_BTS", name: "Équipement BTS léger", domain: "Telecom IT", category: "telecom", defaultPowerW: 800, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "TEL_SERVER_1U", name: "Serveur rack 1U", domain: "Telecom IT", category: "server", defaultPowerW: 500, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "TEL_SERVER_2U", name: "Serveur rack 2U", domain: "Telecom IT", category: "server", defaultPowerW: 800, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "TEL_NAS", name: "NAS stockage", domain: "Telecom IT", category: "server", defaultPowerW: 150, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "TEL_UPS", name: "Onduleur informatique UPS", domain: "Telecom IT", category: "it", defaultPowerW: 100, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "TEL_RACK_FAN", name: "Baie réseau ventilée", domain: "Telecom IT", category: "telecom", defaultPowerW: 100, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },

  // === Sécurité / Vidéosurveillance ===
  { itemCode: "SEC_CAM_IP", name: "Caméra IP", domain: "Security", category: "security", defaultPowerW: 10, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "SEC_CAM_PTZ", name: "Caméra PTZ", domain: "Security", category: "security", defaultPowerW: 40, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1.2 },
  { itemCode: "SEC_NVR_8", name: "NVR 8 canaux", domain: "Security", category: "security", defaultPowerW: 40, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "SEC_NVR_16", name: "NVR 16 canaux", domain: "Security", category: "security", defaultPowerW: 80, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "SEC_ACCESS", name: "Contrôle d'accès", domain: "Security", category: "security", defaultPowerW: 30, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "SEC_ALARM", name: "Alarme intrusion", domain: "Security", category: "security", defaultPowerW: 20, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1 },

  // === Commerce / Boutique ===
  { itemCode: "COM_FREEZER", name: "Congélateur commercial", domain: "Commercial", category: "appliances", defaultPowerW: 500, defaultHoursPerDay: 14, defaultSimultaneityCoeff: 0.6, startupFactor: 3 },
  { itemCode: "COM_DISPLAY", name: "Vitrine réfrigérée", domain: "Commercial", category: "appliances", defaultPowerW: 700, defaultHoursPerDay: 14, defaultSimultaneityCoeff: 0.7, startupFactor: 3 },
  { itemCode: "COM_REGISTER", name: "Caisse enregistreuse", domain: "Commercial", category: "office", defaultPowerW: 80, defaultHoursPerDay: 10, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "COM_SCALE", name: "Balance électronique", domain: "Commercial", category: "office", defaultPowerW: 20, defaultHoursPerDay: 10, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "COM_SIGN", name: "Enseigne lumineuse LED", domain: "Commercial", category: "lighting", defaultPowerW: 150, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 1 },

  // === Hôtellerie / Restaurant ===
  { itemCode: "HOT_FRIDGE_PRO", name: "Réfrigérateur professionnel", domain: "Hotel Restaurant", category: "kitchen", defaultPowerW: 600, defaultHoursPerDay: 14, defaultSimultaneityCoeff: 0.7, startupFactor: 3 },
  { itemCode: "HOT_FREEZER_PRO", name: "Congélateur professionnel", domain: "Hotel Restaurant", category: "kitchen", defaultPowerW: 800, defaultHoursPerDay: 14, defaultSimultaneityCoeff: 0.7, startupFactor: 3 },
  { itemCode: "HOT_OVEN", name: "Four électrique", domain: "Hotel Restaurant", category: "kitchen", defaultPowerW: 3000, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "HOT_HOTPLATE", name: "Plaque chauffante", domain: "Hotel Restaurant", category: "kitchen", defaultPowerW: 2500, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "HOT_COFFEE", name: "Machine à café professionnelle", domain: "Hotel Restaurant", category: "kitchen", defaultPowerW: 1500, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 0.8, startupFactor: 1 },
  { itemCode: "HOT_HOOD", name: "Hotte aspirante", domain: "Hotel Restaurant", category: "kitchen", defaultPowerW: 500, defaultHoursPerDay: 5, defaultSimultaneityCoeff: 1, startupFactor: 1.5 },

  // === Industriel léger ===
  { itemCode: "IND_MOTOR_1KW", name: "Moteur électrique 1 kW", domain: "Industrial", category: "motor", defaultPowerW: 1000, defaultHoursPerDay: 6, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "IND_MOTOR_2_2KW", name: "Moteur électrique 2,2 kW", domain: "Industrial", category: "motor", defaultPowerW: 2200, defaultHoursPerDay: 6, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "IND_COMP_2CV", name: "Compresseur 2 CV", domain: "Industrial", category: "industrial", defaultPowerW: 1500, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 4 },
  { itemCode: "IND_COMP_5CV", name: "Compresseur 5 CV", domain: "Industrial", category: "industrial", defaultPowerW: 4000, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 4 },
  { itemCode: "IND_WELDER", name: "Poste à souder léger", domain: "Industrial", category: "industrial", defaultPowerW: 3500, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 0.8, startupFactor: 2 },
  { itemCode: "IND_MACHINE", name: "Petite machine-outil", domain: "Industrial", category: "industrial", defaultPowerW: 2000, defaultHoursPerDay: 5, defaultSimultaneityCoeff: 1, startupFactor: 3 },

  // === Pompage / Hydraulique ===
  { itemCode: "PMP_SUB_075", name: "Pompe immergée 0,75 kW", domain: "Pumping", category: "pump", defaultPowerW: 750, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "PMP_SUB_1_5", name: "Pompe immergée 1,5 kW", domain: "Pumping", category: "pump", defaultPowerW: 1500, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "PMP_SURFACE", name: "Pompe de surface 1 CV", domain: "Pumping", category: "pump", defaultPowerW: 750, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "PMP_BOOSTER", name: "Surpresseur", domain: "Pumping", category: "pump", defaultPowerW: 1100, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 3 },

  // === Santé / Médical ===
  { itemCode: "MED_FRIDGE", name: "Réfrigérateur médical", domain: "Medical", category: "medical", defaultPowerW: 250, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 0.5, startupFactor: 3, isCriticalDefault: true },
  { itemCode: "MED_OXYGEN", name: "Concentrateur d'oxygène", domain: "Medical", category: "medical", defaultPowerW: 350, defaultHoursPerDay: 12, defaultSimultaneityCoeff: 1, startupFactor: 1.2, isCriticalDefault: true },
  { itemCode: "MED_BED", name: "Lit médical électrique", domain: "Medical", category: "medical", defaultPowerW: 150, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 0.5, startupFactor: 1.5 },
  { itemCode: "MED_ULTRASOUND", name: "Appareil échographie", domain: "Medical", category: "medical", defaultPowerW: 500, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 1.2, isCriticalDefault: true },
  { itemCode: "MED_AUTOCLAVE", name: "Autoclave électrique", domain: "Medical", category: "medical", defaultPowerW: 2500, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 1, startupFactor: 1 },

  // === Chantier / Construction ===
  { itemCode: "CON_DRILL", name: "Perceuse électrique", domain: "Construction Site", category: "construction", defaultPowerW: 800, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 0.7, startupFactor: 2 },
  { itemCode: "CON_GRINDER", name: "Meuleuse", domain: "Construction Site", category: "construction", defaultPowerW: 1200, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 0.7, startupFactor: 2 },
  { itemCode: "CON_MIXER", name: "Bétonnière électrique", domain: "Construction Site", category: "construction", defaultPowerW: 1500, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "CON_VIBRATOR", name: "Vibreur béton", domain: "Construction Site", category: "construction", defaultPowerW: 1000, defaultHoursPerDay: 2, defaultSimultaneityCoeff: 1, startupFactor: 2 },
  { itemCode: "CON_PUMP", name: "Pompe chantier", domain: "Construction Site", category: "construction", defaultPowerW: 1500, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "CON_LIGHT", name: "Éclairage chantier projecteur LED", domain: "Construction Site", category: "lighting", defaultPowerW: 100, defaultHoursPerDay: 8, defaultSimultaneityCoeff: 1, startupFactor: 1 },

  // === Agricole ===
  { itemCode: "AGR_CRUSHER", name: "Broyeur agricole", domain: "Agriculture", category: "industrial", defaultPowerW: 3000, defaultHoursPerDay: 3, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "AGR_MILL", name: "Moulin électrique", domain: "Agriculture", category: "industrial", defaultPowerW: 2200, defaultHoursPerDay: 4, defaultSimultaneityCoeff: 1, startupFactor: 3 },
  { itemCode: "AGR_INCUBATOR", name: "Couveuse électrique", domain: "Agriculture", category: "appliances", defaultPowerW: 500, defaultHoursPerDay: 24, defaultSimultaneityCoeff: 1, startupFactor: 1, isCriticalDefault: true },
  { itemCode: "AGR_PUMP", name: "Pompe irrigation", domain: "Agriculture", category: "pump", defaultPowerW: 1500, defaultHoursPerDay: 5, defaultSimultaneityCoeff: 1, startupFactor: 3 },

  // === Éclairage public ===
  { itemCode: "PUB_LED_30W", name: "Lampadaire LED 30W", domain: "Public Lighting", category: "lighting", defaultPowerW: 30, defaultHoursPerDay: 12, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "PUB_LED_60W", name: "Lampadaire LED 60W", domain: "Public Lighting", category: "lighting", defaultPowerW: 60, defaultHoursPerDay: 12, defaultSimultaneityCoeff: 1, startupFactor: 1 },
  { itemCode: "PUB_LED_100W", name: "Lampadaire LED 100W", domain: "Public Lighting", category: "lighting", defaultPowerW: 100, defaultHoursPerDay: 12, defaultSimultaneityCoeff: 1, startupFactor: 1 },
];

console.log(`Seeding ${items.length} équipements dans erp_solar_load_catalog...`);

let inserted = 0, updated = 0;
for (const item of items) {
  const [existing] = await conn.execute(
    "SELECT id FROM erp_solar_load_catalog WHERE item_code = ? AND deleted_at IS NULL",
    [item.itemCode]
  );
  if (existing.length > 0) {
    await conn.execute(
      `UPDATE erp_solar_load_catalog SET name=?, domain=?, category=?, default_power_w=?, default_hours_per_day=?, default_simultaneity_coeff=?, startup_factor=?, is_critical_default=?, updated_at=? WHERE item_code=? AND deleted_at IS NULL`,
      [item.name, item.domain, item.category, item.defaultPowerW, item.defaultHoursPerDay, item.defaultSimultaneityCoeff, item.startupFactor, item.isCriticalDefault || false, now, item.itemCode]
    );
    updated++;
  } else {
    await conn.execute(
      `INSERT INTO erp_solar_load_catalog (item_code, name, domain, category, default_power_w, default_hours_per_day, default_simultaneity_coeff, startup_factor, is_critical_default, is_active, default_quantity, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [item.itemCode, item.name, item.domain, item.category, item.defaultPowerW, item.defaultHoursPerDay, item.defaultSimultaneityCoeff, item.startupFactor, item.isCriticalDefault || false, true, 1, now, now]
    );
    inserted++;
  }
}

console.log(`✅ Seed terminé: ${inserted} insérés, ${updated} mis à jour (total: ${items.length})`);
await conn.end();
