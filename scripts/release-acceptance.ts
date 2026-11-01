// A release may record an explicit owner waiver for native Mac testing only.
// Missing fields and waivers on any other check continue to block publishing.
export function acceptanceComplete(acceptance: Record<string, unknown> | null | undefined, version: string): boolean {
  const [major, minor] = version.split('.').map(Number);
  const requiresAndroid = major > 1 || major === 1 && minor >= 4;
  return acceptance?.version === version
    && ['feedbackDeployment', 'chromeLive', 'edgeLive', 'websiteDeployment', 'userscriptLive'].every(key => acceptance[key] === true)
    && (!requiresAndroid || acceptance.edgeAndroidLive === true)
    && (acceptance.nativeMac === true || acceptance.nativeMac === 'waived-by-owner');
}
