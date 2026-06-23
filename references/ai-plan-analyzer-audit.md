# Audit Préalable — Module IA Plan Analyzer

## 1. Données existantes à réutiliser

| Module | Table/Service | Réutilisation |
|--------|--------------|---------------|
| LLM Helper | `server/_core/llm.ts` | invokeLLM avec support vision (ImageContent) — utilisable directement pour analyser les plans |
| Storage S3 | `server/storage.ts` | storagePut/storageGet — upload des plans et rapports PDF |
| Documents | `erp_documents`, `erp_document_versions` | Stocker les plans originaux et les rapports IA |
| Projets | `erp_projects` | Rattacher les analyses à un projet |
| Inventory | `erp_inventory_items` | Vérifier stock disponible, catégories matériaux |
| Material Requests | `erp_material_requests`, `erp_material_request_lines` | Convertir quantitatif en demande matériel |
| RFQ | `rfqRouter` | Convertir quantitatif en demande de prix fournisseurs |
| Budget V2 | `erp_budget_lines_v2` | Convertir quantitatif en lignes budgétaires |
| Vendors | `erp_vendors`, `erp_supplier_item_prices` | Prix fournisseurs pour estimation coûts |
| RBAC | `erp-rbac.service.ts` | 36 modules existants, ajouter `erp_ai_plan_analyzer` |
| PDF Gen | `pdfkit` + `qrcode` | Déjà installés pour les factures — réutiliser pour rapport technique |
| Image Gen | `server/_core/imageGeneration.ts` | Non pertinent ici |

## 2. Tables à créer (6 tables)

1. `erp_ai_plan_analyses` — Analyses de plans (métadonnées, statut, confiance)
2. `erp_ai_plan_elements` — Éléments détectés (murs, poteaux, poutres, etc.)
3. `erp_ai_material_takeoffs` — Quantitatif matériaux (calculé par IA + corrections)
4. `erp_ai_engineering_checks` — Contrôles ingénierie (alertes, sévérité)
5. `erp_ai_construction_rules` — Règles d'ingénierie configurables
6. `erp_ai_quantity_coefficients` — Coefficients de calcul paramétrables

## 3. Routes à créer

- `/erp/ai/plan-analyzer` — Liste des analyses
- `/erp/ai/plan-analyzer/upload` — Upload + lancement analyse
- `/erp/ai/plan-analyzer/:id` — Détail analyse (onglets)
- `/erp/ai/plan-analyzer/rules` — Gestion des règles
- `/erp/ai/plan-analyzer/coefficients` — Gestion des coefficients

## 4. Composants UI à réutiliser

- Shadcn/ui : Table, Card, Badge, Dialog, Tabs, Select, Button, Toast
- Chart.js : Graphiques dans le dashboard
- Formulaires existants : Pattern CRUD déjà établi dans les pages ERP

## 5. Architecture proposée

```
server/erp/
  erp-ai-plan-analyzer-router.ts    — Routeur tRPC principal
  erp-ai-plan-analyzer.service.ts   — Service analyse IA (LLM vision)
  erp-ai-quantity-engine.service.ts  — Moteur de calcul quantitatif
  erp-ai-plan-pdf.service.ts        — Génération rapport PDF

client/src/pages/erp/
  ErpAiPlanAnalyzer.tsx             — Liste des analyses
  ErpAiPlanUpload.tsx               — Upload et lancement
  ErpAiPlanDetail.tsx               — Détail avec onglets
  ErpAiPlanRules.tsx                — Gestion règles + coefficients
```

## 6. Risques techniques

| Risque | Mitigation |
|--------|-----------|
| LLM vision limité sur plans techniques complexes | Niveaux de confiance + validation humaine obligatoire |
| Plans DWG/DXF non supportés Phase 1 | Architecture extensible, message clair à l'utilisateur |
| Calculs quantitatif approximatifs | Coefficients configurables + correction manuelle |
| Temps d'analyse long (LLM) | Loading states, analyse asynchrone |
| Taille fichiers plans (>10 Mo) | Upload S3 direct, traitement côté serveur |

## 7. Limites IA

- L'IA ne peut pas remplacer un calcul de structure (RDM, descente de charges)
- Les plans scannés de mauvaise qualité donneront des résultats faibles
- Les plans sans échelle ne permettent pas de calcul dimensionnel fiable
- Les éléments techniques (plomberie, électricité) sont difficiles à détecter sur plans architecturaux
- Le quantitatif est indicatif et doit toujours être validé par un métreur

## 8. Approche d'implémentation

L'analyse IA utilisera `invokeLLM` avec le mode vision (ImageContent) :
1. Upload du plan vers S3
2. Envoi de l'URL du plan au LLM avec un prompt structuré
3. Réponse JSON structurée (response_format json_schema)
4. Stockage des éléments détectés en DB
5. Calcul du quantitatif via le moteur de coefficients
6. Exécution des contrôles d'ingénierie via les règles configurées
