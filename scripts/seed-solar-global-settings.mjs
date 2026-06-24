/**
 * Seed Solar Global Settings
 * Insère les 33 paramètres globaux par défaut dans erp_solar_global_settings
 */
async function main() {
  const defaults = [
    { code: "PSH_DEFAULT", name: "Heures de pic solaire par défaut", group: "resource_solaire", value: 4.5, unit: "h/j", desc: "Peak Sun Hours par défaut (Côte d'Ivoire)" },
    { code: "SHADING_FACTOR", name: "Facteur ombrage par défaut", group: "resource_solaire", value: 1.0, unit: null, desc: "1 = pas d'ombrage" },
    { code: "SOILING_FACTOR", name: "Facteur salissure", group: "resource_solaire", value: 0.95, unit: null, desc: "Perte due à la poussière" },
    { code: "TEMPERATURE_FACTOR", name: "Facteur température", group: "resource_solaire", value: 0.95, unit: null, desc: "Perte due à la chaleur" },
    { code: "GLOBAL_EFFICIENCY", name: "Rendement global système", group: "rendement", value: 0.80, unit: null, desc: "Rendement global du système solaire" },
    { code: "INVERTER_EFFICIENCY", name: "Rendement onduleur", group: "rendement", value: 0.92, unit: null, desc: "Rendement de conversion onduleur" },
    { code: "BATTERY_EFF_LITHIUM", name: "Rendement batterie lithium", group: "rendement", value: 0.95, unit: null, desc: "Rendement aller-retour batterie lithium" },
    { code: "BATTERY_EFF_LEAD", name: "Rendement batterie plomb", group: "rendement", value: 0.85, unit: null, desc: "Rendement aller-retour batterie plomb" },
    { code: "DOD_LITHIUM", name: "DoD lithium", group: "batteries", value: 0.80, unit: null, desc: "Profondeur de décharge max lithium" },
    { code: "DOD_LEAD", name: "DoD plomb", group: "batteries", value: 0.50, unit: null, desc: "Profondeur de décharge max plomb" },
    { code: "AUTONOMY_DAYS", name: "Autonomie par défaut", group: "batteries", value: 2, unit: "jours", desc: "Nombre de jours d'autonomie cible" },
    { code: "PV_SAFETY_MARGIN", name: "Marge panneaux", group: "panneaux", value: 0.15, unit: "%", desc: "Marge de sécurité sur la puissance PV (15%)" },
    { code: "PANEL_UNIT_POWER", name: "Puissance panneau par défaut", group: "panneaux", value: 550, unit: "Wc", desc: "Puissance unitaire du panneau par défaut" },
    { code: "INVERTER_MARGIN", name: "Marge onduleur", group: "onduleur", value: 0.25, unit: "%", desc: "Marge de sécurité onduleur (25%)" },
    { code: "INVERTER_SURGE_MARGIN", name: "Marge surge", group: "onduleur", value: 0.10, unit: "%", desc: "Marge sur la puissance de pointe (10%)" },
    { code: "INVERTER_SURGE_CAPACITY", name: "Capacité surge relative", group: "onduleur", value: 2.0, unit: null, desc: "Rapport surge/continu par défaut" },
    { code: "VOLTAGE_DROP_DC", name: "Chute tension DC", group: "cables", value: 0.03, unit: "%", desc: "Chute de tension DC admissible (3%)" },
    { code: "VOLTAGE_DROP_AC", name: "Chute tension AC", group: "cables", value: 0.03, unit: "%", desc: "Chute de tension AC admissible (3%)" },
    { code: "COPPER_RESISTIVITY", name: "Résistivité cuivre", group: "cables", value: 0.0175, unit: "Ω·mm²/m", desc: "Résistivité du cuivre à 20°C" },
    { code: "NOMINAL_VOLTAGE", name: "Tension nominale système", group: "systeme", value: 48, unit: "V", desc: "Tension nominale retenue pour le parc" },
    { code: "STRUCTURE_RATE", name: "Taux structure", group: "budget", value: 0.08, unit: "%", desc: "Coût structures en % du coût panneaux" },
    { code: "CABLE_ACCESSORIES_RATE", name: "Taux accessoires câbles", group: "budget", value: 0.10, unit: "%", desc: "Marge accessoires câbles" },
    { code: "ENGINEERING_RATE", name: "Taux ingénierie", group: "budget", value: 0.08, unit: "%", desc: "Coût ingénierie en % du sous-total matériel" },
    { code: "TRANSPORT_RATE", name: "Taux transport", group: "budget", value: 0.05, unit: "%", desc: "Coût transport en % du sous-total matériel" },
    { code: "CONTINGENCY_RATE", name: "Taux contingence", group: "budget", value: 0.05, unit: "%", desc: "Contingence en % du sous-total" },
    { code: "COMMERCIAL_MARGIN_RATE", name: "Taux marge commerciale", group: "budget", value: 0.15, unit: "%", desc: "Marge commerciale" },
    { code: "VAT_RATE", name: "Taux TVA", group: "budget", value: 0.18, unit: "%", desc: "Taux TVA par défaut (18% Côte d'Ivoire)" },
    { code: "INSTALLATION_COST_PER_KWP", name: "Coût installation par kWc", group: "budget", value: 150000, unit: "XOF/kWc", desc: "Coût main d'œuvre installation par kWc installé" },
    { code: "PRICE_PER_WC_PANEL", name: "Prix par Wc panneau", group: "prix_defaut", value: 350, unit: "XOF/Wc", desc: "Prix moyen par Wc de panneau solaire" },
    { code: "PRICE_PER_WH_LITHIUM", name: "Prix par Wh lithium", group: "prix_defaut", value: 250, unit: "XOF/Wh", desc: "Prix moyen par Wh de batterie lithium" },
    { code: "PRICE_PER_AH_LEAD", name: "Prix par Ah plomb", group: "prix_defaut", value: 4500, unit: "XOF/Ah", desc: "Prix moyen par Ah de batterie plomb" },
    { code: "PRICE_PER_W_INVERTER", name: "Prix par W onduleur", group: "prix_defaut", value: 200, unit: "XOF/W", desc: "Prix moyen par W d'onduleur" },
    { code: "PRICE_PER_M_CABLE", name: "Prix par m·mm² câble", group: "prix_defaut", value: 150, unit: "XOF/m·mm²", desc: "Prix moyen par mètre linéaire par mm² de câble" },
  ];

  console.log(`Seeding ${defaults.length} global settings via direct SQL...`);
  
  // Use mysql2 directly
  const mysql = await import("mysql2/promise");
  const dotenv = await import("dotenv");
  dotenv.config({ path: "/home/ubuntu/foncier225-platform/.env" });
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const now = Date.now();
  
  let inserted = 0;
  let skipped = 0;
  
  for (const d of defaults) {
    const [rows] = await connection.execute(
      "SELECT id FROM erp_solar_global_settings WHERE parameter_code = ?",
      [d.code]
    );
    if (rows.length > 0) {
      skipped++;
      continue;
    }
    
    await connection.execute(
      `INSERT INTO erp_solar_global_settings 
       (parameter_code, parameter_name, parameter_group, parameter_value, unit, description, data_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'number', ?, ?)`,
      [d.code, d.name, d.group, d.value, d.unit, d.desc, now, now]
    );
    inserted++;
  }
  
  await connection.end();
  console.log(`Done! Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
}

main().catch(console.error);
