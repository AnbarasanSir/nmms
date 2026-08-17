import fs from 'fs';
import path from 'path';
import { Question, SubjectUnitSummary, NMMS_Subject, Quiz } from '../src/types';

// Subject configurations and asset directory mapping
export const SUBJECT_CONFIGS: Record<
  NMMS_Subject,
  {
    folder: string;
    nameTa: string;
    nameEn: string;
    defaultDuration: number;
    prefix: string;
  }
> = {
  MAT: {
    folder: 'matquiz',
    nameTa: 'மனத்திறன் தேர்வு (MAT)',
    nameEn: 'Mental Ability Test',
    defaultDuration: 30,
    prefix: 'unit-mat',
  },
  SAT_MATHS: {
    folder: 'satmaths',
    nameTa: 'SAT கணிதம்',
    nameEn: 'SAT Mathematics',
    defaultDuration: 30,
    prefix: 'unit-satmaths',
  },
  SAT_SCIENCE: {
    folder: 'satscience',
    nameTa: 'SAT அறிவியல்',
    nameEn: 'SAT Science',
    defaultDuration: 30,
    prefix: 'unit-satscience',
  },
  SAT_SOCIAL: {
    folder: 'satsocial',
    nameTa: 'SAT சமூக அறிவியல்',
    nameEn: 'SAT Social Science',
    defaultDuration: 30,
    prefix: 'unit-satsocial',
  },
};

// Unit Topic Names Map for all 4 NMMS Subjects
export const UNIT_METADATA_MAP: Record<
  NMMS_Subject,
  Record<number, { titleTa: string; titleEn: string; description?: string }>
> = {
  MAT: {
    1: { titleTa: 'எண் தொடர்', titleEn: 'Number Series', description: 'Finding missing and next numbers in arithmetic/geometric sequences' },
    2: { titleTa: 'எழுத்துத் தொடர்', titleEn: 'Letter Series', description: 'Alphabetical series and sequence patterns' },
    3: { titleTa: 'எண் மற்றும் எழுத்து தொடர்', titleEn: 'Alpha-Numeric Series', description: 'Combined letter and number reasoning patterns' },
    4: { titleTa: 'விடுபட்ட எண்கள் / எழுத்துகள்', titleEn: 'Missing Characters', description: 'Finding missing numbers and letters in diagrams' },
    5: { titleTa: 'ஒப்புமை எண்கள்', titleEn: 'Number Analogy', description: 'Identifying relationships between number pairs' },
    6: { titleTa: 'ஒப்புமை எழுத்துகள்', titleEn: 'Letter Analogy', description: 'Relationship patterns between alphabet pairs' },
    7: { titleTa: 'ஒப்புமை வார்த்தைகள்', titleEn: 'Word Analogy', description: 'Semantic and logical relationship between words' },
    8: { titleTa: 'பொருந்தாத எண் (மாறுபட்ட எண்)', titleEn: 'Odd One Out - Numbers', description: 'Classifying and isolating the odd number' },
    9: { titleTa: 'பொருந்தாத எழுத்து', titleEn: 'Odd One Out - Letters', description: 'Identifying the odd alphabet grouping' },
    10: { titleTa: 'பொருந்தாத வார்த்தை', titleEn: 'Odd One Out - Words', description: 'Identifying the odd word in vocabulary sets' },
    11: { titleTa: 'குறியீட்டு முறை (இரகசிய மொழி)', titleEn: 'Coding - Decoding', description: 'Deciphering secret codes and letter shifts' },
    12: { titleTa: 'திசை சார்ந்த கணக்குகள்', titleEn: 'Direction Sense Test', description: 'Cardinals, distance, and direction reasoning' },
    13: { titleTa: 'இரத்த உறவுகள்', titleEn: 'Blood Relations', description: 'Family tree and relation deduction' },
    14: { titleTa: 'கணிதக் குறியீடுகள் மாற்றம்', titleEn: 'Mathematical Operations', description: 'Symbol substitution and BODMAS evaluation' },
    15: { titleTa: 'வென் வரைபடங்கள்', titleEn: 'Venn Diagrams', description: 'Logical Venn diagram set relationships' },
    16: { titleTa: 'பகடை கணக்குகள்', titleEn: 'Dice & Cubes', description: 'Opposite faces and standard/general dice rules' },
    17: { titleTa: 'கனச்சதுரம் மற்றும் கனச்செவ்வகம்', titleEn: 'Cubes and Cuboids', description: 'Painted cube cuts and face counting' },
    18: { titleTa: 'வரிசைப்படுத்துதல் / தரம்', titleEn: 'Ranking and Ordering Test', description: 'Positional ranking and seating comparison' },
    19: { titleTa: 'காலவரிசை மற்றும் கடிகாரம்', titleEn: 'Clock & Calendar', description: 'Angle between hands, days calculation and leap years' },
    20: { titleTa: 'இயற்கணித சமன்பாடுகள் & புதிர்கள்', titleEn: 'Algebraic Reasoning & Puzzles', description: 'Finding unknown variables and mathematical reasoning' },
    21: { titleTa: 'வயது கணக்குகள்', titleEn: 'Problems on Ages', description: 'Age relation word problems and ratios' },
    22: { titleTa: 'பகுப்பாய்வு காரணவியல்', titleEn: 'Analytical Reasoning', description: 'Multi-statement deduction and logical matrix' },
    23: { titleTa: 'உட்கட்டமைப்புகள் (பொருந்திய படம்)', titleEn: 'Embedded Figures', description: 'Finding hidden shapes inside complex figures' },
    24: { titleTa: 'விடுபட்ட வரைபடம் (படம் நிரப்புதல்)', titleEn: 'Pattern Completion', description: 'Completing the incomplete quarter/quadrant' },
    25: { titleTa: 'அடுத்த வரைபடம் (படத் தொடர்)', titleEn: 'Figure Series', description: 'Sequential rotation and element addition' },
    26: { titleTa: 'ஒப்புமை வரைபடங்கள்', titleEn: 'Figure Analogy', description: 'Geometric shape relationship pairing' },
    27: { titleTa: 'மாறுபட்ட படம் (பொருந்தாத படம்)', titleEn: 'Figure Classification (Odd One Out)', description: 'Finding the unique non-conforming diagram' },
    28: { titleTa: 'கண்ணாடி பிம்பம்', titleEn: 'Mirror Images', description: 'Horizontal reflection across vertical axes' },
    29: { titleTa: 'நீர் பிம்பம்', titleEn: 'Water Images', description: 'Vertical reflection across horizontal water surfaces' },
    30: { titleTa: 'காகித மடிப்பு மற்றும் வெட்டுதல்', titleEn: 'Paper Folding & Cutting', description: 'Unfolding symmetry and punched hole patterns' },
    31: { titleTa: 'வடிவங்கள் எண்ணுதல்', titleEn: 'Counting Figures', description: 'Counting triangles, squares, and rectangles in complex figures' },
    32: { titleTa: 'வரைபடப் பகுப்பாய்வு (மேட்ரிக்ஸ்)', titleEn: 'Figure Matrix', description: 'Grid row-column transformation logic' },
    34: { titleTa: 'தரவு கையாளுதல்', titleEn: 'Data Interpretation', description: 'Bar graphs, pie charts, and table deduction' },
    35: { titleTa: 'வார்த்தை உருவாக்கம்', titleEn: 'Word Formation', description: 'Anagrams, word building from letter banks' },
    36: { titleTa: 'தர்க்கரீதியான வரிசை', titleEn: 'Logical Sequence of Words', description: 'Meaningful ascending/chronological order' },
  },
  SAT_MATHS: {
    1: { titleTa: 'முழுக்கள்', titleEn: 'Integers', description: 'Properties of addition, subtraction, multiplication & division of integers' },
    2: { titleTa: 'பின்னங்கள் மற்றும் தசம எண்கள்', titleEn: 'Fractions and Decimals', description: 'Operations on fractions and decimals with word problems' },
    3: { titleTa: 'தரவுகளைக் கையாளுதல்', titleEn: 'Data Handling', description: 'Mean, median, mode, range and bar charts' },
    4: { titleTa: 'எளிய சமன்பாடுகள்', titleEn: 'Simple Equations', description: 'Setting up and solving single variable linear equations' },
    5: { titleTa: 'கோடுகளும் கோணங்களும்', titleEn: 'Lines and Angles', description: 'Complementary, supplementary, adjacent and parallel transversal angles' },
    6: { titleTa: 'முக்கோணமும் அதன் பண்புகளும்', titleEn: 'Triangles and Properties', description: 'Angle sum property, exterior angle theorem and Pythagoras theorem' },
    7: { titleTa: 'முக்கோணங்களின் சர்வசமத்தன்மை', titleEn: 'Congruence of Triangles', description: 'SSS, SAS, ASA, and RHS congruence criteria' },
    8: { titleTa: 'விகிதமுறு எண்கள்', titleEn: 'Rational Numbers', description: 'Standard forms, comparison, and rational arithmetic' },
    9: { titleTa: 'அளவியல் (சுற்றளவு & பரப்பளவு)', titleEn: 'Mensuration (Perimeter & Area)', description: 'Rectangles, squares, parallelograms, triangles and circles' },
    10: { titleTa: 'இயற்கணிதக் கோவைகள்', titleEn: 'Algebraic Expressions', description: 'Monomials, polynomials, like terms and value substitution' },
    11: { titleTa: 'அடுக்குகளும் அடுக்குக்குறிகளும்', titleEn: 'Exponents and Powers', description: 'Laws of exponents and standard scientific notation' },
    12: { titleTa: 'சமச்சீர்த் தன்மை', titleEn: 'Symmetry', description: 'Lines of symmetry and rotational order' },
    13: { titleTa: 'திண்ம வடிவங்களைக் காட்சிப்படுத்துதல்', titleEn: 'Visualising Solid Shapes', description: '2D representation of 3D objects, Euler formula' },
    14: { titleTa: 'நேர் மற்றும் எதிர் விகிதங்கள்', titleEn: 'Direct and Inverse Proportions', description: 'Unitary method and proportionality problems' },
    15: { titleTa: 'வாழ்வியல் கணிதம் (இலாபம் & நட்டம்)', titleEn: 'Commercial Arithmetic', description: 'Percentage, profit and loss, simple interest, discounts' },
    16: { titleTa: 'கூட்டு வட்டி', titleEn: 'Compound Interest', description: 'Annual and semi-annual compound interest calculations' },
    17: { titleTa: 'வடிவியல் அமைப்புகள்', titleEn: 'Practical Geometry', description: 'Constructing quadrilaterals and special polygons' },
    18: { titleTa: 'சதுரம் மற்றும் சதுரமூலம்', titleEn: 'Squares and Square Roots', description: 'Square properties, prime factorization and long division root methods' },
    19: { titleTa: 'கனம் மற்றும் கனமூலம்', titleEn: 'Cubes and Cube Roots', description: 'Perfect cubes, unit digits, and cube root factorization' },
    20: { titleTa: 'காரணிகூறுதல்', titleEn: 'Factorisation', description: 'Common factors, regrouping and algebraic identities' },
    21: { titleTa: 'வரைபடங்கள் அறிமுகம்', titleEn: 'Introduction to Graphs', description: 'Cartesian coordinate system, plotting points and line graphs' },
    22: { titleTa: 'உருவங்களின் புறப்பரப்பளவு & கனஅளவு', titleEn: 'Surface Area and Volume', description: 'Cubes, cuboids, cylinders surface area and volume' },
    23: { titleTa: 'தகவல் செயலாக்கம் & எண்களுடன் விளையாடுதல்', titleEn: 'Information Processing & Playing with Numbers', description: 'Divisibility tests, magic squares, and cryptarithms' },
  },
  SAT_SCIENCE: {
    1: { titleTa: 'அளவீட்டியல்', titleEn: 'Measurement', description: 'Fundamental and derived units, standard measurement devices' },
    2: { titleTa: 'விசையும் இயக்கமும்', titleEn: 'Force and Motion', description: 'Speed, velocity, acceleration, friction and pressure' },
    3: { titleTa: 'நம்மைச் சுற்றியுள்ள பருப்பொருள்கள்', titleEn: 'Matter Around Us', description: 'Elements, compounds, symbols, atoms and molecules' },
    4: { titleTa: 'அணு அமைப்பு', titleEn: 'Atomic Structure', description: 'Protons, neutrons, electrons, valency and atomic mass' },
    5: { titleTa: 'தாவரங்களின் இனப்பெருக்கம்', titleEn: 'Reproduction in Plants', description: 'Pollination, fertilization, seeds dispersal and vegetative propagation' },
    6: { titleTa: 'உடல் நலமும் சுகாதாரமும்', titleEn: 'Health and Hygiene', description: 'Nutrients, deficiency diseases, viruses, bacteria and immunity' },
    7: { titleTa: 'பார்வைத் தொடர்பு மற்றும் கணினி', titleEn: 'Visual Communication & Computers', description: 'Digital graphics, files, hardware and communication' },
    8: { titleTa: 'வெப்பம் மற்றும் வெப்பநிலை', titleEn: 'Heat and Temperature', description: 'Conduction, convection, radiation, thermometers and thermal expansion' },
    9: { titleTa: 'மின்னியல்', titleEn: 'Electricity', description: 'Electric circuits, conductors, insulators, electric potential and cells' },
    10: { titleTa: 'நம்மைச்சுற்றி நிகழும் மாற்றங்கள்', titleEn: 'Changes Around Us', description: 'Physical, chemical, reversible and irreversible changes' },
    11: { titleTa: 'செல் உயிரியல்', titleEn: 'Cell Biology', description: 'Plant and animal cells, cell organelles and microscope parts' },
    12: { titleTa: 'வகைப்பாட்டியலின் அடிப்படைகள்', titleEn: 'Basis of Classification', description: 'Five kingdom classification, algae, fungi, bryophytes and pteridophytes' },
    13: { titleTa: 'ஒளி மற்றும் ஒளியியல்', titleEn: 'Light and Optics', description: 'Reflection, refraction, plane and spherical mirrors, laws of reflection' },
    14: { titleTa: 'ஒலி', titleEn: 'Sound', description: 'Production, propagation, frequency, amplitude, pitch and ear anatomy' },
    15: { titleTa: 'காந்தவியல்', titleEn: 'Magnetism', description: 'Magnetic poles, magnetic field lines, Earth magnetism and compass' },
    16: { titleTa: 'அண்டம் மற்றும் விண்வெளி அறிவியல்', titleEn: 'Universe and Space Science', description: 'Solar system, stars, satellites, ISRO and space exploration' },
    17: { titleTa: 'பலபடி வேதியியல்', titleEn: 'Polymer Chemistry', description: 'Natural and synthetic fibers, plastics and biodegradable polymers' },
    18: { titleTa: 'அன்றாட வாழ்வில் வேதியியல்', titleEn: 'Chemistry in Everyday Life', description: 'Hydrocarbons, soaps, detergents, fertilizers and adhesives' },
    19: { titleTa: 'அமிலங்கள், காரங்கள் மற்றும் உப்புகள்', titleEn: 'Acids, Bases and Salts', description: 'pH scale, indicators, neutralization, properties of acids and bases' },
    20: { titleTa: 'காற்று', titleEn: 'Air', description: 'Composition of air, oxygen, nitrogen, carbon dioxide and atmospheric layers' },
    21: { titleTa: 'நீர்', titleEn: 'Water', description: 'Water cycle, purification, hardness of water and conservation' },
    22: { titleTa: 'நுண்ணுயிரிகள்', titleEn: 'Microorganisms', description: 'Bacteria, viruses, fungi, protozoa, fermentation and antibiotics' },
    23: { titleTa: 'தாவர உலகம்', titleEn: 'Plant Kingdom', description: 'Plant morphology, root and stem modifications, photosynthesis' },
    24: { titleTa: 'விலங்கு உலகம்', titleEn: 'Animal Kingdom', description: 'Invertebrates, vertebrates, mammals, birds and adaptations' },
    25: { titleTa: 'தாவரங்கள் மற்றும் விலங்குகளைப் பாதுகாத்தல்', titleEn: 'Conservation of Plants & Animals', description: 'Sanctuaries, national parks, endangered species and Red Data Book' },
    26: { titleTa: 'வளரிளம் பருவமடைதல்', titleEn: 'Reaching the Age of Adolescence', description: 'Endocrine glands, hormones, physical changes and nutrition' },
    27: { titleTa: 'பயிர்ப் பெருக்கம் மற்றும் மேலாண்மை', titleEn: 'Crop Production & Management', description: 'Agricultural practices, irrigation, harvesting, storage and animal husbandry' },
    28: { titleTa: 'உயிரினங்களின் ஒருங்கமைவு', titleEn: 'Organisation of Life', description: 'Tissues, organs, organ systems and human physiological systems' },
  },
  SAT_SOCIAL: {
    1: { titleTa: 'இடைக்கால இந்திய வரலாற்று ஆதாரங்கள்', titleEn: 'Sources of Medieval India', description: 'Inscriptions, monuments, coins, religious and secular literature' },
    2: { titleTa: 'வட இந்தியப் புதிய அரசுகளின் தோற்றம்', titleEn: 'Emergence of New Kingdoms in North India', description: 'Rajputs, Palas, Chauhans, Mahmud of Ghazni and Ghori' },
    3: { titleTa: 'தென்னிந்தியப் புதிய அரசுகள் (பிற்கால சோழர்களும் பாண்டியர்களும்)', titleEn: 'Later Cholas and Pandyas', description: 'Chola administration, temples, navy and Pandya kingdom' },
    4: { titleTa: 'தில்லி சுல்தானியம்', titleEn: 'Delhi Sultanate', description: 'Slave, Khalji, Tughlaq, Sayyid and Lodi dynasties' },
    5: { titleTa: 'புவியின் உள் அமைப்பு', titleEn: 'Interior of the Earth', description: 'Crust, mantle, core, plate tectonics and earthquakes' },
    6: { titleTa: 'நிலத்தோற்றங்கள்', titleEn: 'Landforms', description: 'Weathering, rivers, glaciers, wind and sea waves work' },
    7: { titleTa: 'மக்கள் தொகை மற்றும் குடியிருப்புகள்', titleEn: 'Population and Settlement', description: 'Rural and urban settlements, site and pattern of human habitat' },
    8: { titleTa: 'சமத்துவம்', titleEn: 'Equality', description: 'Types of equality, Indian Constitution articles and rule of law' },
    9: { titleTa: 'அரசியல் கட்சிகள்', titleEn: 'Political Parties', description: 'Types of party systems, national and state parties, election symbols' },
    10: { titleTa: 'உற்பத்தி', titleEn: 'Production', description: 'Primary, secondary, tertiary sectors, factors of production: land, labour, capital' },
    11: { titleTa: 'விஜயநகர, பாமினி அரசுகள்', titleEn: 'Vijayanagar and Bahmani Kingdoms', description: 'Harihara and Bukka, Krishnadevaraya, administration and art' },
    12: { titleTa: 'முகலாயப் பேரரசு', titleEn: 'Mughal Empire', description: 'Babur, Humayun, Akbar, Jahangir, Shah Jahan and Aurangzeb' },
    13: { titleTa: 'மராத்தியர்கள் மற்றும் பேஷ்வாக்களின் எழுச்சி', titleEn: 'Rise of Marathas and Peshwas', description: 'Shivaji administration, Ashtapradhan and Peshwa rule' },
    14: { titleTa: 'வளங்கள்', titleEn: 'Resources', description: 'Renewable and non-renewable resources, mineral and energy resources' },
    15: { titleTa: 'சுற்றுலா', titleEn: 'Tourism', description: 'Religious, cultural, eco-tourism and famous Indian destinations' },
    16: { titleTa: 'மாநில அரசு', titleEn: 'State Government', description: 'Governor, Chief Minister, Legislative Assembly and judiciary' },
    17: { titleTa: 'ஊடகமும் ஜனநாயகமும்', titleEn: 'Media and Democracy', description: 'Role of media, public opinion, print and electronic media' },
    18: { titleTa: 'புதிய சமயக் கருத்துக்களும் இயக்கங்களும்', titleEn: 'New Religious Ideas and Movements', description: 'Bhakti movement, Sufism, Alvars, Nayanmars, Ramanuja and Kabir' },
    19: { titleTa: 'தமிழ்நாட்டில் கலையும் கட்டிடக்கலையும்', titleEn: 'Art and Architecture of Tamil Nadu', description: 'Pallava, Chola, Pandya, Vijayanagar and Nayak temple architecture' },
    20: { titleTa: 'தமிழகத்தில் சமணம், பௌத்தம், ஆசீவகக் கோட்பாடுகள்', titleEn: 'Jainism, Buddhism and Ajivika in TN', description: 'Historical sites, caverns, sculptures and philosophy' },
    21: { titleTa: 'கண்டங்களை ஆராய்தல் (வட அமெரிக்கா & தென் அமெரிக்கா)', titleEn: 'Exploring Continents (North & South America)', description: 'Physiography, drainage, climate, natural vegetation and resources' },
    22: { titleTa: 'நிலவரைபடத்தை கற்றறிதல்', titleEn: 'Map Reading', description: 'Scale, direction, conventional signs and thematic maps' },
    23: { titleTa: 'இயற்கை இடர்கள் - பேரிடர் மேலாண்மை', titleEn: 'Natural Hazards & Disaster Management', description: 'Floods, cyclones, earthquakes, tsunami and mitigation measures' },
    24: { titleTa: 'பெண்கள் உரிமை & பாலின சமத்துவம்', titleEn: 'Women Rights & Gender Equality', description: 'Social reformers, women pioneers, constitutional safeguards' },
    25: { titleTa: 'சந்தை மற்றும் நுகர்வோர் பாதுகாப்பு', titleEn: 'Market and Consumer Protection', description: 'Types of markets, consumer rights, COPRA and consumer courts' },
    26: { titleTa: 'சாலை பாதுகாப்பு', titleEn: 'Road Safety Rules', description: 'Traffic rules, road signs, pedestrian safety and emergency numbers' },
    27: { titleTa: 'வரி மற்றும் அதன் முக்கியத்துவம்', titleEn: 'Taxation and its Importance', description: 'Direct and indirect taxes, GST, income tax and public revenue' },
    28: { titleTa: 'ஐரோப்பியர்களின் வருகை', titleEn: 'Advent of Europeans', description: 'Portuguese, Dutch, British, Danish and French in India' },
    29: { titleTa: 'வர்த்தகத்திலிருந்து பேரரசு வரை', titleEn: 'From Trade to Territory', description: 'Battle of Plassey, Buxar, Carnatic Wars and British expansion' },
    30: { titleTa: 'கிராம சமூகமும் வாழ்க்கை முறையும்', titleEn: 'Rural Life and Society', description: 'Permanent settlement, Ryotwari and Mahalwari land revenue systems' },
    31: { titleTa: 'மக்கள் புரட்சி (1857 பெரும் புரட்சி)', titleEn: 'People’s Revolt (1857 Great Revolt)', description: 'Palayakkarar revolt, Vellore Mutiny (1806) and 1857 uprising' },
    32: { titleTa: 'இந்தியாவில் கல்வி வளர்ச்சி', titleEn: 'Educational Development in India', description: 'Ancient gurukula, medieval madrasas, modern Western education acts' },
    33: { titleTa: 'இந்தியாவில் தொழிலகங்களின் வளர்ச்சி', titleEn: 'Development of Industries in India', description: 'Traditional handicrafts decay, modern iron, cotton and jute mills' },
    34: { titleTa: 'ஆங்கிலேயர் ஆட்சியில் நகர்ப்புற மாற்றங்கள்', titleEn: 'Urban Changes during British Rule', description: 'Cantonment towns, hill stations, port cities and municipalities' },
    35: { titleTa: 'காலங்கள் தோறும் இந்தியப் பெண்களின் நிலை', titleEn: 'Status of Women through the Ages', description: 'Ancient to modern status, abolition of Sati, child marriage acts' },
    36: { titleTa: 'பாறை மற்றும் மண்', titleEn: 'Rocks and Soils', description: 'Igneous, sedimentary, metamorphic rocks, soil profile and conservation' },
    37: { titleTa: 'வானிலை மற்றும் காலநிலை', titleEn: 'Weather and Climate', description: 'Temperature, pressure, planetary winds, humidity and precipitation' },
    38: { titleTa: 'நீர்க்கோளம்', titleEn: 'Hydrosphere', description: 'Oceans, salinity, waves, tides, currents and marine resources' },
    39: { titleTa: 'இடம்பெயர்தல் மற்றும் நகரமயமாதல்', titleEn: 'Migration and Urbanisation', description: 'Push and pull factors, types of migration, urban growth consequences' },
    40: { titleTa: 'இடர்கள் மற்றும் சுற்றுச்சூழல்', titleEn: 'Hazards and Environment', description: 'Atmospheric, geologic, hydrologic and biological hazards' },
    41: { titleTa: 'தொழிலகங்கள்', titleEn: 'Industries', description: 'Agro-based, mineral-based, forest-based and chemical industries' },
    42: { titleTa: 'கண்டங்களை ஆராய்தல் (ஆப்பிரிக்கா, ஆஸ்திரேலியா, அண்டார்டிகா)', titleEn: 'Exploring Continents (Africa, Aus, Antarctica)', description: 'Physical divisions, rivers, climate, wildlife and research stations' },
    43: { titleTa: 'புவிப்படங்களைப் புரிந்துகொள்ளுதல்', titleEn: 'Understanding Globe and Maps', description: 'Latitudes, longitudes, time zones, projection and GIS' },
    44: { titleTa: 'இந்தியாவில் மதச்சார்பின்மை', titleEn: 'Secularism in India', description: 'Secular constitution, equal respect for all religions, preamble' },
    45: { titleTa: 'மனித உரிமைகளும் ஐக்கிய நாடுகள் சபையும்', titleEn: 'Human Rights and UNO', description: 'UDHR (1948), fundamental rights, NHRC and SHRC' },
    46: { titleTa: 'பணம், சேமிப்பு மற்றும் முதலீடுகள்', titleEn: 'Money, Savings and Investments', description: 'Evolution of money, banks, black money and digital payments' },
  },
};

const DATA_DIR = path.join(process.cwd(), '.data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'unit_overrides.json');

interface UnitStore {
  // Key format: `${subject}_${unitNumber}`
  overrides: Record<string, {
    metadata?: Partial<SubjectUnitSummary>;
    questions?: Question[];
    isCustom?: boolean;
    lastUpdated?: string;
  }>;
}

let unitStore: UnitStore = { overrides: {} };

// Ensure data dir and load overrides
export function initUnitStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(OVERRIDES_FILE)) {
      unitStore = JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    } else {
      fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(unitStore, null, 2));
    }
  } catch (err) {
    console.error('Failed to init unit store:', err);
  }
}

export function saveUnitStore() {
  try {
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(unitStore, null, 2));
  } catch (err) {
    console.error('Failed to save unit store:', err);
  }
}

// Normalize image path for web rendering
function normalizeImagePath(rawImg: string | undefined, subject: NMMS_Subject, unitNum: number): string | undefined {
  if (!rawImg || typeof rawImg !== 'string' || !rawImg.trim()) return undefined;
  const trimmed = rawImg.trim().replace(/^\/+/, '');
  
  if (trimmed.startsWith('assets/')) {
    return `/${trimmed}`;
  }
  
  const subFolder = SUBJECT_CONFIGS[subject].folder;
  if (trimmed.startsWith(subFolder)) {
    return `/assets/${trimmed}`;
  }
  
  if (trimmed.startsWith('image/')) {
    return `/assets/${subFolder}/${trimmed}`;
  }

  return `/assets/${subFolder}/image/unit${unitNum}/${trimmed}`;
}

// Convert raw JSON question to standardized Question interface
export function normalizeQuestion(
  raw: any,
  index: number,
  subject: NMMS_Subject,
  unitNum: number,
  topicName: string
): Question {
  const optionLetters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const qIdNum = typeof raw.id === 'number' ? raw.id : index + 1;
  const questionId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}-q${qIdNum}`;

  const rawOpts = Array.isArray(raw.options) ? raw.options : [];
  const options = optionLetters.map((letter, idx) => ({
    id: letter,
    text: String(rawOpts[idx] !== undefined ? rawOpts[idx] : `விருப்பம் ${letter}`),
  }));

  // Resolve correct option
  let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
  if (typeof raw.correct === 'number') {
    if (raw.correct >= 0 && raw.correct <= 3) {
      correctOption = optionLetters[raw.correct];
    } else if (raw.correct >= 1 && raw.correct <= 4) {
      correctOption = optionLetters[raw.correct - 1];
    }
  } else if (typeof raw.correct === 'string') {
    const uc = raw.correct.trim().toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(uc)) {
      correctOption = uc as 'A' | 'B' | 'C' | 'D';
    } else {
      const num = parseInt(uc, 10);
      if (!isNaN(num) && num >= 0 && num <= 3) correctOption = optionLetters[num];
      else if (!isNaN(num) && num >= 1 && num <= 4) correctOption = optionLetters[num - 1];
    }
  }

  // Handle diagram/image
  const questionImage = normalizeImagePath(raw.image, subject, unitNum);

  return {
    id: questionId,
    subject,
    topic: topicName,
    questionText: raw.question || `வினா ${qIdNum}`,
    questionImage,
    options,
    correctOption,
    explanation: raw.explanation || '',
    marks: 1,
    negativeMarks: 0,
    question_en: raw.question_en || undefined,
    options_en: Array.isArray(raw.options_en) ? raw.options_en : undefined,
    explanation_en: raw.explanation_en || undefined,
  };
}

// Read raw unit JSON file from asset folder
export function readAssetUnitQuestions(subject: NMMS_Subject, unitNum: number): Question[] {
  const folder = SUBJECT_CONFIGS[subject].folder;
  const unitFile = path.join(process.cwd(), 'assets', folder, 'data', `unit${unitNum}.json`);

  if (!fs.existsSync(unitFile)) {
    return [];
  }

  try {
    const rawData = JSON.parse(fs.readFileSync(unitFile, 'utf-8'));
    if (!Array.isArray(rawData)) return [];

    const meta = UNIT_METADATA_MAP[subject]?.[unitNum];
    const topicName = meta ? `${meta.titleTa} (${meta.titleEn})` : `பகுதி ${unitNum} - Unit ${unitNum}`;

    return rawData.map((raw: any, idx: number) => normalizeQuestion(raw, idx, subject, unitNum, topicName));
  } catch (e) {
    console.error(`Failed to read unit ${unitNum} for ${subject}:`, e);
    return [];
  }
}

// Get full questions for a unit (checking overrides first)
export function getUnitQuestions(subject: NMMS_Subject, unitNum: number): Question[] {
  const key = `${subject}_${unitNum}`;
  if (unitStore.overrides[key]?.questions && Array.isArray(unitStore.overrides[key].questions)) {
    return unitStore.overrides[key].questions!;
  }
  return readAssetUnitQuestions(subject, unitNum);
}

// Discover all units for a given subject
export function getSubjectUnitSummaries(
  subject: NMMS_Subject,
  deployedQuizzes: Quiz[]
): SubjectUnitSummary[] {
  const folder = SUBJECT_CONFIGS[subject].folder;
  const dataDir = path.join(process.cwd(), 'assets', folder, 'data');
  const summaries: SubjectUnitSummary[] = [];

  if (!fs.existsSync(dataDir)) {
    return [];
  }

  const files = fs.readdirSync(dataDir).filter((f) => f.match(/^unit\d+\.json$/i));

  // Extract unit numbers and sort numerically
  const unitNumbers = files
    .map((f) => {
      const m = f.match(/^unit(\d+)\.json$/i);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);

  unitNumbers.sort((a, b) => a - b);

  for (const unitNum of unitNumbers) {
    const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
    const meta = UNIT_METADATA_MAP[subject]?.[unitNum];
    const questions = getUnitQuestions(subject, unitNum);
    if (questions.length === 0) continue;

    const isDeployed = deployedQuizzes.some((q) => q.id === unitId);
    const activeQuiz = deployedQuizzes.find((q) => q.id === unitId);
    const hasCustom = Boolean(unitStore.overrides[`${subject}_${unitNum}`]);
    const hasDiagrams = questions.some((q) => Boolean(q.questionImage));

    const titleTa = meta?.titleTa || `பகுதி ${unitNum}`;
    const titleEn = meta?.titleEn || `Unit ${unitNum}`;
    const fullTitle = `${SUBJECT_CONFIGS[subject].nameTa} - அலகு ${unitNum}: ${titleTa} (${titleEn})`;

    summaries.push({
      id: unitId,
      subject,
      unitNumber: unitNum,
      title: fullTitle,
      titleTa,
      titleEn,
      description: meta?.description || `${questions.length} பயிற்சி வினாக்கள் மற்றும் விரிவான விளக்கங்கள்.`,
      questionCount: questions.length,
      durationMinutes: activeQuiz?.durationMinutes || Math.min(60, Math.max(15, Math.ceil(questions.length * 1.5))),
      totalMarks: questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      isDeployed,
      activeQuizId: activeQuiz ? activeQuiz.id : undefined,
      attemptsCount: 0,
      hasDiagrams,
      hasCustomEdits: hasCustom,
    });
  }

  return summaries;
}

// Get all units across all subjects
export function getAllSubjectUnits(deployedQuizzes: Quiz[]): SubjectUnitSummary[] {
  const subjects: NMMS_Subject[] = ['MAT', 'SAT_MATHS', 'SAT_SCIENCE', 'SAT_SOCIAL'];
  let all: SubjectUnitSummary[] = [];
  for (const sub of subjects) {
    all = all.concat(getSubjectUnitSummaries(sub, deployedQuizzes));
  }
  return all;
}

// Update a question in a unit
export function updateQuestionInUnit(
  subject: NMMS_Subject,
  unitNum: number,
  questionId: string,
  updatedData: Partial<Question>
): { success: boolean; question?: Question; error?: string } {
  const key = `${subject}_${unitNum}`;
  let questions = [...getUnitQuestions(subject, unitNum)];

  const qIndex = questions.findIndex((q) => q.id === questionId);
  if (qIndex === -1) {
    return { success: false, error: 'Question not found in unit' };
  }

  const existing = questions[qIndex];
  const merged: Question = {
    ...existing,
    ...updatedData,
    id: existing.id,
    subject: existing.subject,
    marks: Number(updatedData.marks) || 1,
    negativeMarks: Number(updatedData.negativeMarks) || 0,
  };

  questions[qIndex] = merged;

  unitStore.overrides[key] = {
    ...unitStore.overrides[key],
    questions,
    isCustom: true,
    lastUpdated: new Date().toISOString(),
  };
  saveUnitStore();

  return { success: true, question: merged };
}

// Add a new question to a unit
export function addQuestionToUnit(
  subject: NMMS_Subject,
  unitNum: number,
  newQuestionData: Omit<Question, 'id'> & { id?: string }
): { success: boolean; question?: Question; error?: string } {
  const key = `${subject}_${unitNum}`;
  let questions = [...getUnitQuestions(subject, unitNum)];

  const newId = newQuestionData.id || `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}-q${questions.length + 1}-${Date.now().toString(36)}`;
  const meta = UNIT_METADATA_MAP[subject]?.[unitNum];
  const defaultTopic = meta ? `${meta.titleTa} (${meta.titleEn})` : `பகுதி ${unitNum}`;

  const createdQuestion: Question = {
    id: newId,
    subject,
    topic: newQuestionData.topic || defaultTopic,
    questionText: newQuestionData.questionText || 'புதிய வினா',
    questionImage: newQuestionData.questionImage,
    options: newQuestionData.options && newQuestionData.options.length === 4 ? newQuestionData.options : [
      { id: 'A', text: 'விருப்பம் A' },
      { id: 'B', text: 'விருப்பம் B' },
      { id: 'C', text: 'விருப்பம் C' },
      { id: 'D', text: 'விருப்பம் D' },
    ],
    correctOption: newQuestionData.correctOption || 'A',
    explanation: newQuestionData.explanation || '',
    marks: Number(newQuestionData.marks) || 1,
    negativeMarks: Number(newQuestionData.negativeMarks) || 0,
    question_en: newQuestionData.question_en,
    options_en: newQuestionData.options_en,
    explanation_en: newQuestionData.explanation_en,
  };

  questions.push(createdQuestion);

  unitStore.overrides[key] = {
    ...unitStore.overrides[key],
    questions,
    isCustom: true,
    lastUpdated: new Date().toISOString(),
  };
  saveUnitStore();

  return { success: true, question: createdQuestion };
}

// Delete a question from a unit
export function deleteQuestionFromUnit(
  subject: NMMS_Subject,
  unitNum: number,
  questionId: string
): { success: boolean; remainingCount?: number; error?: string } {
  const key = `${subject}_${unitNum}`;
  let questions = [...getUnitQuestions(subject, unitNum)];

  const initialLen = questions.length;
  questions = questions.filter((q) => q.id !== questionId);

  if (questions.length === initialLen) {
    return { success: false, error: 'Question not found' };
  }

  unitStore.overrides[key] = {
    ...unitStore.overrides[key],
    questions,
    isCustom: true,
    lastUpdated: new Date().toISOString(),
  };
  saveUnitStore();

  return { success: true, remainingCount: questions.length };
}

// Reset unit back to original asset data
export function resetUnitToDefault(subject: NMMS_Subject, unitNum: number): { success: boolean; questionCount: number } {
  const key = `${subject}_${unitNum}`;
  delete unitStore.overrides[key];
  saveUnitStore();
  const resetQuestions = getUnitQuestions(subject, unitNum);
  return { success: true, questionCount: resetQuestions.length };
}

// Build a Quiz object from a Unit for deployment or student testing
export function buildQuizFromUnit(
  subject: NMMS_Subject,
  unitNum: number,
  options?: {
    customTitle?: string;
    durationMinutes?: number;
    passPercentage?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    enableQuestionLimit?: boolean;
    questionsPerAttempt?: number;
    enableAntiCheat?: boolean;
  }
): Quiz {
  const questions = getUnitQuestions(subject, unitNum);
  const meta = UNIT_METADATA_MAP[subject]?.[unitNum];
  const unitId = `${SUBJECT_CONFIGS[subject].prefix}-${unitNum}`;
  const titleTa = meta?.titleTa || `பகுதி ${unitNum}`;
  const titleEn = meta?.titleEn || `Unit ${unitNum}`;

  const title = options?.customTitle || `${SUBJECT_CONFIGS[subject].nameTa} - அலகு ${unitNum}: ${titleTa} (${titleEn})`;
  const description = meta?.description || `NMMS ${SUBJECT_CONFIGS[subject].nameTa} தேர்வுக்கான அலகு ${unitNum} மாதிரித் தேர்வு.`;

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return {
    id: unitId,
    title,
    description,
    durationMinutes: options?.durationMinutes || Math.min(60, Math.max(15, Math.ceil(questions.length * 1.5))),
    totalMarks,
    passPercentage: options?.passPercentage || 40,
    enableAntiCheat: options?.enableAntiCheat !== false,
    shuffleQuestions: options?.shuffleQuestions !== false,
    shuffleOptions: options?.shuffleOptions !== false,
    enableQuestionLimit: Boolean(options?.enableQuestionLimit),
    questionsPerAttempt: options?.questionsPerAttempt || (options?.enableQuestionLimit ? Math.min(20, questions.length) : undefined),
    showResultsImmediately: true,
    allowReview: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    questions,
  };
}
