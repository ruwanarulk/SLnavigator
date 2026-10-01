import { containsContactDetails } from './contact-filter';

describe('containsContactDetails', () => {
  it.each([
    'call me on 0771234567',
    'my number is +94 77 123 4567',
    'ring 077-123-4567 any time',
    'email me at sam@gmail.com',
    'sam (at) gmail (dot) com',
    'message me on WhatsApp',
    'add me on telegram',
    'wa.me/94771234567',
    'find me on instagram',
    'visit www.mytours.lk',
    'https://example.com/me',
    'ping @sam_guide',
    'seven seven one two three four five six',
  ])('blocks %j', (text) => {
    expect(containsContactDetails(text)).toBe(true);
  });

  it.each([
    'We arrive on 12 January and leave on 20 January.',
    'The price is $1,250 for 3 people over 9 days.',
    'Could we start at 6:30 am? Sigiriya gets hot by 10.',
    'We are 2 adults and 1 child, aged 7.',
    'I have 8 years of experience guiding in the hill country.',
    'Yes, the train leaves Kandy at 08:47 and reaches Ella at 15:30.',
    'Is flight UL 504 landing at 21:15 okay?',
    'Thanks! That sounds lovely, see you soon.',
    'Our budget is 600 to 1000 dollars, ideally nearer 600.',
  ])('lets through %j', (text) => {
    expect(containsContactDetails(text)).toBe(false);
  });
});
