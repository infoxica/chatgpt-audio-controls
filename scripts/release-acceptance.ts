// Only native Mac testing has an explicit owner waiver for this release.
// Missing fields and waivers on any other check must continue to block publishing.
export function acceptanceComplete(acceptance: Record<string, unknown> | null | undefined, version: string): boolean {
  return acceptance?.version === version
    && ['feedbackDeployment', 'chromeLive', 'edgeLive', 'websiteDeployment'].every(key => acceptance[key] === true)
    && (acceptance.nativeMac === true || acceptance.nativeMac === 'waived-by-owner');
}
