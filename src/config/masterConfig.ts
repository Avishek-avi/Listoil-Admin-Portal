// /lib/masterConfig.ts

import { client, userTypeLevelMaster, locationLevelMaster, skuLevelMaster, redemptionStatuses, userTypeEntity, locationEntity, skuEntity, skuVariant, schemeTypes, schemes, earningTypes, redemptionChannels, qrTypes, onboardingTypes, approvalStatuses, languages, creativesTypes, ticketTypes, ticketStatuses, eventMaster, pincodeMaster, skuPointConfig, participantSkuAccess, userScopeMapping, locationEntityPincode, creatives, campaigns, tickets, skuPointRules } from '@/db/schema'

// We need to import the tables themselves to get their schema for dynamic form generation
import { getTableConfig } from 'drizzle-orm/pg-core';

// This helper extracts column definitions from a Drizzle table
export const getTableColumns = (table: any) => {
  const config = getTableConfig(table);
  return config.columns;
};

// Define the order and grouping of master tables for bootstrapping
export const bootstrapConfig = [
  {
    groupTitle: '1. Core Masters',
    description: 'Fundamental configurations with no dependencies on other masters.',
    tables: [
      { name: 'Client', table: client },
      { name: 'User Type Level', table: userTypeLevelMaster },
      { name: 'Location Level', table: locationLevelMaster },
      { name: 'SKU Level', table: skuLevelMaster },
      { name: 'Scheme Types', table: schemeTypes },
      { name: 'Earning Types', table: earningTypes },
      { name: 'Redemption Channels', table: redemptionChannels },
      { name: 'Redemption Statuses', table: redemptionStatuses },
      { name: 'QR Types', table: qrTypes },
      { name: 'Onboarding Types', table: onboardingTypes },
      { name: 'Approval Statuses', table: approvalStatuses },
      { name: 'Languages', table: languages },
      { name: 'Creative Types', table: creativesTypes },
      { name: 'Ticket Types', table: ticketTypes },
      { name: 'Ticket Statuses', table: ticketStatuses },
      { name: 'Event Master', table: eventMaster },
      { name: 'Pincode Master', table: pincodeMaster },
    ],
  },
  {
    groupTitle: '2. Entity Masters',
    description: 'Configurations that depend on the core masters.',
    tables: [
      { name: 'User Type Entity', table: userTypeEntity }, // depends on userTypeLevelMaster
      { name: 'Location Entity', table: locationEntity },   // depends on client, locationLevelMaster
      { name: 'SKU Entity', table: skuEntity },             // depends on client, skuLevelMaster
    ],
  },
  {
    groupTitle: '3. Variant & Specific Masters',
    description: 'More specific configurations that depend on entity masters.',
    tables: [
      { name: 'SKU Variant', table: skuVariant }, // depends on skuEntity
      { name: 'Schemes', table: schemes },       // depends on schemeTypes
      { name: 'Campaigns', table: campaigns },   // depends on schemeTypes
      { name: 'Creatives', table: creatives },   // depends on creativesTypes
      { name: 'Tickets', table: tickets },       // depends on ticketTypes, ticketStatuses
    ],
  },
  {
    groupTitle: '4. Sub-Master Configurations (Mappings)',
    description: 'Complex configurations that tie multiple masters together.',
    tables: [
      { name: 'Location Entity Pincode', table: locationEntityPincode }, // depends on locationEntity, pincodeMaster
      { name: 'SKU Point Config', table: skuPointConfig },             // depends on client, skuVariant, userTypeEntity
      { name: 'SKU Point Rules', table: skuPointRules },               // depends on multiple masters (overrides)
      { name: 'Participant SKU Access', table: participantSkuAccess },   // depends on skuLevelMaster, skuEntity
      { name: 'User Scope Mapping', table: userScopeMapping },           // depends on userTypeEntity
    ],
  },
];