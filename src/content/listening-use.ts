export type ListeningActivity = {
  session: number; event: 'start' | 'progress' | 'pause' | 'ended' | 'boundary' | 'seek' | 'dispose';
  position: number; duration: number; rate: number; advancing: boolean; now: number;
};
// No source identity or content is retained. Credit only plausible forward media
// progress bounded by elapsed monotonic wall time; seeks reset the sampling anchor.
export class ListeningUse {
  private session = 0;
  private previous: ListeningActivity | null = null;
  private seconds = 0;
  private covered = 0;
  private whole = false;
  private counted = false;
  observe(a: ListeningActivity): boolean {
    if (a.event === 'start' || a.session !== this.session) {
      this.session = a.session; this.seconds = this.covered = 0; this.counted = false; this.whole = a.position <= .05;
      this.previous = a; return false;
    }
    const p = this.previous;
    if (a.event === 'seek') this.whole = false;
    if (p && ['progress', 'pause', 'ended'].includes(a.event) && p.advancing) {
      const elapsed = (a.now - p.now) / 1000, delta = a.position - p.position;
      if (elapsed > 0 && elapsed <= 2 && delta > 0 && delta <= elapsed * p.rate + .15) {
        this.seconds += Math.min(elapsed, delta / p.rate);
        this.covered += delta;
      } else if (delta < -.05 || delta > elapsed * p.rate + .15) this.whole = false;
    }
    this.previous = a;
    const completeShort = a.event === 'ended' && a.duration > 0 && a.duration < 20 && this.whole && this.covered >= a.duration - .1;
    if (!this.counted && (this.seconds >= 20 || completeShort)) { this.counted = true; return true; }
    return false;
  }
}
