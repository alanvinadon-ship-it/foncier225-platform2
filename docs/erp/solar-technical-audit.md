# Rapport d'Audit Technique Solaire — Sprint Finalisation

## 1. État actuel du moteur de calcul

### Formules actuelles

| Fonction | Formule | Statut |
|----------|---------|--------|
| Énergie journalière | unitPowerW x quantity x usageHoursPerDay | Manque simultanéité |
| Puissance démarrage | totalPowerW x startupFactor | OK |
| PV sizing | totalDailyEnergyWh / (globalEfficiency x peakSunHours) | Rendement global unique |
| Batterie | (energyWh x autonomyDays) / (voltage x DoD) | Manque vieillissement, mode criticité |
| Onduleur | max(nominal x 1.25, startup x 1.1) | Manque surge, kVA, simultanéité |
| Câbles | rho x 2 x L x I / (deltaV x V) | Manque ampacité, pertes W |
| Budget | 6 lots simples | Manque protections, détails, pertes |

### Colonnes existantes dans erp_solar_load_items

- simultaneity_coeff : EXISTE dans la table DB mais N'EST PAS UTILISE dans le moteur de calcul
- startup_factor : existe et utilisé
- is_critical_load : existe, utilisé partiellement
- MANQUENT : is_night_load, is_motor_load, priority_level

## 2. Erreurs et ambiguïtés détectées

1. Simultanéité non exploitée dans le calcul énergie
2. Confusion startupFactor : somme tous les peakPower au lieu de puissance pointe réaliste
3. Rendement global unique au lieu de pertes détaillées
4. Batterie sans mode criticité
5. Batterie sans facteurs correctifs (vieillissement, température)
6. Câbles sans ampacité
7. Câbles sans pertes en W/Wh
8. Tension chaîne PV absente (courant PV surestimé)
9. Budget simplifié sans protections ni contingence

## 3. Plan de correction

Phase 1: Schema DB (colonnes + tables)
Phase 2: Moteur calcul (simultanéité, pertes, modes batterie)
Phase 3: Câbles (ampacité, pertes), Onduleur (surge, kVA)
Phase 4: Budget détaillé
Phase 5: Alertes techniques + IA
Phase 6: UI + Tests + Documentation
