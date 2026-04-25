# SKU Masters and Dependency Tables Documentation

## Overview

This document explains the SKU (Stock Keeping Unit) master tables and their dependencies in the loyalty admin panel database schema. The system uses a hierarchical structure to manage products, variants, and their associated configurations.

---

## Table of Contents

1. [Core SKU Tables](#core-sku-tables)
2. [Hierarchical Structure](#hierarchical-structure)
3. [Supporting Tables](#supporting-tables)
4. [Relationships and Dependencies](#relationships-and-dependencies)
5. [Use Cases](#use-cases)
6. [Data Flow](#data-flow)

---

## Core SKU Tables

### 1. **SkuMasterModel** (`tbl_sku_master`)

This is the primary SKU master table that stores product information with a hierarchical categorization system.

**Purpose**: Central repository for all SKU (product) information with multi-level categorization.

**Schema**:
```typescript
{
  skuId: serial (Primary Key),
  skuCode: varchar(255) - Unique identifier for the SKU,
  skuDescription: varchar(255) - Human-readable description,
  skuPoints: integer - Points associated with this SKU,
  vertical: varchar(255) - Top-level product vertical (e.g., "Cables", "Switches"),
  range: varchar(255) - Product range/family,
  l1: varchar(255) - Level 1 category,
  l2: varchar(255) - Level 2 category,
  l3: varchar(255) - Level 3 category,
  l4: varchar(255) - Level 4 category,
  l5: varchar(255) - Level 5 category,
  l6: varchar(255) - Level 6 category,
  isSkuActive: boolean - Active status flag,
  createdAt: timestamp - Record creation timestamp
}
```

**Key Features**:
- **Unique SKU Code**: Each product has a unique identifier
- **6-Level Hierarchy**: Supports deep categorization (l1 through l6)
- **Points System**: Direct point assignment per SKU
- **Vertical & Range**: Additional classification dimensions
- **Active Status**: Soft delete capability

---

### 2. **skuLevelMaster** (`sku_level_master`)

Defines the hierarchical levels for SKU categorization.

**Purpose**: Establishes the structure and naming of SKU hierarchy levels.

**Schema**:
```typescript
{
  id: serial (Primary Key),
  clientId: integer - Reference to client,
  levelNo: integer - Numeric level identifier (1, 2, 3...),
  levelName: text - Name of the level (e.g., "Category", "Subcategory"),
  parentLevelId: integer - Self-referencing parent level
}
```

**Key Features**:
- **Multi-tenant**: Supports different clients with different hierarchies
- **Self-referencing**: Parent-child relationship between levels
- **Unique Constraint**: `(clientId, levelNo)` ensures one level per number per client

---

### 3. **skuEntity** (`sku_entity`)

Stores actual SKU entities at different hierarchy levels.

**Purpose**: Represents individual SKU items organized by the defined hierarchy levels.

**Schema**:
```typescript
{
  id: serial (Primary Key),
  clientId: integer - Reference to client,
  levelId: integer - Reference to skuLevelMaster,
  name: varchar(200) - Entity name,
  code: text - Entity code,
  parentEntityId: integer - Self-referencing parent entity,
  isActive: boolean - Active status
}
```

**Key Features**:
- **Hierarchical Organization**: Each entity belongs to a specific level
- **Parent-Child Relationships**: Entities can have parent entities
- **Multi-tenant Support**: Client-specific SKU entities
- **Flexible Naming**: Both name and code fields for identification

---

### 4. **skuVariant** (`sku_variant`)

Defines product variants (e.g., different sizes, colors, pack sizes).

**Purpose**: Manages different variants of the same SKU entity.

**Schema**:
```typescript
{
  id: serial (Primary Key),
  skuEntityId: integer - Reference to skuEntity,
  variantName: varchar(150) - Variant identifier,
  packSize: text - Package size information,
  mrp: numeric(10, 2) - Maximum Retail Price,
  isActive: boolean - Active status
}
```

**Key Features**:
- **Variant Management**: Multiple variants per SKU entity
- **Pricing Information**: MRP storage
- **Pack Size Tracking**: Useful for bulk/retail differentiation

---

### 5. **skuPointConfig** (`sku_point_config`)

Configures points for SKU variants based on user types.

**Purpose**: Defines how many points different user types earn for specific SKU variants.

**Schema**:
```typescript
{
  id: serial (Primary Key),
  clientId: integer - Reference to client,
  skuVariantId: integer - Reference to skuVariant,
  userTypeId: integer - Reference to userTypeEntity,
  pointsPerUnit: numeric(10, 2) - Points awarded per unit,
  validFrom: timestamp - Configuration start date,
  validTo: timestamp - Configuration end date,
  remarks: text - Additional notes
}
```

**Key Features**:
- **User-Type Specific**: Different points for different user roles
- **Time-bound Configuration**: Valid from/to dates for promotional periods
- **Unique Constraint**: `(clientId, skuVariantId, userTypeId)` prevents duplicates

---

## Hierarchical Structure

### SKU Hierarchy Flow

```
Client
  └── SKU Level Master (defines levels)
       └── SKU Entity (actual items at each level)
            └── SKU Variant (product variations)
                 └── SKU Point Config (points per user type)
```

### Example Hierarchy

```
Level 1: Category
  └── Level 2: Subcategory
       └── Level 3: Product Line
            └── Level 4: Product Type
                 └── Level 5: Specific Product
                      └── Level 6: SKU Code
```

**Practical Example**:
```
Vertical: Electrical
  └── Range: Cables
       └── L1: Power Cables
            └── L2: Heavy Duty
                 └── L3: 3-Core
                      └── L4: 10mm²
                           └── L5: 100m Roll
                                └── L6: SKU-CABLE-HD-3C-10MM-100M
```

---

## Supporting Tables

### 1. **client** (`client`)

**Purpose**: Multi-tenant client management.

```typescript
{
  id: serial (Primary Key),
  name: varchar(150) - Client name,
  code: text - Unique client code
}
```

---

### 2. **userTypeEntity** (`user_type_entity`)

**Purpose**: Defines different user types (Retailer, Electrician, Counter Sales, etc.).

```typescript
{
  id: serial (Primary Key),
  levelId: integer - Reference to userTypeLevelMaster,
  typeName: text - User type name,
  parentTypeId: integer - Self-referencing parent type,
  isActive: boolean - Active status
}
```

---

### 3. **participantSkuAccess** (`participant_sku_access`)

**Purpose**: Controls which users have access to which SKUs.

```typescript
{
  id: serial (Primary Key),
  userId: integer - Reference to users,
  skuLevelId: integer - Reference to skuLevelMaster,
  skuEntityId: integer - Reference to skuEntity,
  accessType: varchar(20) - 'specific' or 'all',
  validFrom: timestamp - Access start date,
  validTo: timestamp - Access end date,
  isActive: boolean - Active status
}
```

**Key Features**:
- **User-Specific Access**: Control SKU visibility per user
- **Level-Based Access**: Grant access at any hierarchy level
- **Time-bound Access**: Temporary access grants
- **Unique Constraint**: `(userId, skuLevelId, skuEntityId)` prevents duplicates

---

## Relationships and Dependencies

### Entity Relationship Diagram (Textual)

```
client
  ├── skuLevelMaster (clientId → client.id)
  │    └── skuEntity (levelId → skuLevelMaster.id)
  │         └── skuVariant (skuEntityId → skuEntity.id)
  │              └── skuPointConfig (skuVariantId → skuVariant.id)
  │
  └── skuPointConfig (clientId → client.id)

users
  └── participantSkuAccess (userId → users.id)
       ├── skuLevelMaster (skuLevelId → skuLevelMaster.id)
       └── skuEntity (skuEntityId → skuEntity.id)

userTypeEntity
  └── skuPointConfig (userTypeId → userTypeEntity.id)
```

### Foreign Key Relationships

| Child Table | Foreign Key | References | Description |
|-------------|-------------|------------|-------------|
| skuLevelMaster | clientId | client.id | Client ownership |
| skuEntity | clientId | client.id | Client ownership |
| skuEntity | levelId | skuLevelMaster.id | Hierarchy level |
| skuEntity | parentEntityId | skuEntity.id | Parent entity (self-ref) |
| skuVariant | skuEntityId | skuEntity.id | Parent SKU entity |
| skuPointConfig | clientId | client.id | Client ownership |
| skuPointConfig | skuVariantId | skuVariant.id | Variant reference |
| skuPointConfig | userTypeId | userTypeEntity.id | User type reference |
| participantSkuAccess | userId | users.id | User reference |
| participantSkuAccess | skuLevelId | skuLevelMaster.id | Level reference |
| participantSkuAccess | skuEntityId | skuEntity.id | Entity reference |

---

## Use Cases

### 1. **Product Catalog Management**

**Scenario**: Adding a new product to the system

**Steps**:
1. Define SKU levels in `skuLevelMaster` (if not already defined)
2. Create SKU entities in `skuEntity` at appropriate levels
3. Add product variants in `skuVariant`
4. Configure points for different user types in `skuPointConfig`

**Example**:
```sql
-- Create a new SKU entity
INSERT INTO sku_entity (clientId, levelId, name, code, parentEntityId)
VALUES (1, 3, 'Premium Cable 10mm', 'PC-10MM', 15);

-- Add variant
INSERT INTO sku_variant (skuEntityId, variantName, packSize, mrp)
VALUES (100, '100m Roll', '100m', 1500.00);

-- Configure points for retailers
INSERT INTO sku_point_config (clientId, skuVariantId, userTypeId, pointsPerUnit)
VALUES (1, 50, 2, 10.00);
```

---

### 2. **User Access Control**

**Scenario**: Granting a user access to specific SKU categories

**Steps**:
1. Identify the user and SKU level/entity
2. Create access record in `participantSkuAccess`
3. Set validity period and access type

**Example**:
```sql
-- Grant user access to all cables category
INSERT INTO participant_sku_access 
  (userId, skuLevelId, skuEntityId, accessType, validFrom, validTo)
VALUES 
  (123, 2, 15, 'specific', NOW(), '2025-12-31');
```

---

### 3. **Points Calculation**

**Scenario**: Calculate points when a user scans a QR code

**Query Flow**:
1. Get SKU code from QR code
2. Find matching SKU variant
3. Look up points configuration for user type
4. Award points based on configuration

**Example Query**:
```sql
SELECT spc.pointsPerUnit
FROM sku_point_config spc
JOIN sku_variant sv ON spc.skuVariantId = sv.id
JOIN sku_entity se ON sv.skuEntityId = se.id
WHERE se.code = 'SKU-CODE-123'
  AND spc.userTypeId = 2  -- Retailer
  AND NOW() BETWEEN spc.validFrom AND spc.validTo;
```

---

### 4. **Hierarchical Reporting**

**Scenario**: Generate sales report by product category

**Query**:
```sql
SELECT 
  parent.name AS category,
  child.name AS subcategory,
  COUNT(*) AS transaction_count,
  SUM(points) AS total_points
FROM retailer_transactions rt
JOIN sku_entity child ON rt.sku = child.code
JOIN sku_entity parent ON child.parentEntityId = parent.id
GROUP BY parent.name, child.name;
```

---

## Data Flow

### Transaction Processing Flow

```
1. User scans QR Code
   ↓
2. System extracts SKU code
   ↓
3. Lookup in skuEntity
   ↓
4. Find associated skuVariant
   ↓
5. Check participantSkuAccess (user has access?)
   ↓
6. Lookup skuPointConfig (get points for user type)
   ↓
7. Award points to user
   ↓
8. Record transaction
```

### SKU Setup Flow

```
1. Create Client (if new)
   ↓
2. Define SKU Levels (skuLevelMaster)
   ↓
3. Create SKU Entities (skuEntity) - hierarchical
   ↓
4. Add Product Variants (skuVariant)
   ↓
5. Configure Points (skuPointConfig)
   ↓
6. Set User Access (participantSkuAccess)
```

---

## Integration with Other Tables

### Transaction Tables

The SKU system integrates with transaction tables:

- **retailerTransactions**: `sku` field references SKU code
- **electricianTransactions**: `sku` field references SKU code
- **counterSalesTransactions**: `sku` field references SKU code

### QR Code System

- **qrCodes**: `sku` field links to SKU master
- **InventoryBatch**: `skuCode` field references SKU master
- **InventoryModel**: Links to batches which link to SKUs

### Points System

- **skuPointConfig**: Defines points per SKU variant per user type
- **earningTypes**: Categorizes different earning mechanisms
- **schemes**: Campaign-based point modifications

---

## Best Practices

### 1. **Hierarchy Design**
- Plan your SKU hierarchy before implementation
- Keep hierarchy depth reasonable (3-5 levels typically sufficient)
- Use consistent naming conventions across levels

### 2. **Point Configuration**
- Always set validity periods for point configurations
- Document point changes in remarks field
- Review and update point configurations regularly

### 3. **Access Control**
- Use level-based access for broad permissions
- Use entity-based access for specific restrictions
- Regularly audit access permissions

### 4. **Data Integrity**
- Always use foreign key constraints
- Implement soft deletes (isActive flags) instead of hard deletes
- Maintain audit trails for SKU changes

### 5. **Performance**
- Index frequently queried fields (skuCode, code)
- Use materialized views for complex hierarchical queries
- Cache SKU hierarchy data in application layer

---

## Common Queries

### Get SKU Hierarchy Path
```sql
WITH RECURSIVE sku_path AS (
  SELECT id, name, code, parentEntityId, 1 AS level
  FROM sku_entity
  WHERE id = 100  -- Target SKU
  
  UNION ALL
  
  SELECT se.id, se.name, se.code, se.parentEntityId, sp.level + 1
  FROM sku_entity se
  JOIN sku_path sp ON se.id = sp.parentEntityId
)
SELECT * FROM sku_path ORDER BY level DESC;
```

### Get All Variants with Points
```sql
SELECT 
  se.name AS sku_name,
  sv.variantName,
  sv.packSize,
  sv.mrp,
  ute.typeName AS user_type,
  spc.pointsPerUnit
FROM sku_variant sv
JOIN sku_entity se ON sv.skuEntityId = se.id
JOIN sku_point_config spc ON sv.id = spc.skuVariantId
JOIN user_type_entity ute ON spc.userTypeId = ute.id
WHERE se.isActive = true AND sv.isActive = true;
```

### Get User's Accessible SKUs
```sql
SELECT DISTINCT se.*
FROM sku_entity se
JOIN participant_sku_access psa ON se.id = psa.skuEntityId
WHERE psa.userId = 123
  AND psa.isActive = true
  AND NOW() BETWEEN psa.validFrom AND COALESCE(psa.validTo, NOW());
```

---

## Migration Considerations

### From Legacy SKU Master

The system has both:
- **New System**: `skuEntity`, `skuVariant`, `skuLevelMaster`
- **Legacy System**: `SkuMasterModel` (tbl_sku_master)

**Migration Strategy**:
1. Map legacy `vertical` and `range` to new hierarchy levels
2. Map `l1-l6` fields to `skuEntity` hierarchy
3. Create variants from unique SKU codes
4. Migrate `skuPoints` to `skuPointConfig`
5. Maintain both systems during transition period

---

## Conclusion

The SKU master and dependency tables provide a flexible, hierarchical system for managing products in the loyalty program. The design supports:

- ✅ Multi-tenant architecture
- ✅ Deep product categorization
- ✅ Flexible variant management
- ✅ User-type specific point configurations
- ✅ Granular access control
- ✅ Time-bound configurations
- ✅ Audit and tracking capabilities

This structure enables complex loyalty program scenarios while maintaining data integrity and performance.
