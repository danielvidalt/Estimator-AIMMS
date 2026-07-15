-- Travel headcount now splits by transport mode: travel.travellingMembers
-- (a single number, assumed to fly) becomes travelByAirCount +
-- travelByCarCount + carDistanceKm (see TravelData in src/types.ts). travel
-- is stored as a jsonb blob (no separate columns), so existing rows are
-- backfilled in place -- old travellingMembers key is left alongside,
-- unused, rather than removed.

update public.quotes
set travel = travel || jsonb_build_object(
  'travelByAirCount', coalesce((travel->>'travellingMembers')::numeric, 0),
  'travelByCarCount', 0,
  'carDistanceKm', 0
)
where not (travel ? 'travelByAirCount');
