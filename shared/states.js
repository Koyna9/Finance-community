// US state name -> 2-letter code (50 states + DC). Used for titles like "Austin, TX".

export const STATE_CODES = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "District of Columbia": "DC",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL",
  "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA",
  "Maine": "ME", "Maryland": "MD", "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN",
  "Mississippi": "MS", "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR",
  "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA",
  "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
};

// Reverse lookup, so "TX" can also be read as "Texas" if the API ever sends codes.
const NAME_BY_CODE = Object.fromEntries(
  Object.entries(STATE_CODES).map(([name, code]) => [code, name])
);

// Returns the official state name for a name or code (any case), or null if it isn't a US state.
export function normalizeState(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (NAME_BY_CODE[v.toUpperCase()]) return NAME_BY_CODE[v.toUpperCase()];
  const lower = v.toLowerCase();
  if (lower === "washington, d.c." || lower === "washington dc" || lower === "d.c.") {
    return "District of Columbia";
  }
  return Object.keys(STATE_CODES).find((name) => name.toLowerCase() === lower) ?? null;
}

export function stateCode(name) {
  return STATE_CODES[name] ?? null;
}
