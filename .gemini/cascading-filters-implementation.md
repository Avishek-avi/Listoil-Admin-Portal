# Cascading Filters Implementation for QR Management

## Overview
Implemented cascading dropdown filters for L1-L6 levels in the QR Management page. The filters now show only values that **actually exist in `tbl_sku_master`** based on previous selections.

## Changes Made

### 1. Repository Layer (`sku-level-repository.ts`)
**Location**: `src/server/repositories/sku-level-repository.ts`

**Changes**:
- Modified all fetch methods (`fetchL1` to `fetchL6`) to query `SkuMasterModel` (tbl_sku_master) instead of just querying the level master tables
- Each method now:
  1. Queries `tbl_sku_master` to get distinct L values based on parent selections
  2. Filters by `isSkuActive = true` and ensures the level value is not null
  3. Returns the corresponding level master records that match the distinct IDs found

**Example Logic for L2**:
```typescript
async fetchL2(l1Id?: number) {
    let whereConditions = [
        eq(SkuMasterModel.isSkuActive, true),
        isNotNull(SkuMasterModel.l2)
    ];

    if (l1Id) {
        whereConditions.push(eq(SkuMasterModel.l1, l1Id));
    }

    // Get distinct L2 IDs from SKU master
    const distinctL2s = await db
        .selectDistinct({ l2: SkuMasterModel.l2 })
        .from(SkuMasterModel)
        .where(and(...whereConditions));

    const l2Ids = distinctL2s.map(item => item.l2).filter(id => id !== null);
    
    if (l2Ids.length === 0) return [];

    // Fetch L2 master records for these IDs
    return await db
        .select()
        .from(SkuLevel2Master)
        .where(
            and(
                eq(SkuLevel2Master.isActive, true),
                sql`${SkuLevel2Master.id} = ANY(${l2Ids})`
            )
        );
}
```

### 2. Service Layer (`sku-level.service.ts`)
**Location**: `src/server/services/sku-level.service.ts`

**Changes**:
- Updated method signatures to accept all parent level IDs
- `getL3` now accepts `l1Id` and `l2Id`
- `getL4` now accepts `l1Id`, `l2Id`, and `l3Id`
- And so on...

### 3. Actions Layer (`sku-level.actions.ts`)
**Location**: `src/app/actions/sku-level.actions.ts`

**Changes**:
- Updated all action functions to accept and pass all parent level IDs
- This allows the frontend to pass the full selection chain

### 4. Frontend (`page.tsx`)
**Location**: `src/app/(admin)/qr-management/page.tsx`

**Changes**:
Implemented cascading dropdown logic with multiple `useEffect` hooks:

1. **On Mount**: Only fetch L1 values
2. **When L1 changes**: 
   - Fetch L2 based on selected L1
   - Reset L2-L6 selections and clear their lists
3. **When L2 changes**:
   - Fetch L3 based on selected L1 and L2
   - Reset L3-L6 selections and clear their lists
4. **Pattern continues for L4, L5, L6**

**Key Behavior**:
- Each level dropdown only shows values that exist in `tbl_sku_master` for the current parent selection(s)
- When a parent level is changed, all child levels are reset
- The SKU dropdown is filtered based on all selected levels

## Example User Flow

1. **User loads page** → Only L1 dropdown is populated
2. **User selects L1 = "Electronics"** → L2 dropdown populated with only L2 values that exist for Electronics in tbl_sku_master
3. **User selects L2 = "Mobile Phones"** → L3 dropdown populated with only L3 values for Electronics + Mobile Phones
4. **User changes L1 to "Appliances"** → L2-L6 selections cleared, L2 repopulated with L2 values for Appliances
5. **User continues selecting** → Each subsequent level shows only valid options

## Benefits

1. **Data-Driven**: Only shows options that actually have SKUs in the database
2. **Better UX**: Users can't select invalid combinations
3. **Efficient**: Reduces unnecessary query results
4. **Maintainable**: Clear separation of concerns across layers

## Testing Recommendations

1. Test with various L1 selections to ensure L2 populates correctly
2. Test changing parent selections to verify child selections reset
3. Test with empty results at any level
4. Verify SKU filtering works with all level combinations
5. Check performance with large datasets
