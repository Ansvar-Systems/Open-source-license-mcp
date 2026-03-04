let cachedDataAge: string | null = null;

export function setDataAge(date: string): void {
  cachedDataAge = date;
}

export function responseMeta(): Record<string, unknown> {
  return {
    _meta: {
      disclaimer: 'Reference tool only. Not legal advice. Verify against authoritative sources.',
      data_age: cachedDataAge ?? new Date().toISOString().split('T')[0],
    },
  };
}
