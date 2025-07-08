
// Location-related types (without pricing functionality)
export type LocationType = 'inside_cebu' | 'outside_cebu';

export interface LocationInfo {
  location_type: LocationType;
  region?: string;
  logistics_zone?: string;
}
