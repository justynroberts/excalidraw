// Daily request limits, per client IP and in total, kept in memory.
//
// Protects the Anthropic key on a public deployment: each Claude-backed request
// costs one unit. Counters reset at UTC midnight and on restart, which is fine
// for a cost guard (a restart can't be forced by a visitor).

const today = () => new Date().toISOString().slice(0, 10);

export const clientIp = (req, trustProxy) => {
  if (trustProxy) {
    const forwarded = String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim();
    if (forwarded) {
      return forwarded;
    }
  }
  return req.socket.remoteAddress || "unknown";
};

export class DailyLimiter {
  /**
   * @param {{perIp: number, total: number}} limits  0 disables a limit
   */
  constructor({ perIp, total }) {
    this.perIp = perIp;
    this.total = total;
    this.day = today();
    this.counts = new Map();
    this.totalCount = 0;
  }

  rollover() {
    const day = today();
    if (day !== this.day) {
      this.day = day;
      this.counts.clear();
      this.totalCount = 0;
    }
  }

  /** Take one unit for `ip`. Returns {ok, limit, remaining}. */
  take(ip) {
    this.rollover();
    const used = this.counts.get(ip) || 0;
    const perIpBlocked = this.perIp > 0 && used >= this.perIp;
    const totalBlocked = this.total > 0 && this.totalCount >= this.total;
    const limit = this.perIp || 0;
    if (perIpBlocked || totalBlocked) {
      return {
        ok: false,
        limit,
        remaining: 0,
        reason: totalBlocked ? "total" : "ip",
      };
    }
    this.counts.set(ip, used + 1);
    this.totalCount += 1;
    return {
      ok: true,
      limit,
      remaining: this.perIp > 0 ? this.perIp - used - 1 : -1,
    };
  }
}
