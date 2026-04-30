// Canonical milestone order used across the UI.
// Serial order requested: Competitive Analysis, Market Analysis, Brand Bible, Buyer Personas, Blueprint.

export const MILESTONES = [
  {
    key: 'competitive_analysis',
    label: 'Competitive Analysis',
    sub: 'Positioning & competitor landscape',
  },
  {
    key: 'market_analysis',
    label: 'Market Analysis',
    sub: 'Industry, TAM, trends',
  },
  {
    key: 'brand_bible',
    label: 'Brand Bible',
    sub: 'Voice, identity, guidelines',
  },
  {
    key: 'buyer_personas',
    label: 'Buyer Personas',
    sub: 'Psychographic profiles',
  },
  {
    key: 'blueprint',
    label: 'Company Blueprint',
    sub: 'Strategic synthesis',
  },
];

export const MILESTONE_KEYS = MILESTONES.map((m) => m.key);

export function milestoneLabel(key) {
  return MILESTONES.find((m) => m.key === key)?.label ?? key;
}
