export const feedbackFeatures = ['controls', 'playback', 'seek', 'speed', 'volume', 'download', 'shortcuts', 'language', 'other'] as const;
export const feedbackSymptoms = ['not_working', 'missing', 'incorrect', 'slow', 'intermittent', 'other'] as const;
export interface FeedbackContext { formVersion: 1 | 2; feature: string | null; symptom: string | null; contextSchemaVersion: 2 | null; }

/** Optional categorical answers only. Diagnostic attachments are not enabled. */
export function parseFeedbackContext(input: Record<string, unknown>): FeedbackContext | null {
  if ('diagnostics' in input || 'consent' in input || 'diagnostic_consent' in input) return null;
  const formVersion = input.form_version ?? 1;
  if (formVersion !== 1 && formVersion !== 2) return null;
  if (formVersion === 1) {
    if ('feature' in input || 'symptom' in input || 'context_schema_version' in input) return null;
    return { formVersion: 1, feature: null, symptom: null, contextSchemaVersion: null };
  }
  const feature = input.feature ?? null, symptom = input.symptom ?? null;
  if (feature !== null && (typeof feature !== 'string' || !feedbackFeatures.includes(feature as typeof feedbackFeatures[number]))) return null;
  if (symptom !== null && (typeof symptom !== 'string' || !feedbackSymptoms.includes(symptom as typeof feedbackSymptoms[number]))) return null;
  if (symptom !== null && feature === null) return null;
  if ((feature !== null || symptom !== null) && input.reason !== 'bug' && input.reason !== 'broken') return null;
  if (input.context_schema_version !== undefined && input.context_schema_version !== 2) return null;
  return { formVersion: 2, feature, symptom, contextSchemaVersion: 2 };
}

/** V1 canonical bytes are unchanged; V2 uses the documented additive field order. */
export function canonicalFeedbackPayload(base: readonly unknown[], context: FeedbackContext): string {
  return JSON.stringify(context.formVersion === 1 ? [...base, 1] : [...base, 2, context.feature, context.symptom, 2]);
}
