import { Injectable, Logger } from '@nestjs/common';

/**
 * Sends transactional email through Resend when RESEND_API_KEY and EMAIL_FROM
 * are set; otherwise it quietly does nothing (local dev, staging without a
 * sending domain). Never throws: a failed email must not fail the request.
 */
@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private readonly key = process.env.RESEND_API_KEY;
  private readonly from = process.env.EMAIL_FROM;

  get enabled() {
    return !!this.key && !!this.from;
  }

  async send(to: string, subject: string, text: string): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to, subject, text }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}`);
      return true;
    } catch (e) {
      this.log.warn(`Email to ${to.replace(/(.).*@/, '$1***@')} failed: ${(e as Error).message}`);
      return false;
    }
  }
}
