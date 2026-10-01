/**
 * Before a booking, messages stay on the platform: that is what makes
 * verification, reviews and (soon) payment protection work. This catches the
 * obvious ways of swapping contact details. It is a speed bump, not a wall, and
 * errs towards letting ordinary sentences through.
 */
const EMAIL = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,}/i;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|lk|me|io|co)\b\/?\S*/i;
const APP = /\b(?:whats\s?app|wa\.me|telegram|t\.me|viber|wechat|we\s?chat|signal\s?app|skype|messenger|insta(?:gram)?|facebook|fb\.com|imo\s?app|line\s?id)\b/i;
const HANDLE = /(?:^|\s)@[a-z0-9._]{3,}/i;

/** A run of 8+ digits, allowing spaces, dots, dashes, brackets and a leading +. Dates and prices are shorter. */
function hasPhoneNumber(text: string) {
  for (const run of text.match(/\+?\d[\d\s().-]{6,}\d/g) ?? []) {
    if (run.replace(/\D/g, '').length >= 8) return true;
  }
  // "seven seven one two three..." spelled out is a classic workaround.
  return /(?:\b(?:zero|one|two|three|four|five|six|seven|eight|nine)\b[\s,-]*){7,}/i.test(text);
}

export function containsContactDetails(text: string): boolean {
  return EMAIL.test(text) || URL.test(text) || APP.test(text) || HANDLE.test(text) || hasPhoneNumber(text);
}

export const CONTACT_BLOCKED_MESSAGE =
  'Please keep phone numbers, emails and chat handles out of messages until a trip is booked. Once the traveller accepts a bid, you will both see each other\'s contact details.';
