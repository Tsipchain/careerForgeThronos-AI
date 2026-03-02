"""
Country context service — static database of key living/working facts
per country, enriched for job-seekers and remote workers.

Covers: cost of living, taxes, healthcare, visa/permit, work culture,
B2B contractor norms, digital nomad options, key life facts.

Usage:
    from app.services.country_context import get_country, detect_country, COUNTRIES
"""
from typing import Optional, Dict, Any, List

# ---------------------------------------------------------------------------
# Static country database
# ---------------------------------------------------------------------------
# cost_of_living_index: approximate (NYC = 100, lower = cheaper)
# income_tax_top_pct: highest bracket personal income tax %
# social_security_employer_pct: employer social security contribution %
# social_security_employee_pct: employee social security contribution %

COUNTRIES: Dict[str, Dict[str, Any]] = {
    # -----------------------------------------------------------------------
    # GREECE
    # -----------------------------------------------------------------------
    'GR': {
        'name': 'Greece',
        'flag': '🇬🇷',
        'region': 'Southern Europe / EU',
        'currency': 'EUR (€)',
        'official_languages': ['Greek'],
        'timezone': 'EET (UTC+2) / EEST (UTC+3 summer)',
        'cost_of_living_index': 52,
        'avg_tech_salary_usd': {'junior': '18 000–26 000', 'mid': '26 000–40 000', 'senior': '40 000–65 000'},
        'income_tax_top_pct': 44,
        'social_security_employer_pct': 22.54,
        'social_security_employee_pct': 13.87,
        'healthcare': 'Universal public (EOPYY) + private supplements common',
        'contract_types_common': ['employment', 'freelance_individual', 'b2b_company'],
        'b2b_contractor_notes': (
            'B2B via EP (Ατομική Επιχείρηση) or IKE is common for remote contracts. '
            'VAT 24% applies; small-business VAT exemption up to €10 000/yr.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'EU Blue Card or standard work permit; processing ~3 months',
        'remote_work_culture': 'Growing rapidly post-COVID; Athens & Thessaloniki have strong tech hubs.',
        'key_facts': [
            'Mediterranean climate — over 300 sunny days/year',
            'Lower cost of living vs Western Europe — rent in Athens €500–€900/month',
            'Strong startup ecosystem in Athens (Pfizer, Workable, Beat hq here)',
            'New "Digital Nomad" residence permit for non-EU citizens (Law 4825/2021)',
            'Strong expat community; English widely spoken in cities',
            'ENFIA property tax applies if you own real estate',
            'Public transport improving; metro covers central Athens',
        ],
        'quality_of_life': 'High — food, sea, culture; bureaucracy can be slow',
    },

    # -----------------------------------------------------------------------
    # GERMANY
    # -----------------------------------------------------------------------
    'DE': {
        'name': 'Germany',
        'flag': '🇩🇪',
        'region': 'Central Europe / EU',
        'currency': 'EUR (€)',
        'official_languages': ['German'],
        'timezone': 'CET (UTC+1) / CEST (UTC+2 summer)',
        'cost_of_living_index': 73,
        'avg_tech_salary_usd': {'junior': '42 000–58 000', 'mid': '58 000–80 000', 'senior': '80 000–120 000'},
        'income_tax_top_pct': 45,
        'social_security_employer_pct': 20,
        'social_security_employee_pct': 20,
        'healthcare': 'Mandatory public (GKV) or private (PKV) for high earners',
        'contract_types_common': ['employment', 'freelancer_selbststaendiger', 'b2b_gmbh'],
        'b2b_contractor_notes': (
            'Freelancer (Freiberufler) status available for IT/creative professions — no trade tax. '
            'Gewerbetreibender (trade) requires Gewerbeamt registration. '
            'Scheinselbststaendigkeit (false self-employment) risk — contracts must show genuine independence.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'EU Blue Card (min salary ~€43 800), or IT specialist visa',
        'remote_work_culture': 'Remote normalized; Berlin & Munich are major tech hubs; strong work-life balance culture',
        'key_facts': [
            'Home to SAP, Siemens, Deutsche Telekom, Zalando, N26',
            'Strict employee protections — hard to fire, generous severance',
            'Solidarity surcharge (Solidaritätszuschlag) phased out for most since 2021',
            'Berlin rents rising but still below London/Paris',
            'Strong public transport; DB rail nationwide',
            'Kindergeld child benefit up to €250/month per child',
            '30 days annual leave standard (legal minimum 20 days)',
        ],
        'quality_of_life': 'Very high — excellent infrastructure, healthcare, job security',
    },

    # -----------------------------------------------------------------------
    # NETHERLANDS
    # -----------------------------------------------------------------------
    'NL': {
        'name': 'Netherlands',
        'flag': '🇳🇱',
        'region': 'Western Europe / EU',
        'currency': 'EUR (€)',
        'official_languages': ['Dutch'],
        'timezone': 'CET (UTC+1) / CEST (UTC+2 summer)',
        'cost_of_living_index': 82,
        'avg_tech_salary_usd': {'junior': '44 000–58 000', 'mid': '58 000–80 000', 'senior': '80 000–130 000'},
        'income_tax_top_pct': 49.5,
        'social_security_employer_pct': 20,
        'social_security_employee_pct': 27.65,
        'healthcare': 'Mandatory private insurance (~€150/month); government covers basic',
        'contract_types_common': ['employment', 'zzp_freelance', 'b2b_bv'],
        'b2b_contractor_notes': (
            'ZZP (Zelfstandige Zonder Personeel) is very common. '
            '30% ruling: expats can receive 30% of salary tax-free for 5 years. '
            'VAT 21%; freelancers earning <€20 000 may opt out (KOR).'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'MVOK (Highly Skilled Migrant) — fast track ~2 weeks for recognized sponsors',
        'remote_work_culture': 'Very progressive; part-time and remote normalized; Amsterdam/Eindhoven tech hubs',
        'key_facts': [
            '30% tax ruling for international workers — major financial benefit',
            'Highly skilled migrant visa among fastest in Europe',
            'Excellent English — nearly universal in professional settings',
            'Amsterdam housing is expensive; consider Rotterdam/Utrecht',
            'Flat country — cycling culture; excellent public transport',
            'ASML, Booking.com, Adyen, Philips, TomTom based here',
        ],
        'quality_of_life': 'Excellent — open culture, high wages, great work-life balance',
    },

    # -----------------------------------------------------------------------
    # PORTUGAL
    # -----------------------------------------------------------------------
    'PT': {
        'name': 'Portugal',
        'flag': '🇵🇹',
        'region': 'Southern Europe / EU',
        'currency': 'EUR (€)',
        'official_languages': ['Portuguese'],
        'timezone': 'WET (UTC+0) / WEST (UTC+1 summer)',
        'cost_of_living_index': 55,
        'avg_tech_salary_usd': {'junior': '22 000–32 000', 'mid': '32 000–50 000', 'senior': '50 000–80 000'},
        'income_tax_top_pct': 48,
        'social_security_employer_pct': 23.75,
        'social_security_employee_pct': 11,
        'healthcare': 'Universal public (SNS) + private complements',
        'contract_types_common': ['employment', 'recibos_verdes_freelance', 'b2b_lda'],
        'b2b_contractor_notes': (
            'Recibos Verdes (Green Receipts) — individual freelancer invoicing. '
            'NHR (Non-Habitual Resident) regime: flat 20% tax for 10 years for qualifying professions. '
            'Very attractive for EU remote workers relocating from high-tax countries.'
        ),
        'digital_nomad_visa': True,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Digital Nomad Visa (D8) for remote workers earning >€3 040/month',
        'remote_work_culture': 'Booming; Lisbon & Porto among top European remote work cities',
        'key_facts': [
            'NHR tax regime: 20% flat tax for 10 years (for foreign-source income: 0%)',
            'Digital Nomad Visa D8 — renewable, leads to residency after 5 years',
            'Lisbon rents rising but still below Western European capitals',
            'English widely spoken in Lisbon/Porto tech scene',
            'Excellent quality of life — weather, food, safety, Atlantic coast',
            'Web Summit based in Lisbon; strong startup ecosystem',
            'Portugal Golden Visa still available for investment',
        ],
        'quality_of_life': 'Excellent — very popular with remote workers and expats',
    },

    # -----------------------------------------------------------------------
    # SPAIN
    # -----------------------------------------------------------------------
    'ES': {
        'name': 'Spain',
        'flag': '🇪🇸',
        'region': 'Southern Europe / EU',
        'currency': 'EUR (€)',
        'official_languages': ['Spanish', 'Catalan', 'Basque', 'Galician'],
        'timezone': 'CET (UTC+1) / CEST (UTC+2 summer)',
        'cost_of_living_index': 58,
        'avg_tech_salary_usd': {'junior': '24 000–34 000', 'mid': '34 000–52 000', 'senior': '52 000–85 000'},
        'income_tax_top_pct': 47,
        'social_security_employer_pct': 30.4,
        'social_security_employee_pct': 6.47,
        'healthcare': 'Universal public (SAS/CatSalut etc.) + private widely used',
        'contract_types_common': ['employment', 'autonomo_freelance', 'b2b_sl'],
        'b2b_contractor_notes': (
            'Autónomo (self-employed) registration required for freelancers; '
            'flat-rate cuota €80/month for first 2 years (Tarifa Plana). '
            'Beckham Law: 24% flat tax for up to 6 years for qualifying inbound workers.'
        ),
        'digital_nomad_visa': True,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Digital Nomad Visa (since 2023); Beckham Law for high earners',
        'remote_work_culture': 'Growing fast; Barcelona & Madrid major tech hubs; siesta culture adapting',
        'key_facts': [
            'Beckham Law: 24% flat income tax for first 6 years (non-resident workers)',
            'Digital Nomad Visa requires min €2 646/month income',
            'Barcelona strong in fintech, mobile, gaming (Glovo, Typeform, King)',
            'Madrid: Cabify, Jobandtalent, Fever HQ',
            'Generous social security → strong healthcare & unemployment benefits',
            'Work-life balance improving; remote work law enacted 2021',
        ],
        'quality_of_life': 'Very high — climate, culture, food, social life',
    },

    # -----------------------------------------------------------------------
    # ESTONIA
    # -----------------------------------------------------------------------
    'EE': {
        'name': 'Estonia',
        'flag': '🇪🇪',
        'region': 'Northern Europe / EU',
        'currency': 'EUR (€)',
        'official_languages': ['Estonian'],
        'timezone': 'EET (UTC+2) / EEST (UTC+3 summer)',
        'cost_of_living_index': 54,
        'avg_tech_salary_usd': {'junior': '26 000–36 000', 'mid': '36 000–55 000', 'senior': '55 000–90 000'},
        'income_tax_top_pct': 20,
        'social_security_employer_pct': 33,
        'social_security_employee_pct': 2,
        'healthcare': 'Universal public (Haigekassa) + private',
        'contract_types_common': ['employment', 'self_employed_FIE', 'b2b_ou'],
        'b2b_contractor_notes': (
            'OÜ (Osaühing, private limited) is the go-to for contractors — €2 500 share capital. '
            'E-Residency: can run an EU OÜ from anywhere in the world. '
            'Dividends taxed at 20% only when distributed (not retained). '
            'Corporate tax: 0% on retained earnings — very business-friendly.'
        ),
        'digital_nomad_visa': True,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Digital Nomad Visa (D-visa); E-Residency for company formation',
        'remote_work_culture': 'World leader — government services 99% digital; Skype, TransferWise born here',
        'key_facts': [
            'E-Residency: run an EU company from anywhere — hugely popular with digital nomads',
            'World\'s most digital government — taxes, company registration, voting all online',
            'Flat income tax 20% — simple, predictable',
            'Tallinn: affordable, beautiful medieval old town',
            'Startup ecosystem punching above its weight (Skype, Wise, Bolt, Pipedrive)',
            '0% corporate tax on retained profits — reinvest tax-free',
            'NATO member; strong cybersecurity expertise',
        ],
        'quality_of_life': 'High — digital, efficient, safe, affordable',
    },

    # -----------------------------------------------------------------------
    # UNITED KINGDOM
    # -----------------------------------------------------------------------
    'GB': {
        'name': 'United Kingdom',
        'flag': '🇬🇧',
        'region': 'Western Europe (non-EU post-Brexit)',
        'currency': 'GBP (£)',
        'official_languages': ['English'],
        'timezone': 'GMT (UTC+0) / BST (UTC+1 summer)',
        'cost_of_living_index': 84,
        'avg_tech_salary_usd': {'junior': '38 000–55 000', 'mid': '55 000–85 000', 'senior': '85 000–140 000'},
        'income_tax_top_pct': 45,
        'social_security_employer_pct': 13.8,
        'social_security_employee_pct': 8,
        'healthcare': 'Universal public NHS (free at point of use)',
        'contract_types_common': ['employment', 'ltd_company_contractor', 'umbrella_company', 'b2b'],
        'b2b_contractor_notes': (
            'IR35 rules critical — determine inside/outside IR35 carefully. '
            'Ltd company (Personal Service Company) contracting: outside IR35 = tax efficient. '
            'Inside IR35 = effectively treated as employee for tax. '
            'Umbrella company option if inside IR35. Day rates in London: £400–£800+.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': False,
        'non_eu_work_permit': 'Skilled Worker Visa (min £26 200/yr or £10.75/hr); Global Talent Visa for exceptional talent',
        'remote_work_culture': 'Strong; London, Manchester, Edinburgh tech hubs; Brexit pushed some roles to EU',
        'key_facts': [
            'IR35 tax rules apply to contractor vs employee determination',
            'London: most expensive city; consider Manchester, Edinburgh, Bristol',
            'Post-Brexit: EU citizens need Skilled Worker visa for new roles',
            'NHS — free healthcare; no health insurance cost',
            'Strong fintech hub: Revolut, Monzo, Starling, Wise HQ in London',
            'ISA (Individual Savings Account) — £20 000/yr tax-free investment',
            'Capital Gains Tax: 18–24% depending on asset',
        ],
        'quality_of_life': 'High — strong salaries, NHS, culture; London very expensive',
    },

    # -----------------------------------------------------------------------
    # UNITED STATES
    # -----------------------------------------------------------------------
    'US': {
        'name': 'United States',
        'flag': '🇺🇸',
        'region': 'North America',
        'currency': 'USD ($)',
        'official_languages': ['English'],
        'timezone': 'UTC-5 to UTC-8 (multiple zones)',
        'cost_of_living_index': 100,
        'avg_tech_salary_usd': {'junior': '70 000–100 000', 'mid': '100 000–150 000', 'senior': '150 000–250 000'},
        'income_tax_top_pct': 37,
        'social_security_employer_pct': 7.65,
        'social_security_employee_pct': 7.65,
        'healthcare': 'Private insurance (employer-sponsored or marketplace); no universal system',
        'contract_types_common': ['w2_employment', '1099_contractor', 'c2c_corp_to_corp', 's_corp', 'llc'],
        'b2b_contractor_notes': (
            '1099-NEC: independent contractor — responsible for self-employment tax (15.3%). '
            'Corp-to-Corp (C2C): your LLC/S-Corp bills the client — most tax-efficient for high earners. '
            'S-Corp election saves SE tax on profit above reasonable salary. '
            'No VAT; sales tax varies by state.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': False,
        'non_eu_work_permit': 'H-1B (annual lottery, 65 000 cap); O-1 for extraordinary ability; L-1 intracompany',
        'remote_work_culture': 'Dominant in tech; Silicon Valley, NYC, Austin, Seattle, Miami hubs; fully remote common',
        'key_facts': [
            'No federal paid leave mandate — negotiate vacation; typically 10–15 days',
            'Healthcare tied to employer — losing job = losing insurance (COBRA is expensive)',
            'Stock options (ISO/NSO/RSU) common in tech compensation',
            '401(k): up to $23 000/yr pre-tax retirement savings',
            'State income tax varies: 0% in Texas/Florida, up to 13.3% in California',
            'H-1B visa: annual lottery with low odds (~15% success rate)',
            'At-will employment — easier to hire and fire vs Europe',
        ],
        'quality_of_life': 'Very high salaries; healthcare and inequality concerns; lifestyle varies by state',
    },

    # -----------------------------------------------------------------------
    # CANADA
    # -----------------------------------------------------------------------
    'CA': {
        'name': 'Canada',
        'flag': '🇨🇦',
        'region': 'North America',
        'currency': 'CAD ($)',
        'official_languages': ['English', 'French'],
        'timezone': 'UTC-3.5 to UTC-8 (multiple zones)',
        'cost_of_living_index': 76,
        'avg_tech_salary_usd': {'junior': '50 000–70 000', 'mid': '70 000–100 000', 'senior': '100 000–160 000'},
        'income_tax_top_pct': 33,
        'social_security_employer_pct': 7.7,
        'social_security_employee_pct': 7.7,
        'healthcare': 'Universal public (provincial) — no premiums in most provinces',
        'contract_types_common': ['employment', 't4_employee', 'corp_contractor', 'incorporated_contractor'],
        'b2b_contractor_notes': (
            'Incorporated contractor (Personal Corporation) very tax-efficient: '
            'pay yourself salary + dividends; defer income in the corporation. '
            'SR&ED tax credits for R&D work. '
            'GST/HST registration required above $30 000/year revenue.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': False,
        'non_eu_work_permit': 'Express Entry (CRS points system); Global Talent Stream (2-week processing for tech)',
        'remote_work_culture': 'Very remote-friendly; Toronto, Vancouver, Montreal, Ottawa tech hubs',
        'key_facts': [
            'Global Talent Stream: work permit in ~2 weeks for skilled tech workers',
            'Express Entry: path to permanent residency in ~6 months for qualifying candidates',
            'Universal healthcare — major benefit vs USA',
            'Toronto: major fintech & AI hub (Vector Institute)',
            'Vancouver: EA, Microsoft, Amazon regional HQ',
            'French required for Quebec roles; English sufficient elsewhere',
            'Capital gains inclusion rate 50% (2/3 for >$250 000 from 2024)',
        ],
        'quality_of_life': 'Excellent — healthcare, safety, diversity, immigration-friendly',
    },

    # -----------------------------------------------------------------------
    # UAE / DUBAI
    # -----------------------------------------------------------------------
    'AE': {
        'name': 'United Arab Emirates',
        'flag': '🇦🇪',
        'region': 'Middle East',
        'currency': 'AED (د.إ)',
        'official_languages': ['Arabic'],
        'timezone': 'GST (UTC+4)',
        'cost_of_living_index': 72,
        'avg_tech_salary_usd': {'junior': '40 000–60 000', 'mid': '60 000–100 000', 'senior': '100 000–180 000'},
        'income_tax_top_pct': 0,
        'social_security_employer_pct': 0,
        'social_security_employee_pct': 0,
        'healthcare': 'Employer-provided mandatory health insurance (Dubai/Abu Dhabi law)',
        'contract_types_common': ['employment', 'freezone_company', 'mainland_llc'],
        'b2b_contractor_notes': (
            '0% personal income tax — take-home = gross salary. '
            'Free Zone company: 0% corporate tax (below threshold), 100% foreign ownership. '
            'VAT 5% introduced 2018 — apply to B2B invoices. '
            'Corporate tax 9% on profits >AED 375 000 (from June 2023).'
        ),
        'digital_nomad_visa': True,
        'eu_citizen_right_to_work': False,
        'non_eu_work_permit': 'Employment visa (employer-sponsored) or 1-year Digital Nomad / Freelance visa; Golden Visa for investors',
        'remote_work_culture': 'Growing hub; DIFC, D3, Dubai Internet City tech clusters; fast-paced culture',
        'key_facts': [
            '0% income tax — highest effective take-home in the world',
            'Digital Nomad visa: 1 year, renewable, min income $3 500/month',
            'Dubai 5-year & 10-year Golden Visa for investors and talented professionals',
            'Summer heat extreme (45°C+) — most outdoor life Oct–April',
            'Very safe; multicultural (90%+ expat population)',
            'No social security but employer must pay End of Service gratuity',
            'Friday–Saturday weekend; some companies use Sunday–Thursday',
        ],
        'quality_of_life': 'High income, ultramodern infrastructure; culture restrictions; no pension',
    },

    # -----------------------------------------------------------------------
    # AUSTRALIA
    # -----------------------------------------------------------------------
    'AU': {
        'name': 'Australia',
        'flag': '🇦🇺',
        'region': 'Oceania / Asia-Pacific',
        'currency': 'AUD ($)',
        'official_languages': ['English'],
        'timezone': 'UTC+8 to UTC+11 (multiple zones)',
        'cost_of_living_index': 84,
        'avg_tech_salary_usd': {'junior': '50 000–70 000', 'mid': '70 000–100 000', 'senior': '100 000–155 000'},
        'income_tax_top_pct': 45,
        'social_security_employer_pct': 11,
        'social_security_employee_pct': 0,
        'healthcare': 'Universal Medicare + private hospital cover optional',
        'contract_types_common': ['employment', 'pty_ltd_contractor', 'sole_trader'],
        'b2b_contractor_notes': (
            'Pty Ltd (private company) contracting: tax-efficient for high earners. '
            'Superannuation: employer must contribute 11% of salary to retirement fund. '
            'GST 10% on B2B invoices above $75 000 turnover. '
            'Sham contracting crackdown — contractors must meet genuine independence tests.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': False,
        'non_eu_work_permit': 'TSS 482 visa (employer-sponsored); Global Talent visa for exceptional candidates',
        'remote_work_culture': 'Mature; Sydney, Melbourne, Brisbane tech hubs; excellent work-life balance',
        'key_facts': [
            'Superannuation: 11% mandatory employer contribution to retirement — unique benefit',
            'Sydney and Melbourne among world\'s most liveable cities',
            'Working Holiday visa available for 18–35 year olds from many countries',
            'Strong union culture — enterprise agreements protect workers',
            'Time zone: 8–11 hours ahead of Europe — async work for EU clients is common',
            'Atlassian, Canva, Afterpay, Seek founded here',
            'High property prices in Sydney/Melbourne; regional cities affordable',
        ],
        'quality_of_life': 'Excellent — outdoor lifestyle, high wages, great healthcare, safety',
    },

    # -----------------------------------------------------------------------
    # SWITZERLAND
    # -----------------------------------------------------------------------
    'CH': {
        'name': 'Switzerland',
        'flag': '🇨🇭',
        'region': 'Central Europe (non-EU)',
        'currency': 'CHF (Fr)',
        'official_languages': ['German', 'French', 'Italian', 'Romansh'],
        'timezone': 'CET (UTC+1) / CEST (UTC+2 summer)',
        'cost_of_living_index': 122,
        'avg_tech_salary_usd': {'junior': '70 000–95 000', 'mid': '95 000–140 000', 'senior': '140 000–220 000'},
        'income_tax_top_pct': 40,
        'social_security_employer_pct': 12.5,
        'social_security_employee_pct': 12.5,
        'healthcare': 'Mandatory private insurance (KVG/LAMal) — ~CHF 300–500/month',
        'contract_types_common': ['employment', 'self_employed_einzel', 'b2b_gmbh_ag'],
        'b2b_contractor_notes': (
            'Self-employed (Einzelunternehmen): register with AHV, pay full 10% AHV/IV yourself. '
            'GmbH/AG (private/public company): CHF 20 000 / CHF 100 000 share capital. '
            'Lump-sum taxation (Pauschalsteuer) available for wealthy non-working residents. '
            'Corporate tax: ~14% effective (cantonal variation).'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Limited quota system; L/B permit; very competitive',
        'remote_work_culture': 'High-trust, results-oriented; Zurich, Geneva, Basel, Zug tech/finance hubs',
        'key_facts': [
            'Highest average salaries in Europe by a significant margin',
            'Mandatory health insurance — budget CHF 4 000–6 000/year',
            'Zug (Crypto Valley): major blockchain/crypto hub, low taxes',
            'Work permit for non-EU very limited — employer sponsorship required',
            'EU/EFTA citizens have right to work with registration',
            'No national minimum wage (cantonal minimums exist)',
            'Trilingual environment — German/French/Italian depending on canton',
        ],
        'quality_of_life': 'World-class — safety, nature, efficiency; very high cost',
    },

    # -----------------------------------------------------------------------
    # GEORGIA (country, digital nomad hotspot)
    # -----------------------------------------------------------------------
    'GEO': {
        'name': 'Georgia',
        'flag': '🇬🇪',
        'region': 'Caucasus / Eastern Europe',
        'currency': 'GEL (₾)',
        'official_languages': ['Georgian'],
        'timezone': 'GET (UTC+4)',
        'cost_of_living_index': 32,
        'avg_tech_salary_usd': {'junior': '10 000–18 000', 'mid': '18 000–35 000', 'senior': '35 000–65 000'},
        'income_tax_top_pct': 20,
        'social_security_employer_pct': 0,
        'social_security_employee_pct': 2,
        'healthcare': 'Universal public (basic) + private; health insurance cheap (~$30/month)',
        'contract_types_common': ['employment', 'individual_entrepreneur', 'llc_shrp'],
        'b2b_contractor_notes': (
            'Individual Entrepreneur (IE) with Small Business Status: 1% tax on revenue up to ~$155 000/year. '
            'Virtual Zone IT company: 0% corporate tax on foreign-source income. '
            'Very favourable for remote workers billing EU/US clients. '
            '365-day stay without visa for most nationalities.'
        ),
        'digital_nomad_visa': True,
        'eu_citizen_right_to_work': False,
        'non_eu_work_permit': '1-year "Remotely from Georgia" program; most nationalities visa-free for 365 days',
        'remote_work_culture': 'Booming digital nomad destination; Tbilisi has fast WiFi, cheap coworking',
        'key_facts': [
            'IT Individual Entrepreneur: 1% income tax — one of lowest in world',
            'Virtual Zone: 0% on revenue from foreign clients for IT companies',
            'Most nationalities stay 365 days visa-free',
            'Tbilisi: excellent food, nightlife, architecture; very affordable',
            'Coworking spaces from $50/month; rent from $400/month',
            'Fast fiber internet widely available',
            'Banking: easy to open account; Wise/Revolut accepted',
        ],
        'quality_of_life': 'Very good for budget-conscious remote workers; growing tech scene',
    },

    # -----------------------------------------------------------------------
    # POLAND
    # -----------------------------------------------------------------------
    'PL': {
        'name': 'Poland',
        'flag': '🇵🇱',
        'region': 'Central Europe / EU',
        'currency': 'PLN (zł)',
        'official_languages': ['Polish'],
        'timezone': 'CET (UTC+1) / CEST (UTC+2 summer)',
        'cost_of_living_index': 48,
        'avg_tech_salary_usd': {'junior': '20 000–32 000', 'mid': '32 000–55 000', 'senior': '55 000–90 000'},
        'income_tax_top_pct': 32,
        'social_security_employer_pct': 19.8,
        'social_security_employee_pct': 13.7,
        'healthcare': 'Universal public (NFZ) + private supplements',
        'contract_types_common': ['employment', 'b2b_jdg', 'umowa_zlecenie', 'umowa_o_dzielo'],
        'b2b_contractor_notes': (
            'B2B via JDG (Jednoosobowa Działalność Gospodarcza) very common in IT. '
            'Ryczałt (lump-sum) tax: 12% on IT services revenue. '
            'Linear tax (podatek liniowy): 19% flat on profit — popular for mid-high earners. '
            'Major cost advantage vs employment for both sides.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Work permit required; Ukraine citizens have simplified access',
        'remote_work_culture': 'Strong outsourcing tradition; Warsaw, Kraków, Wrocław, Gdańsk tech hubs',
        'key_facts': [
            'Largest IT outsourcing hub in Central-Eastern Europe',
            'B2B contracting dominant in IT — saves both parties social security',
            'Warsaw growing startup scene; Kraków known for R&D centres (Google, IBM, Motorola)',
            'PLN currency risk for EUR contracts — common to invoice in EUR',
            'EU member since 2004; not on EUR',
            'Strong university technical graduates pipeline',
            'Remote work legal framework updated 2023 (Labour Code amendment)',
        ],
        'quality_of_life': 'Good — affordable, improving infrastructure, vibrant cities',
    },

    # -----------------------------------------------------------------------
    # ROMANIA
    # -----------------------------------------------------------------------
    'RO': {
        'name': 'Romania',
        'flag': '🇷🇴',
        'region': 'Eastern Europe / EU',
        'currency': 'RON (lei)',
        'official_languages': ['Romanian'],
        'timezone': 'EET (UTC+2) / EEST (UTC+3 summer)',
        'cost_of_living_index': 42,
        'avg_tech_salary_usd': {'junior': '16 000–26 000', 'mid': '26 000–45 000', 'senior': '45 000–75 000'},
        'income_tax_top_pct': 10,
        'social_security_employer_pct': 2.25,
        'social_security_employee_pct': 35,
        'healthcare': 'Universal public (CNAS) + private',
        'contract_types_common': ['employment', 'pfa_freelance', 'srl_company'],
        'b2b_contractor_notes': (
            'PFA (Persoană Fizică Autorizată): 10% flat income tax + 25% CAS (pension) + 10% CASS (health). '
            'SRL (private company): 1% micro-enterprise tax on revenue up to €500 000. '
            'IT employees exempt from income tax (0%) — major employer incentive for employment contracts. '
            'Very cost-competitive for nearshore development.'
        ),
        'digital_nomad_visa': False,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Standard EU procedure; IT shortage positions easier',
        'remote_work_culture': 'Strong outsourcing culture; Bucharest, Cluj-Napoca, Timișoara, Iași tech hubs',
        'key_facts': [
            'IT employees pay 0% income tax — unique EU incentive to attract tech talent',
            '1% micro-enterprise tax for SRLs (turnover < €500k)',
            'Some of fastest internet in Europe (Bucharest top 10 globally)',
            'Cluj-Napoca: most dynamic tech city; UiPath founded here',
            'Very cost-competitive for European tech companies',
            'EU member; not on EUR (RON)',
            'Brain drain concern but remote work keeping talent in country',
        ],
        'quality_of_life': 'Improving — affordable, EU member, fast internet; bureaucracy can be slow',
    },

    # -----------------------------------------------------------------------
    # CYPRUS
    # -----------------------------------------------------------------------
    'CY': {
        'name': 'Cyprus',
        'flag': '🇨🇾',
        'region': 'Eastern Mediterranean / EU',
        'currency': 'EUR (€)',
        'official_languages': ['Greek', 'Turkish'],
        'timezone': 'EET (UTC+2) / EEST (UTC+3 summer)',
        'cost_of_living_index': 64,
        'avg_tech_salary_usd': {'junior': '20 000–30 000', 'mid': '30 000–50 000', 'senior': '50 000–80 000'},
        'income_tax_top_pct': 35,
        'social_security_employer_pct': 8.8,
        'social_security_employee_pct': 8.8,
        'healthcare': 'Universal public GESY (since 2020) + private',
        'contract_types_common': ['employment', 'self_employed', 'limited_company'],
        'b2b_contractor_notes': (
            'Non-Dom regime: foreign-source dividends & interest 0% tax for 17 years. '
            'IP Box: 80% exemption on qualifying IP income → effective ~2.5% tax. '
            'Popular for holding companies and tech IP licensing. '
            'Social security cap makes employment attractive for high earners.'
        ),
        'digital_nomad_visa': True,
        'eu_citizen_right_to_work': True,
        'non_eu_work_permit': 'Category F visa; Non-Dom + company registration path; Fast-Track Business Activation (60 days)',
        'remote_work_culture': 'Growing rapidly — Limassol tech hub growing fast (eToro, KPMG, big4 offices)',
        'key_facts': [
            'Non-Domicile status: 0% tax on foreign dividends & interest for 17 years',
            'IP Box regime: effective 2.5% tax on qualifying intellectual property income',
            'EU member with English widely spoken — all official documents in English/Greek',
            'Limassol: fastest-growing tech hub in Eastern Med',
            'Mediterranean climate; low crime rate',
            'GESY (universal healthcare) provides good basic coverage',
            'Company registration straightforward for EU citizens',
        ],
        'quality_of_life': 'Excellent — climate, EU membership, growing tech scene, beaches',
    },
}

# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

# Map country names and common aliases to ISO codes
_NAME_MAP: Dict[str, str] = {}
for _code, _data in COUNTRIES.items():
    _NAME_MAP[_data['name'].lower()] = _code
    _NAME_MAP[_code.lower()] = _code

# Extra aliases
_ALIASES = {
    'uk': 'GB', 'england': 'GB', 'usa': 'US', 'america': 'US',
    'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE',
    'geo': 'GEO', 'tbilisi': 'GEO', 'georgia': 'GEO',
    'eu': None,  # ambiguous
}
for _alias, _code in _ALIASES.items():
    if _code:
        _NAME_MAP[_alias] = _code


def detect_country(text: str) -> Optional[str]:
    """
    Try to detect a country from a job description string.
    Returns the ISO code or None.
    """
    text_lower = text.lower()
    # Longest match first to avoid false positives
    candidates = sorted(_NAME_MAP.keys(), key=len, reverse=True)
    for name in candidates:
        if name in text_lower:
            return _NAME_MAP[name]
    return None


def get_country(code_or_name: str) -> Optional[Dict[str, Any]]:
    """
    Return country context by ISO code (e.g. 'GR') or name (e.g. 'Greece').
    """
    key = _NAME_MAP.get(code_or_name.lower()) or code_or_name.upper()
    return COUNTRIES.get(key)


def country_summary(code_or_name: str) -> Dict[str, Any]:
    """
    Return a compact summary suitable for API responses.
    """
    ctx = get_country(code_or_name)
    if not ctx:
        return {'error': 'Country not found', 'available': list(COUNTRIES.keys())}
    return ctx


def list_countries() -> List[Dict[str, Any]]:
    """Return minimal list of all supported countries."""
    return [
        {
            'code': code,
            'name': data['name'],
            'flag': data['flag'],
            'region': data['region'],
            'cost_of_living_index': data['cost_of_living_index'],
            'income_tax_top_pct': data['income_tax_top_pct'],
            'digital_nomad_visa': data['digital_nomad_visa'],
        }
        for code, data in COUNTRIES.items()
    ]
