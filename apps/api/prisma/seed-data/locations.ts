/**
 * Curated launch content. Coordinates are real; fees are approximate
 * foreign-visitor prices in USD and hours are typical. `verifiedAt` stays null
 * until ops checks each against an official source, and the UI says so.
 */
export interface SeedLocation {
  slug: string;
  name: string;
  nameSi?: string;
  nameTa?: string;
  category: string;
  region: string;
  tags: string[];
  lat: number;
  lng: number;
  summary: string;
  description: string;
  bestTime?: string;
  entryFeeUsd?: number;
  openingHours?: string;
  avgDurationMin?: number;
  accessibility?: string;
  safety?: string;
  amenities?: string[];
  rating?: number;
  reviewCount?: number;
  hue?: string;
}

export const LOCATIONS: SeedLocation[] = [
  // West
  {
    slug: 'colombo', name: 'Colombo', nameSi: 'කොළඹ', nameTa: 'கொழும்பு',
    category: 'town', region: 'west', tags: ['food', 'culture'], lat: 6.9271, lng: 79.8612,
    summary: 'The commercial capital: street food, colonial streets and a seafront promenade.',
    description: 'Most trips start or end here. Walk the Fort and Pettah markets, eat hoppers and kottu on Galle Face Green at sunset, and use the city as a buffer day around long-haul flights.',
    bestTime: 'December to March', avgDurationMin: 360, rating: 4.3, reviewCount: 3120, hue: 'sea',
    amenities: ['ATMs', 'Hospitals', 'Pharmacies', 'Restrooms'],
    safety: 'Busy traffic; use metered tuk-tuks or ride-hailing apps.',
  },
  {
    slug: 'gangaramaya-temple', name: 'Gangaramaya Temple',
    category: 'temple', region: 'west', tags: ['culture'], lat: 6.9166, lng: 79.8563,
    summary: 'An eclectic Buddhist temple and museum beside Beira Lake.',
    description: 'A working temple packed with statues, relics and gifts from around the world, next to the calm Seema Malaka pavilion on the lake.',
    entryFeeUsd: 3, openingHours: '6:00–22:00', avgDurationMin: 75, rating: 4.4, reviewCount: 1840, hue: 'saffron',
    accessibility: 'Mostly flat; shoes off inside.', safety: 'Cover shoulders and knees.',
  },
  {
    slug: 'negombo', name: 'Negombo', nameSi: 'මීගමුව', nameTa: 'நீர்கொழும்பு',
    category: 'beach', region: 'west', tags: ['beaches', 'food'], lat: 7.2083, lng: 79.8358,
    summary: 'Fishing town and beach 20 minutes from the airport.',
    description: 'An easy first or last night: lagoon boat trips, a lively fish market in the morning and a long beach at sunset.',
    bestTime: 'December to March', avgDurationMin: 240, rating: 4.1, reviewCount: 1560, hue: 'sea',
    amenities: ['ATMs', 'Hospitals', 'Restrooms'],
  },
  {
    slug: 'bentota', name: 'Bentota', category: 'beach', region: 'west', tags: ['beaches', 'wellness'],
    lat: 6.421, lng: 79.996,
    summary: 'Wide golden beach with river safaris and Ayurveda resorts.',
    description: 'A quieter stretch of the west coast known for water sports on the Bentota river and long-stay Ayurveda retreats.',
    bestTime: 'November to April', avgDurationMin: 300, rating: 4.3, reviewCount: 980, hue: 'sea',
  },
  {
    slug: 'kalpitiya', name: 'Kalpitiya', category: 'beach', region: 'west', tags: ['wildlife', 'adventure'],
    lat: 8.2333, lng: 79.7667,
    summary: 'Kitesurfing lagoon and dolphin-watching boats.',
    description: 'A sandy peninsula north of Puttalam. Kite season runs May to October; spinner-dolphin trips run November to April.',
    bestTime: 'May to October (kite), November to April (dolphins)', avgDurationMin: 360, rating: 4.4, reviewCount: 410, hue: 'sea',
  },
  // Cultural Triangle
  {
    slug: 'sigiriya', name: 'Sigiriya Rock', nameSi: 'සීගිරිය', nameTa: 'சிகிரியா',
    category: 'heritage', region: 'cultural', tags: ['culture', 'adventure'], lat: 7.957, lng: 80.7603,
    summary: 'A 5th-century rock fortress with frescoes and a lion-paw gate.',
    description: 'Climb about 1,200 steps past water gardens, the mirror wall and painted maidens to palace ruins on the summit. Go at opening time to beat the heat and the queues.',
    bestTime: 'January to April', entryFeeUsd: 36, openingHours: '7:00–17:30', avgDurationMin: 210,
    accessibility: 'Steep steps and exposed metal stairways; not suitable for wheelchairs.',
    safety: 'Wasps nest on the rock face; follow staff instructions if a closure is called.',
    amenities: ['Restrooms', 'Parking', 'Museum'], rating: 4.8, reviewCount: 8120, hue: 'sand',
  },
  {
    slug: 'pidurangala', name: 'Pidurangala Rock', category: 'hike', region: 'cultural', tags: ['adventure', 'culture'],
    lat: 7.9667, lng: 80.7597,
    summary: 'A short scramble with the best view of Sigiriya.',
    description: 'Start at a cave temple and finish with a boulder scramble to a flat summit facing Sigiriya. Popular at sunrise.',
    entryFeeUsd: 4, openingHours: '5:00–18:00', avgDurationMin: 120, rating: 4.7, reviewCount: 2310, hue: 'sand',
    accessibility: 'Rough steps and a final scramble.', safety: 'Bring a torch before sunrise.',
  },
  {
    slug: 'dambulla-cave-temple', name: 'Dambulla Cave Temple', nameSi: 'දඹුල්ල', nameTa: 'தம்புள்ளை',
    category: 'temple', region: 'cultural', tags: ['culture'], lat: 7.8567, lng: 80.649,
    summary: 'Five painted caves filled with Buddha statues.',
    description: 'A UNESCO site where the cave ceilings are covered in murals. A 15-minute climb from the road; monkeys on the path.',
    entryFeeUsd: 7, openingHours: '7:00–19:00', avgDurationMin: 90, rating: 4.6, reviewCount: 3050, hue: 'saffron',
    safety: 'Shoes off at the entrance; the rock gets hot by midday.',
  },
  {
    slug: 'polonnaruwa', name: 'Polonnaruwa', nameSi: 'පොළොන්නරුව', nameTa: 'பொலன்னறுவை',
    category: 'heritage', region: 'cultural', tags: ['culture'], lat: 7.9403, lng: 81.0188,
    summary: 'Medieval royal city, best explored by bicycle.',
    description: 'Palaces, dagobas and the rock-cut Buddhas of Gal Vihara spread across a compact site beside a huge reservoir.',
    bestTime: 'January to September', entryFeeUsd: 30, openingHours: '7:00–18:00', avgDurationMin: 300,
    amenities: ['Bicycle hire', 'Museum', 'Restrooms'], rating: 4.7, reviewCount: 2780, hue: 'sand',
  },
  {
    slug: 'anuradhapura', name: 'Anuradhapura', nameSi: 'අනුරාධපුරය', nameTa: 'அனுராதபுரம்',
    category: 'heritage', region: 'cultural', tags: ['culture'], lat: 8.3114, lng: 80.4037,
    summary: 'The first capital: vast stupas and the sacred Bodhi tree.',
    description: 'A sprawling sacred city with giant white dagobas and Sri Maha Bodhi, grown from a cutting of the tree under which the Buddha was enlightened.',
    entryFeeUsd: 30, openingHours: '7:00–18:00', avgDurationMin: 360, rating: 4.6, reviewCount: 1980, hue: 'sand',
    safety: 'Wear white or light clothing at the sacred sites.',
  },
  {
    slug: 'minneriya', name: 'Minneriya National Park', category: 'wildlife', region: 'cultural', tags: ['wildlife', 'birding'],
    lat: 8.0333, lng: 80.8833,
    summary: 'Hundreds of elephants gather on the reservoir in the dry season.',
    description: 'From about July to October, "the Gathering" brings large herds to the shrinking tank. Jeep safaris run morning and afternoon.',
    bestTime: 'July to October', entryFeeUsd: 25, openingHours: '6:00–18:00', avgDurationMin: 210, rating: 4.5, reviewCount: 1420, hue: 'leaf',
    safety: 'Stay in the jeep; keep distance from elephants.',
  },
  // Hill country
  {
    slug: 'kandy', name: 'Kandy', nameSi: 'මහනුවර', nameTa: 'கண்டி',
    category: 'town', region: 'hill', tags: ['culture', 'food'], lat: 7.2906, lng: 80.6337,
    summary: 'The last royal capital, set around a lake in the hills.',
    description: 'Base for the Temple of the Tooth, the botanic gardens and the start of the scenic train into tea country. In July or August the Esala Perahera fills the streets.',
    bestTime: 'January to April', avgDurationMin: 360, rating: 4.5, reviewCount: 4210, hue: 'leaf',
    amenities: ['ATMs', 'Hospitals', 'Railway station'],
  },
  {
    slug: 'temple-of-the-tooth', name: 'Temple of the Sacred Tooth Relic',
    category: 'temple', region: 'hill', tags: ['culture'], lat: 7.2936, lng: 80.6413,
    summary: 'Sri Lanka\'s most important Buddhist shrine.',
    description: 'Home to a tooth relic of the Buddha. Time your visit for a puja, when drums sound and the relic chamber opens.',
    entryFeeUsd: 7, openingHours: '5:30–20:00', avgDurationMin: 90, rating: 4.6, reviewCount: 5230, hue: 'saffron',
    safety: 'Cover shoulders and knees; bag checks at the gate.',
  },
  {
    slug: 'peradeniya-gardens', name: 'Royal Botanic Gardens, Peradeniya',
    category: 'nature', region: 'hill', tags: ['birding', 'wellness'], lat: 7.2691, lng: 80.5968,
    summary: 'Orchid house, giant fig trees and fruit bats.',
    description: 'Some 60 hectares of lawns, palm avenues and an orchid house on a bend of the Mahaweli river, just outside Kandy.',
    entryFeeUsd: 10, openingHours: '7:30–17:00', avgDurationMin: 150, rating: 4.6, reviewCount: 2640, hue: 'leaf',
    accessibility: 'Paved main paths; wheelchair friendly in most areas.',
  },
  {
    slug: 'knuckles-range', name: 'Knuckles Range', category: 'hike', region: 'hill', tags: ['adventure', 'birding'],
    lat: 7.45, lng: 80.7833,
    summary: 'Cloud forest trails and remote villages north-east of Kandy.',
    description: 'A UNESCO-listed mountain range with day hikes and multi-day treks. A local guide is strongly recommended.',
    entryFeeUsd: 5, avgDurationMin: 420, rating: 4.7, reviewCount: 520, hue: 'leaf',
    safety: 'Leeches in wet months; trails are poorly signed.',
  },
  {
    slug: 'kitulgala', name: 'Kitulgala', category: 'nature', region: 'hill', tags: ['adventure'],
    lat: 6.9895, lng: 80.4172,
    summary: 'White-water rafting on the Kelani river.',
    description: 'A rainforest village with grade 2–3 rapids, canyoning and jungle walks, on the road from Colombo to the hills.',
    avgDurationMin: 240, rating: 4.5, reviewCount: 610, hue: 'leaf',
  },
  {
    slug: 'nuwara-eliya', name: 'Nuwara Eliya', nameSi: 'නුවරඑළිය', nameTa: 'நுவரெலியா',
    category: 'town', region: 'hill', tags: ['tea'], lat: 6.9497, lng: 80.7891,
    summary: '"Little England": cool air, tea estates and colonial bungalows.',
    description: 'At about 1,900 m, the highest town on the island. Tour a tea factory, walk Gregory Lake and pack a jacket for the evenings.',
    bestTime: 'February to April', avgDurationMin: 300, rating: 4.3, reviewCount: 2150, hue: 'leaf',
    amenities: ['ATMs', 'Hospital'],
  },
  {
    slug: 'horton-plains', name: 'Horton Plains & World\'s End', category: 'hike', region: 'hill', tags: ['adventure', 'birding', 'wildlife'],
    lat: 6.8023, lng: 80.8065,
    summary: 'A 9 km loop across high plains to an 870 m drop.',
    description: 'Arrive early: mist usually covers the World\'s End view by 10 am. The loop also passes Baker\'s Falls.',
    entryFeeUsd: 25, openingHours: '6:00–16:00', avgDurationMin: 240, rating: 4.6, reviewCount: 2890, hue: 'leaf',
    safety: 'No plastic allowed; bags are checked at the gate.',
  },
  {
    slug: 'adams-peak', name: 'Adam\'s Peak (Sri Pada)', category: 'hike', region: 'hill', tags: ['adventure', 'culture'],
    lat: 6.8096, lng: 80.4994,
    summary: 'An overnight pilgrimage climb to a sunrise summit.',
    description: 'Around 5,500 steps to a shrine revered by Buddhists, Hindus, Muslims and Christians. The main season runs December to May, when the path is lit.',
    bestTime: 'December to May', avgDurationMin: 480, rating: 4.7, reviewCount: 3310, hue: 'leaf',
    safety: 'Start around 2 am; it is cold at the top.',
  },
  {
    slug: 'haputale', name: 'Haputale', category: 'town', region: 'hill', tags: ['tea'],
    lat: 6.7667, lng: 80.9667,
    summary: 'Ridge-top town with views over the southern plains.',
    description: 'A quieter alternative to Ella, surrounded by tea estates and a stop on the hill-country railway.',
    avgDurationMin: 240, rating: 4.4, reviewCount: 620, hue: 'leaf',
  },
  {
    slug: 'liptons-seat', name: 'Lipton\'s Seat', category: 'viewpoint', region: 'hill', tags: ['tea'],
    lat: 6.7936, lng: 80.9731,
    summary: 'The tea baron\'s favourite lookout over Dambatenne estate.',
    description: 'Walk or tuk-tuk up through tea bushes to a view across several provinces on a clear morning.',
    entryFeeUsd: 1, openingHours: '6:00–18:00', avgDurationMin: 150, rating: 4.6, reviewCount: 940, hue: 'leaf',
  },
  {
    slug: 'ella', name: 'Ella', nameSi: 'ඇල්ල', nameTa: 'எல்ல',
    category: 'town', region: 'hill', tags: ['tea', 'adventure'], lat: 6.8667, lng: 81.0466,
    summary: 'Backpacker-friendly village among tea hills and waterfalls.',
    description: 'The finishing point of the Kandy–Ella train. Stay two nights to walk Little Adam\'s Peak, Ella Rock and the Nine Arch Bridge.',
    bestTime: 'January to April', avgDurationMin: 360, rating: 4.8, reviewCount: 5120, hue: 'leaf',
    amenities: ['ATMs', 'Railway station'],
  },
  {
    slug: 'nine-arch-bridge', name: 'Nine Arch Bridge', nameSi: 'ආරුක්කු නවයේ පාලම',
    category: 'viewpoint', region: 'hill', tags: ['culture', 'tea'], lat: 6.8768, lng: 81.0608,
    summary: 'A colonial-era railway viaduct in the tea hills.',
    description: 'Reached by a short walk through plantations. Come early for mist and fewer people, and check the train times so you catch one crossing.',
    entryFeeUsd: 0, openingHours: 'Always open', avgDurationMin: 60, rating: 4.8, reviewCount: 2140, hue: 'leaf',
    safety: 'Do not walk on the tracks when a train is due.',
  },
  {
    slug: 'little-adams-peak', name: 'Little Adam\'s Peak', category: 'hike', region: 'hill', tags: ['adventure'],
    lat: 6.8702, lng: 81.0617,
    summary: 'An easy 90-minute walk to a ridge above Ella Gap.',
    description: 'A gentle climb through tea estates to a summit with views of Ella Rock and the gap to the plains.',
    entryFeeUsd: 0, openingHours: 'Always open', avgDurationMin: 90, rating: 4.8, reviewCount: 3480, hue: 'leaf',
  },
  {
    slug: 'ella-rock', name: 'Ella Rock', category: 'hike', region: 'hill', tags: ['adventure'],
    lat: 6.8532, lng: 81.0412,
    summary: 'A half-day hike with a wide view over Ella.',
    description: 'Steeper and longer than Little Adam\'s Peak. Start early; hire a local guide if you are unsure of the route.',
    avgDurationMin: 240, rating: 4.6, reviewCount: 1560, hue: 'leaf',
  },
  {
    slug: 'ravana-falls', name: 'Ravana Falls', category: 'waterfall', region: 'hill', tags: ['adventure'],
    lat: 6.8406, lng: 81.0536,
    summary: 'A roadside waterfall on the way down from Ella.',
    description: 'One of the widest falls on the island, at its fullest after the rains.',
    entryFeeUsd: 0, avgDurationMin: 30, rating: 4.2, reviewCount: 1890, hue: 'leaf',
    safety: 'Rocks are slippery; swimming is not advised.',
  },
  // South
  {
    slug: 'sinharaja', name: 'Sinharaja Forest Reserve', category: 'nature', region: 'south', tags: ['birding', 'wildlife', 'adventure'],
    lat: 6.4, lng: 80.5,
    summary: 'The island\'s last large stretch of primary rainforest.',
    description: 'A UNESCO site famous for endemic birds, frogs and mixed-species bird flocks. Guided walks only.',
    entryFeeUsd: 15, openingHours: '6:30–18:00', avgDurationMin: 300, rating: 4.6, reviewCount: 720, hue: 'leaf',
    safety: 'Leech socks recommended.',
  },
  {
    slug: 'udawalawe', name: 'Udawalawe National Park', category: 'wildlife', region: 'south', tags: ['wildlife'],
    lat: 6.4747, lng: 80.8986,
    summary: 'The most reliable place to see wild elephants.',
    description: 'Open grassland around a reservoir makes elephants easy to spot year-round. Combine with the Elephant Transit Home feeding.',
    entryFeeUsd: 25, openingHours: '6:00–18:00', avgDurationMin: 210, rating: 4.6, reviewCount: 2210, hue: 'leaf',
  },
  {
    slug: 'yala', name: 'Yala National Park', category: 'wildlife', region: 'south', tags: ['wildlife', 'birding'],
    lat: 6.3728, lng: 81.5169,
    summary: 'Leopards, sloth bears and elephants in dry scrub by the sea.',
    description: 'Block 1 has one of the highest leopard densities in the world. Parts of the park usually close for a few weeks around September–October.',
    bestTime: 'February to June', entryFeeUsd: 30, openingHours: '6:00–18:00', avgDurationMin: 300, rating: 4.5, reviewCount: 4020, hue: 'sand',
    safety: 'Busy in peak season; choose an operator who respects distance rules.',
  },
  {
    slug: 'tangalle', name: 'Tangalle', category: 'beach', region: 'south', tags: ['beaches', 'wellness'],
    lat: 6.0243, lng: 80.7941,
    summary: 'Quiet bays and boutique stays on the deep south coast.',
    description: 'Long empty beaches and small coves. Currents can be strong; ask locally where it is safe to swim.',
    bestTime: 'December to April', avgDurationMin: 300, rating: 4.5, reviewCount: 930, hue: 'sea',
  },
  {
    slug: 'hiriketiya', name: 'Hiriketiya', category: 'beach', region: 'south', tags: ['surfing', 'beaches'],
    lat: 5.9636, lng: 80.7085,
    summary: 'A horseshoe bay with an easy surf break.',
    description: 'Small, sheltered and popular with beginner and intermediate surfers, with cafés right on the sand.',
    bestTime: 'November to April', avgDurationMin: 300, rating: 4.6, reviewCount: 820, hue: 'sea',
  },
  {
    slug: 'mirissa', name: 'Mirissa', nameSi: 'මිරිස්ස', nameTa: 'மிரிஸ்ஸ',
    category: 'beach', region: 'south', tags: ['beaches', 'wildlife'], lat: 5.9483, lng: 80.4716,
    summary: 'Palm-lined beach and blue-whale boat trips.',
    description: 'Whale-watching boats leave early from the harbour between November and April. Coconut Tree Hill is the sunset spot.',
    bestTime: 'November to April', avgDurationMin: 360, rating: 4.5, reviewCount: 3380, hue: 'sea',
    safety: 'Choose whale-watching operators that follow distance guidelines.',
  },
  {
    slug: 'weligama', name: 'Weligama', category: 'beach', region: 'south', tags: ['surfing', 'beaches'],
    lat: 5.975, lng: 80.4297,
    summary: 'A long sandy bay made for learning to surf.',
    description: 'Gentle, consistent waves and dozens of surf schools. Look for the stilt fishermen on the road to Koggala.',
    bestTime: 'November to April', avgDurationMin: 240, rating: 4.3, reviewCount: 1270, hue: 'sea',
  },
  {
    slug: 'unawatuna', name: 'Unawatuna', category: 'beach', region: 'south', tags: ['beaches'],
    lat: 6.01, lng: 80.2497,
    summary: 'Sheltered swimming bay minutes from Galle.',
    description: 'Calm water, snorkelling off Jungle Beach and an easy base for Galle Fort.',
    bestTime: 'December to April', avgDurationMin: 240, rating: 4.3, reviewCount: 2010, hue: 'sea',
  },
  {
    slug: 'galle-fort', name: 'Galle Fort', nameSi: 'ගාල්ල', nameTa: 'காலி',
    category: 'heritage', region: 'south', tags: ['culture', 'food'], lat: 6.0269, lng: 80.217,
    summary: 'A walled 17th-century fort town on the sea.',
    description: 'Walk the ramparts at sunset, then wander lanes of cafés, galleries and old churches inside the UNESCO-listed walls.',
    bestTime: 'December to April', entryFeeUsd: 0, openingHours: 'Always open', avgDurationMin: 240,
    accessibility: 'Mostly flat; some uneven paving.', amenities: ['ATMs', 'Restrooms', 'Railway station'],
    rating: 4.7, reviewCount: 6010, hue: 'sand',
  },
  {
    slug: 'hikkaduwa', name: 'Hikkaduwa', category: 'beach', region: 'south', tags: ['surfing', 'beaches'],
    lat: 6.1395, lng: 80.1063,
    summary: 'Reef, turtles and a lively beach strip.',
    description: 'Snorkel the coral sanctuary, spot sea turtles in the shallows and surf the reef breaks.',
    bestTime: 'November to April', avgDurationMin: 240, rating: 4.1, reviewCount: 1780, hue: 'sea',
  },
  // East
  {
    slug: 'trincomalee', name: 'Trincomalee', nameSi: 'ත්‍රිකුණාමලය', nameTa: 'திருகோணமலை',
    category: 'town', region: 'east', tags: ['beaches', 'culture'], lat: 8.5874, lng: 81.2152,
    summary: 'A deep natural harbour with a clifftop Hindu temple.',
    description: 'Visit Koneswaram temple on Swami Rock, then head to the beaches of Uppuveli and Nilaveli just north.',
    bestTime: 'April to September', avgDurationMin: 300, rating: 4.4, reviewCount: 1350, hue: 'sea',
  },
  {
    slug: 'nilaveli', name: 'Nilaveli & Pigeon Island', category: 'beach', region: 'east', tags: ['beaches', 'wildlife'],
    lat: 8.696, lng: 81.189,
    summary: 'Clear water and a snorkelling reef with blacktip sharks.',
    description: 'Boats cross to Pigeon Island National Park for coral and reef sharks in calm season.',
    bestTime: 'May to September', entryFeeUsd: 25, avgDurationMin: 240, rating: 4.4, reviewCount: 1120, hue: 'sea',
  },
  {
    slug: 'pasikudah', name: 'Pasikudah', category: 'beach', region: 'east', tags: ['beaches'],
    lat: 7.9275, lng: 81.56,
    summary: 'A shallow lagoon-like bay, good for families.',
    description: 'You can wade out a long way in waist-deep water. Mostly resort hotels along the bay.',
    bestTime: 'April to September', avgDurationMin: 240, rating: 4.3, reviewCount: 640, hue: 'sea',
  },
  {
    slug: 'arugam-bay', name: 'Arugam Bay', category: 'beach', region: 'east', tags: ['surfing', 'beaches'],
    lat: 6.84, lng: 81.836,
    summary: 'The island\'s best-known surf town.',
    description: 'A point break for experienced surfers plus mellow waves nearby. Lagoon safaris and Kumana National Park are close.',
    bestTime: 'May to September', avgDurationMin: 360, rating: 4.6, reviewCount: 1890, hue: 'sea',
  },
  // North
  {
    slug: 'jaffna', name: 'Jaffna', nameSi: 'යාපනය', nameTa: 'யாழ்ப்பாணம்',
    category: 'town', region: 'north', tags: ['culture', 'food'], lat: 9.6615, lng: 80.0255,
    summary: 'Tamil culture, temples and the island\'s spiciest curries.',
    description: 'A different side of Sri Lanka: Hindu kovils, a Dutch fort, palmyra palms and island-hopping by ferry.',
    bestTime: 'February to September', avgDurationMin: 360, rating: 4.4, reviewCount: 980, hue: 'saffron',
    amenities: ['ATMs', 'Hospital', 'Railway station'],
  },
  {
    slug: 'nallur-kovil', name: 'Nallur Kandaswamy Kovil', category: 'temple', region: 'north', tags: ['culture'],
    lat: 9.6747, lng: 80.0294,
    summary: 'Jaffna\'s grand golden Hindu temple.',
    description: 'Visit at puja time. The 25-day festival in July–August is one of the biggest in the Tamil world.',
    entryFeeUsd: 0, openingHours: '5:00–18:30', avgDurationMin: 60, rating: 4.7, reviewCount: 760, hue: 'saffron',
    safety: 'Men remove shirts to enter; shoes off.',
  },
  {
    slug: 'wilpattu', name: 'Wilpattu National Park', category: 'wildlife', region: 'north', tags: ['wildlife'],
    lat: 8.457, lng: 80.0142,
    summary: 'The largest national park, with leopards and few crowds.',
    description: 'Natural lakes ("villus") in dense forest. Fewer jeeps than Yala and a good chance of sloth bears.',
    bestTime: 'February to October', entryFeeUsd: 25, openingHours: '6:00–18:00', avgDurationMin: 360, rating: 4.5, reviewCount: 690, hue: 'leaf',
  },
];
