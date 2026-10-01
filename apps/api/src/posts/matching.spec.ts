import { canServe, matchRequest } from './matching';

const guide = { type: 'GUIDE' as const, areas: ['hill', 'cultural'], languages: ['English', 'German'], specialties: ['Birding', 'Tea country', 'Hiking'] };
const req = { need: 'GUIDE_AND_TRANSPORT' as const, regions: ['hill', 'south'], interests: ['birding', 'tea', 'beaches'], languages: ['German', 'French'] };

describe('matchRequest', () => {
  it('matches a guide who covers a region on the route', () => {
    expect(matchRequest(guide, req).matches).toBe(true);
  });

  it('does not match when no region overlaps', () => {
    expect(matchRequest(guide, { ...req, regions: ['north', 'east'] }).matches).toBe(false);
  });

  it('explains the fit with specialties and languages, ignoring what the guide lacks', () => {
    expect(matchRequest(guide, req).tags).toEqual(['Birding', 'Tea country', 'Speaks German']);
  });

  it('keeps drivers off guide requests and guides off driver-only requests', () => {
    expect(canServe('TRANSPORT', 'GUIDE_AND_TRANSPORT')).toBe(false);
    expect(canServe('TRANSPORT', 'TRANSPORT_ONLY')).toBe(true);
    expect(canServe('GUIDE', 'TRANSPORT_ONLY')).toBe(false);
    expect(canServe('COMPANY', 'GUIDE_ONLY')).toBe(true);
    expect(canServe('COMPANY', 'TRANSPORT_ONLY')).toBe(true);
  });
});
