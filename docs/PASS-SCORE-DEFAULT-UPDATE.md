# PASS Score Default Value Update

**Date**: November 4, 2025  
**Change**: Updated default passScore from -1.0 to 0.0

## Summary

The default value for the `passScore` parameter (score assigned to players who choose the PASS action) has been changed from **-1.0** to **0.0**.

## Rationale

- Makes PASS a neutral option by default (0 points) rather than a penalty
- Admin can still configure it to -1 if they want to penalize PASS behavior
- Aligns with the game rules documentation which specifies "Passed: score 0"

## Files Modified

### Database Schema
- **prisma/schema.prisma**: Changed `passScore Float @default(0.0)`
- **prisma/migrations/20251104000000_add_pass_score/migration.sql**: Migration file created with default 0.0

### API Endpoints
- **app/api/admin/create-new-game/route.ts**: New games created with `passScore: 0.0`

### UI Components
- **app/admin/dashboard/page.tsx**: Initial state changed to `useState<number>(0.0)`

### Database
- Existing game records updated from -1.0 to 0.0 via SQL UPDATE

## Implementation Details

### Game Rules (Unchanged)
The scoring formulas in `lib/calculateDelegationGraph.ts` remain unchanged:
- **Direct PASS**: Uses the `passScore` parameter value (now defaults to 0)
- **Delegate to PASS**: Flat penalty of -1 (regardless of passScore setting)

### Admin Controls
The admin dashboard allows configuring passScore between -1 and 0:
- **Pre-game**: Slider control (range: -1 to 0, step: 1)
- **Active game**: Number input (range: -1 to 0, step: 1)

## Documentation Status

✅ **docs/game.md** - Already correct, specifies "Passed: score 0"  
✅ No other documentation updates needed

## Migration Notes

For fresh deployments:
- Migration will automatically set passScore = 0.0 for new Game records

For existing deployments:
- Use SQL to update existing games if needed:
  ```sql
  UPDATE "Game" SET "passScore" = 0.0 WHERE "passScore" = -1.0;
  ```

## Testing Recommendations

1. Create a new game and verify passScore defaults to 0
2. Test admin UI slider/input controls work correctly
3. Verify scoring calculations use the configured passScore value
4. Run existing test scripts to ensure no regressions
