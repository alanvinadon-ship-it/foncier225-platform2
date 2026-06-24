/**
 * Seed script: Insert 30 solar catalog items into erp_solar_price_catalog
 * Run: node scripts/seed-solar-catalog.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const articles = [
  // Panneaux solaires
  { itemCode: "PNL-JAS-550W", itemName: "Panneau JA Solar 550W mono PERC", category: "panneaux_solaires", unit: "pcs", unitPrice: 80000, brand: "JA Solar", model: "550W mono PERC", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "PNL-LNG-550W", itemName: "Panneau LONGi Hi-MO 5 550W mono", category: "panneaux_solaires", unit: "pcs", unitPrice: 82000, brand: "LONGi", model: "Hi-MO 5 550W", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "PNL-TRN-550W", itemName: "Panneau Trina Vertex 550W mono", category: "panneaux_solaires", unit: "pcs", unitPrice: 80000, brand: "Trina Solar", model: "Vertex 550W", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "PNL-JKS-560N", itemName: "Panneau Jinko Tiger Neo 560W N-Type", category: "panneaux_solaires", unit: "pcs", unitPrice: 92000, brand: "Jinko Solar", model: "Tiger Neo 560W N-Type", qualityLevel: "premium", recommendedUsage: "commercial,industriel" },
  { itemCode: "PNL-CS-550W", itemName: "Panneau Canadian Solar HiKu6 550W", category: "panneaux_solaires", unit: "pcs", unitPrice: 85000, brand: "Canadian Solar", model: "HiKu6 550W", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  // Batteries lithium
  { itemCode: "BAT-PYL-US5000", itemName: "Batterie Pylontech US5000 4,8kWh 48V LiFePO4", category: "batteries_lithium", unit: "pcs", unitPrice: 900000, brand: "Pylontech", model: "US5000 4.8kWh 48V", qualityLevel: "premium", recommendedUsage: "residentiel,commercial" },
  { itemCode: "BAT-DYN-5KWH", itemName: "Batterie Dyness 5,12kWh 51,2V LiFePO4", category: "batteries_lithium", unit: "pcs", unitPrice: 780000, brand: "Dyness", model: "5.12kWh 51.2V", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "BAT-FEL-5KWH", itemName: "Batterie Felicity Solar 5kWh 48V LiFePO4", category: "batteries_lithium", unit: "pcs", unitPrice: 650000, brand: "Felicity Solar", model: "5kWh 48V LiFePO4", qualityLevel: "economique", recommendedUsage: "residentiel,backup" },
  // Batteries plomb
  { itemCode: "BAT-AGM-200AH", itemName: "Batterie GEL/AGM 12V 200Ah", category: "batteries_plomb", unit: "pcs", unitPrice: 190000, brand: "Générique", model: "GEL/AGM 12V 200Ah", qualityLevel: "economique", recommendedUsage: "residentiel,backup" },
  { itemCode: "BAT-AGM-100AH", itemName: "Batterie GEL/AGM 12V 100Ah", category: "batteries_plomb", unit: "pcs", unitPrice: 95000, brand: "Générique", model: "GEL/AGM 12V 100Ah", qualityLevel: "economique", recommendedUsage: "residentiel,backup" },
  // Onduleurs
  { itemCode: "OND-GRW-SPF5000ES", itemName: "Onduleur Growatt SPF 5000 ES 5kW 48V", category: "onduleurs", unit: "pcs", unitPrice: 450000, brand: "Growatt", model: "SPF 5000 ES 5kW 48V", qualityLevel: "bon_rapport", recommendedUsage: "residentiel" },
  { itemCode: "OND-GRW-SPF3000ES", itemName: "Onduleur Growatt SPF 3000 ES 3kW 48V", category: "onduleurs", unit: "pcs", unitPrice: 300000, brand: "Growatt", model: "SPF 3000 ES 3kW 48V", qualityLevel: "bon_rapport", recommendedUsage: "residentiel" },
  { itemCode: "OND-DEY-5K-HYB", itemName: "Onduleur Deye hybride 5kW 48V", category: "onduleurs", unit: "pcs", unitPrice: 700000, brand: "Deye", model: "Hybride 5kW 48V", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "OND-VIC-5K48", itemName: "Onduleur Victron MultiPlus-II 48/5000", category: "onduleurs", unit: "pcs", unitPrice: 950000, brand: "Victron Energy", model: "MultiPlus-II 48/5000", qualityLevel: "premium", recommendedUsage: "commercial,industriel,telecom" },
  // Régulateurs
  { itemCode: "REG-VIC-150-70", itemName: "Régulateur Victron SmartSolar MPPT 150/70", category: "regulateurs", unit: "pcs", unitPrice: 330000, brand: "Victron Energy", model: "SmartSolar MPPT 150/70", qualityLevel: "premium", recommendedUsage: "commercial,industriel" },
  { itemCode: "REG-EPE-100A", itemName: "Régulateur MPPT Epever 100A", category: "regulateurs", unit: "pcs", unitPrice: 170000, brand: "Epever", model: "MPPT 100A", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "REG-MPPT-80A", itemName: "Régulateur MPPT 80A générique qualité pro", category: "regulateurs", unit: "pcs", unitPrice: 95000, brand: "Générique", model: "MPPT 80A Pro", qualityLevel: "economique", recommendedUsage: "residentiel" },
  // Câbles solaires
  { itemCode: "CBL-PV-6MM", itemName: "Câble solaire PV1-F 6mm² rouge/noir", category: "cables_solaires", unit: "m", unitPrice: 850, brand: "Générique", model: "PV1-F 6mm²", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "CBL-PV-10MM", itemName: "Câble solaire PV1-F 10mm² rouge/noir", category: "cables_solaires", unit: "m", unitPrice: 1300, brand: "Générique", model: "PV1-F 10mm²", qualityLevel: "bon_rapport", recommendedUsage: "commercial,industriel" },
  { itemCode: "CBL-BAT-25MM", itemName: "Câble batterie cuivre souple 25mm²", category: "cables_solaires", unit: "m", unitPrice: 3500, brand: "Générique", model: "Cuivre souple 25mm²", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "CBL-BAT-35MM", itemName: "Câble batterie cuivre souple 35mm²", category: "cables_solaires", unit: "m", unitPrice: 5000, brand: "Générique", model: "Cuivre souple 35mm²", qualityLevel: "bon_rapport", recommendedUsage: "commercial,industriel" },
  // Accessoires solaires
  { itemCode: "CON-MC4-PAIR", itemName: "Connecteur MC4 paire mâle/femelle", category: "accessoires_solaires", unit: "paire", unitPrice: 1500, brand: "Générique", model: "MC4 IP67", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial,industriel" },
  // Protections solaires
  { itemCode: "PROT-DC-COMB2", itemName: "Coffret DC 2 strings avec protections", category: "protections_solaires", unit: "pcs", unitPrice: 85000, brand: "Générique", model: "Coffret DC 2 strings", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "PROT-DC-SPD", itemName: "Parafoudre DC Type 2 solaire", category: "protections_solaires", unit: "pcs", unitPrice: 22000, brand: "Générique", model: "SPD DC Type 2", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial,industriel" },
  { itemCode: "PROT-DC-DISJ63", itemName: "Disjoncteur DC 500V 63A", category: "protections_solaires", unit: "pcs", unitPrice: 18000, brand: "Générique", model: "DC 500V 63A", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "PROT-AC-DISJ63", itemName: "Disjoncteur AC 63A", category: "protections_solaires", unit: "pcs", unitPrice: 12000, brand: "Générique", model: "AC 63A", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  // Structures
  { itemCode: "STR-RAIL-ALU", itemName: "Rail aluminium solaire toiture", category: "structures", unit: "m", unitPrice: 6500, brand: "Générique", model: "Rail alu toiture", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  { itemCode: "STR-KIT-FIX", itemName: "Kit fixation panneau solaire toiture", category: "structures", unit: "kit", unitPrice: 15000, brand: "Générique", model: "Kit fixation toiture", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  // Monitoring solaire
  { itemCode: "MON-GRW-WIFI", itemName: "Module WiFi monitoring Growatt", category: "monitoring_solaire", unit: "pcs", unitPrice: 45000, brand: "Growatt", model: "WiFi Module ShineWiFi-X", qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial" },
  // Services
  { itemCode: "SRV-INSTALL-KW", itemName: "Prestation installation solaire par kWc", category: "services", unit: "kWc", unitPrice: 75000, brand: null, model: null, qualityLevel: "bon_rapport", recommendedUsage: "residentiel,commercial,industriel" },
];

async function seed() {
  const conn = await mysql.createConnection(DATABASE_URL);
  let inserted = 0;
  let updated = 0;

  for (const art of articles) {
    const now = Date.now();
    // Check if exists
    const [rows] = await conn.execute(
      "SELECT id FROM erp_solar_price_catalog WHERE item_code = ?",
      [art.itemCode]
    );
    if (rows.length > 0) {
      // Update
      await conn.execute(
        `UPDATE erp_solar_price_catalog SET item_name=?, category=?, unit=?, unit_price=?, brand=?, model=?, quality_level=?, recommended_usage=?, is_active=1, updated_at=? WHERE item_code=?`,
        [art.itemName, art.category, art.unit, art.unitPrice, art.brand, art.model, art.qualityLevel, art.recommendedUsage, now, art.itemCode]
      );
      updated++;
    } else {
      // Insert
      await conn.execute(
        `INSERT INTO erp_solar_price_catalog (item_code, item_name, category, unit, unit_price, currency, brand, model, quality_level, recommended_usage, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'XOF', ?, ?, ?, ?, 1, ?, ?)`,
        [art.itemCode, art.itemName, art.category, art.unit, art.unitPrice, art.brand, art.model, art.qualityLevel, art.recommendedUsage, now, now]
      );
      inserted++;
    }
  }

  console.log(`✅ Seed terminé: ${inserted} insérés, ${updated} mis à jour.`);
  await conn.end();
}

seed().catch((err) => {
  console.error("❌ Erreur seed:", err.message);
  process.exit(1);
});
