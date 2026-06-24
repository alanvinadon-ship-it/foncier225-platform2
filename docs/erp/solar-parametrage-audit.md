# Rapport d'Audit Paramétrage Solaire

## Paramètres déjà existants

| Paramètre | Localisation | Valeur par défaut |
|---|---|---|
| Heures de pic solaire | `DEFAULT_DESIGN_INPUTS.peakSunHours` + table `erp_solar_technical_parameters` | 4.5 h/j |
| Rendement global | `DEFAULT_DESIGN_INPUTS.globalEfficiency` | 0.75 |
| Taux de décharge batterie | `DEFAULT_DESIGN_INPUTS.batteryDischargeRate` | 0.80 (lithium) |
| Résistivité cuivre | Constante `COPPER_RESISTIVITY` | 0.0175 |
| Chute de tension cible | `DEFAULT_DESIGN_INPUTS.voltageDropTarget` | 3% |
| Tension système | `DEFAULT_DESIGN_INPUTS.nominalVoltageV` | 48V |
| Autonomie jours | `DEFAULT_DESIGN_INPUTS.autonomyDays` | 2 |
| Puissance panneau | `DEFAULT_DESIGN_INPUTS.panelUnitPowerWc` | 550 Wc |
| Longueur câble PV-Onduleur | `DEFAULT_DESIGN_INPUTS.panelToInverterCableLengthM` | 10m |
| Longueur câble Batterie-Onduleur | `DEFAULT_DESIGN_INPUTS.batteryToInverterCableLengthM` | 3m |
| Prix panneaux | `DEFAULT_PRICES.pricePerWcPanel` | 350 XOF/Wc |
| Prix batterie lithium | `DEFAULT_PRICES.pricePerWhLithium` | 250 XOF/Wh |
| Prix batterie plomb | `DEFAULT_PRICES.pricePerAhPlomb` | 4500 XOF/Ah |
| Prix onduleur | `DEFAULT_PRICES.pricePerWInverter` | 200 XOF/W |
| Prix câble | `DEFAULT_PRICES.pricePerMeterCable` | 150 XOF/m·mm² |
| Structures/Coffrets | `DEFAULT_PRICES.structuresCoffretsPercent` | 10% |
| Installation/Transport | `DEFAULT_PRICES.installationTransportPercent` | 15% |
| Marge onduleur | Constante `INVERTER_SAFETY_MARGIN` | 1.25 (25%) |
| Marge démarrage | Constante `INVERTER_STARTUP_MARGIN` | 1.10 (10%) |

## Paramètres manquants (à ajouter)

- Marge panneaux (pv_safety_margin_percent)
- Rendement onduleur (inverter_efficiency)
- Rendement batterie (battery_roundtrip_efficiency)
- Facteur salissure (soiling_factor)
- Facteur température (temperature_factor)
- DoD plomb (battery_dod_lead = 0.50)
- Taux TVA (default_vat_rate)
- Taux transport (default_transport_rate)
- Coût installation par kWc (default_installation_cost_per_kwp)
- Taux ingénierie (default_engineering_rate)
- Taux marge commerciale (default_commercial_margin_rate)
- Taux contingence (default_contingency_rate)
- Taux structure (structure_rate)
- Taux accessoires câbles (cable_accessories_rate)
- Capacité surge relative onduleur (inverter_surge_capacity)
- Chute tension AC (voltage_drop_ac_percent)

## Formules existantes

- `calculateLoadBalance()` : bilan puissance (correct)
- `calculatePvSizing()` : dimensionnement PV (manque marge panneaux paramétrable)
- `calculateBatterySizing()` : batteries (manque rendement batterie)
- `calculateInverterSizing()` : onduleur (marges en constantes, non paramétrables)
- `calculateCableSizing()` : câbles (correct)
- `calculateBudget()` : budget par lots (manque taxes, marge commerciale, contingence)

## Formules à corriger/enrichir

1. PV Sizing : ajouter marge panneaux paramétrable
2. Battery Sizing : ajouter rendement batterie dans le calcul
3. Inverter Sizing : rendre les marges paramétrables
4. Budget : ajouter lots taxes, marge commerciale, contingence, ingénierie séparée

## Tables à créer

1. `erp_solar_global_settings` — paramètres globaux avec groupes
2. `erp_solar_site_settings` — overrides par projet avec justification
3. `erp_solar_calculation_formulas` — formules versionnées
4. `erp_solar_calculation_runs` — historique des calculs avec snapshots
5. `erp_solar_budget_parameters` — paramètres financiers globaux/projet

## Tables existantes à conserver

- `erp_solar_technical_parameters` → sera remplacée par `erp_solar_global_settings`
- `erp_solar_design_inputs` → sera enrichie avec les overrides site

## API à créer

- globalSettings: list, upsert, resetDefaults, history
- siteSettings: list, upsert, resetToGlobal, applyTemplate
- formulas: list, create, update, activate, duplicate, test
- calculationRuns: list, getById

## Écrans à créer

1. `/erp/solar/settings/global` — 10 onglets paramétrage global
2. `/erp/solar/projects/{id}/settings` — overrides projet
3. `/erp/solar/settings/formulas` — gestion formules versionnées

## Risques de régression

- Le moteur de calcul existant utilise des constantes hardcodées → migration progressive
- Les projets existants n'ont pas de site_settings → fallback vers global
- La table `erp_solar_technical_parameters` est déjà utilisée → migration des données

## Plan d'implémentation

1. Créer les 5 nouvelles tables
2. Seed les paramètres globaux par défaut
3. Refondre le moteur de calcul pour lire les paramètres depuis la DB
4. Créer les routeurs tRPC
5. Créer les UI (global, projet, formules)
6. Ajouter RBAC, audit logs, notifications
7. Tests + documentation
