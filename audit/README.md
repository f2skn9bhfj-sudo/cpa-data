# Base de cours « Audit » — Vincent Baldy

Base de connaissances structurée pour l'**audit suisse**, destinée à
l'intégration dans l'app Python (rendu Markdown). Deux onglets : **Contrôle
ordinaire** et **Contrôle restreint**.

Objectif : support de montée en compétence Staff 1 EY (octobre 2026) puis
préparation du diplôme fédéral d'expert-comptable (EXPERTsuisse).

---

## Statut global

| Onglet | Fiches prévues | Rédigées | Statut |
|---|---|---|---|
| Contrôle ordinaire | ~45 | 0 | 🔴 Structure seule |
| Contrôle restreint | ~14 | 0 | 🔴 Structure seule |

Première livraison : `README.md` + `manifest.json` + 2 `_sommaire.md`.
Contenu des fiches généré ensuite par batchs de 3, avec validation humaine
à chaque batch.

---

## Règle absolue — zéro invention

Une fiche fausse mémorisée est un problème de carrière. Donc :

- Aucune invention de référence légale, de numéro d'article ou de norme
- Tout point non vérifiable est marqué `⚠️ Référence MSA 2016 non vérifiée
  pour 2026` à l'endroit exact, jamais comblé par extrapolation
- « Je ne sais pas » est toujours préférable à « j'invente »

### Hiérarchie des sources

1. **Fedlex** (fedlex.admin.ch) — tous les articles de loi (CO, LSR,
   OSRev, LFus, LDIP, LPP, LB, LBA)
2. **EXPERTsuisse** (expertsuisse.ch) — terminologie NA-CH 2022, SA-CH,
   recommandations d'audit (RA), directives d'indépendance
3. **ASR** (rab-asr.ch) — agrément, surveillance, circulaires
4. **TREUHAND|SUISSE** (treuhandsuisse.ch) — guidance contrôle restreint,
   nouveau droit SA
5. **IAASB** (iaasb.org) — ISA, pour la correspondance NA-CH ↔ ISA
6. **MSA 2016** (PDF EXPERTsuisse, ISBN 978-3-906076-17-1) — squelette
   et source pédagogique **paraphrasée uniquement**, jamais reproduite

### Évolutions législatives à intégrer systématiquement

- **Nouveau droit de la SA** (en vigueur 1er janvier 2023) : l'ancien
  art. 725 al. 1 et 2 CO est remplacé par les **art. 725 / 725a / 725b
  CO** (menace d'insolvabilité, perte de capital, surendettement et
  comptes intermédiaires). Le MSA 2016 cite l'ancien régime → chaque
  fiche concernée porte un encart 📅.
- **NAS 2013 → NA-CH 2022** : terminologie et numérotation à vérifier
  sur le site public EXPERTsuisse, correspondance ISA indiquée.

---

## Glossaire des abréviations

| Abrév. | Signification |
|---|---|
| MSA | Manuel suisse d'audit (EXPERTsuisse) |
| NA-CH | Normes d'audit suisses, édition 2022 |
| NAS | Normes d'audit suisses, édition 2013 (ancienne) |
| NCR | Norme suisse relative au contrôle restreint (2022) |
| NCQ 1 | Norme suisse de contrôle qualité 1 |
| ISA | International Standards on Auditing (IAASB) |
| ISQC / ISQM | International Standard on Quality Control / Management |
| ISAE | International Standard on Assurance Engagements |
| CO | Code des obligations (RS 220) |
| LSR | Loi sur la surveillance de la révision (RS 221.302) |
| OSRev | Ordonnance sur la surveillance de la révision (RS 221.302.3) |
| ASR | Autorité fédérale de surveillance en matière de révision |
| SCI | Système de contrôle interne |
| OR | Organe de révision |
| AG / CA | Assemblée générale / Conseil d'administration |
| EF | États financiers |
| PBC | *Prepared by client* (documents fournis par le client) |

---

## Architecture des fichiers

```
audit/
├── README.md              ← ce fichier
├── manifest.json          ← index navigable (app Python)
├── controle_ordinaire/
│   ├── _sommaire.md        ← sommaire cliquable
│   ├── partie_1_bases/
│   ├── partie_2_ethique/
│   ├── partie_3_processus/
│   │   └── 04_execution/
│   │       └── cycles/
│   └── partie_4_groupe/
└── controle_restreint/
    ├── _sommaire.md
    └── annexes/
```

- Le **plan « Contrôle ordinaire »** suit la structure officielle du
  MSA 2016 (Parties I à IV ; la Partie V « Glossaire » du MSA n'est pas
  reprise comme chapitre de cours).
- Le **plan « Contrôle restreint »** suit la structure officielle de la
  NCR 2022 (8 chapitres + 8 annexes), contenu généré depuis sources
  légales et publications libres (pas de PDF NCR en possession).

---

## Format d'une fiche

Chaque fiche `.md` suit un gabarit strict : référence MSA + bases légales
2026 + normes NA-CH/ISA + niveau Staff 1, puis 8 sections (concept clé,
importance, cadre légal, démarche pratique, exemple standard, pièges,
auto-test, liens) avec ancres Markdown `{#id}` pour la navigation.
Terme anglais clé glissé entre parenthèses la **première occurrence**
uniquement. Statut en pied de fiche : ✅ Complet / ⚠️ Partiel / 🔴 Stub.

---

*Dernière mise à jour : 2026-05-19
Statut : 🔴 Structure seule — en attente de validation du format avant
génération des fiches.*
