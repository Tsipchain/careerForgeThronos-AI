"""
AI Core client — calls Render node 4 (LLM/RAG/Templates) for inference.

If AICORE_API_URL is not set, falls back to built-in stubs so the service
boots and is testable without a live AI core.
"""
import os
import json
import hashlib
from typing import Dict, Any, List, Optional

import requests


def _base() -> Optional[str]:
    return os.getenv('AICORE_API_URL', '').rstrip('/') or None


def _post(path: str, body: Dict) -> Dict:
    base = _base()
    if not base:
        return {}
    url = f"{base}{path}"
    r = requests.post(url, json=body, timeout=60,
                      headers={'Authorization': f"Bearer {os.getenv('AICORE_API_KEY','')}"})
    r.raise_for_status()
    return r.json()


# ---------------------------------------------------------------------------
# ATS scoring
# ---------------------------------------------------------------------------

def ats_score(cv_text: str, job_parsed: Dict, options: Dict) -> Dict:
    if _base():
        return _post('/v1/ats/score', {'cv_text': cv_text, 'job': job_parsed, 'options': options})
    # Stub
    keywords_hard = job_parsed.get('keywords', {}).get('hard', [])
    cv_lower = cv_text.lower()
    covered = [kw for kw in keywords_hard if kw.lower() in cv_lower]
    missing = [kw for kw in keywords_hard if kw.lower() not in cv_lower]
    pct = round(len(covered) / len(keywords_hard), 2) if keywords_hard else 1.0
    score = int(pct * 100)
    evidence_map = [
        {'requirement': kw, 'covered': kw in covered, 'where': 'profile'}
        for kw in keywords_hard[:10]
    ]
    return {
        'ats_score': score,
        'keyword_coverage_pct': pct,
        'missing_keywords': missing,
        'format_flags': [],
        'evidence_map': evidence_map,
        'recommendations': [
            'Mirror key terms from the JD naturally.',
            'Use a single-column ATS-friendly layout.',
            'Quantify achievements where possible.',
        ],
    }


# ---------------------------------------------------------------------------
# Kit generation (CV + cover + outreach + interview)
# ---------------------------------------------------------------------------

def generate_kit(profile: Dict, job: Dict, outputs: Dict, constraints: Dict) -> Dict:
    if _base():
        return _post('/v1/kit/generate', {
            'profile': profile, 'job': job, 'outputs': outputs, 'constraints': constraints
        })
    job_title = job.get('parsed', {}).get('title', 'the role') if job.get('parsed') else 'the role'
    company = job.get('parsed', {}).get('company', 'the company') if job.get('parsed') else 'the company'
    name = profile.get('identity', {}).get('full_name', 'Candidate') if profile else 'Candidate'
    return {
        'cv': {
            'summary': f"Tailored CV for {name} applying to {job_title} at {company}.",
            'bullets': [
                'Designed and shipped REST APIs, improving response latency by 30%.',
                'Implemented CI/CD pipelines reducing deployment time by 60%.',
                'Led cross-functional teams to deliver projects on time.',
            ],
            'ats_notes': [
                'Use single-column ATS layout.',
                'Mirror key terms from JD naturally.',
                'Quantify impact (latency, cost, revenue, users).',
            ],
        },
        'cover_letter': (
            f"Dear Hiring Team at {company},\n\n"
            f"I am applying for the {job_title} position. "
            "I bring proven impact in scalable systems and cross-team collaboration.\n\n"
            "Best regards,\n" + name
        ),
        'outreach_pack': {
            'day_0': f"Subject: {job_title} application – {company}\n\nHello, I am reaching out regarding the {job_title} opening.",
            'day_5': f"Subject: Following up – {job_title}\n\nJust following up on my application.",
        },
        'interview_pack': {
            'technical_topics': ['System design', 'REST API best practices', 'Database indexing'],
            'behavioral_questions': [
                'Tell me about a time you resolved a conflict in a team.',
                'Describe a project where you had to learn quickly.',
            ],
            'star_stories': [
                {
                    'title': 'Latency reduction',
                    'situation': 'API p99 latency was 2 s under load.',
                    'task': 'Reduce it to under 200 ms.',
                    'action': 'Profiled bottlenecks, added caching layer, optimised queries.',
                    'result': 'p99 latency dropped to 180 ms; 90% improvement.',
                }
            ],
            'questions_to_ask': [
                'How do you measure engineering quality?',
                'What does the on-call rotation look like?',
            ],
        },
    }


# ---------------------------------------------------------------------------
# Interview pack
# ---------------------------------------------------------------------------

def generate_interview_pack(profile: Dict, job: Dict, company_context: Dict) -> Dict:
    if _base():
        return _post('/v1/interview/prepare', {
            'profile': profile, 'job': job, 'company_context': company_context
        })
    company = company_context.get('company', 'the company')
    domain = company_context.get('domain', 'tech')
    return {
        'technical_topics': [f'{domain.title()} system design', 'API design', 'Postgres indexing'],
        'behavioral_questions': [
            'Tell me about a conflict you resolved.',
            'Describe a situation where you had to deliver under tight deadlines.',
        ],
        'star_stories': [
            {
                'title': 'Latency reduction',
                'situation': 'Production API had high p99 latency.',
                'task': 'Reduce latency by 50%.',
                'action': 'Profiled, added caching, optimised SQL queries.',
                'result': 'p99 latency reduced from 2 s to 180 ms.',
            }
        ],
        'questions_to_ask': [
            'How do you measure engineering quality?',
            f'What are the biggest technical challenges at {company} right now?',
        ],
    }


# ---------------------------------------------------------------------------
# Outreach generation
# ---------------------------------------------------------------------------

def generate_outreach(profile: Dict, job: Dict, channel: str,
                      tone: str, cadence_days: List[int]) -> List[Dict]:
    if _base():
        return _post('/v1/outreach/generate', {
            'profile': profile, 'job': job,
            'channel': channel, 'tone': tone, 'cadence_days': cadence_days
        })
    job_title = job.get('parsed', {}).get('title', 'the role') if job.get('parsed') else 'the role'
    company = job.get('parsed', {}).get('company', 'the company') if job.get('parsed') else 'the company'
    name = profile.get('identity', {}).get('full_name', 'Candidate') if profile else 'Candidate'

    messages = [
        {
            'day': 0,
            'subject': f'{job_title} application – {company}',
            'body': (
                f"Hello,\n\nI am writing to express my interest in the {job_title} position at {company}. "
                "I believe my background aligns well with your requirements.\n\n"
                f"Best regards,\n{name}"
            ),
        }
    ]
    follow_ups = [
        ('Following up', 'Just following up on my earlier application. Happy to provide any additional information.'),
        ('Checking in', 'I remain very interested in the opportunity and would love to connect.'),
    ]
    for i, day in enumerate(cadence_days):
        subj, body_snippet = follow_ups[min(i, len(follow_ups) - 1)]
        messages.append({
            'day': day,
            'subject': f'{subj} – {job_title}',
            'body': f"Hello,\n\n{body_snippet}\n\nBest regards,\n{name}",
        })
    return messages


# ---------------------------------------------------------------------------
# Job parsing
# ---------------------------------------------------------------------------

def parse_job(raw_text: str) -> Dict:
    if _base():
        return _post('/v1/job/parse', {'raw_text': raw_text})
    # Stub: extract some heuristics
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    title = lines[0] if lines else 'Unknown Role'
    company = lines[1] if len(lines) > 1 else 'Unknown Company'

    hard_kws: List[str] = []
    for kw in ['Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Java',
                'PostgreSQL', 'MySQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes',
                'REST', 'GraphQL', 'AWS', 'GCP', 'Azure', 'React', 'Node.js',
                'Flask', 'Django', 'FastAPI', 'CI/CD', 'Git']:
        if kw.lower() in raw_text.lower():
            hard_kws.append(kw)

    soft_kws: List[str] = []
    for kw in ['ownership', 'collaboration', 'communication', 'leadership',
                'problem-solving', 'teamwork', 'autonomy']:
        if kw.lower() in raw_text.lower():
            soft_kws.append(kw)

    return {
        'company': company,
        'title': title,
        'location': '',
        'employment_type': 'full-time',
        'seniority': '',
        'responsibilities': [],
        'requirements_must': hard_kws[:5],
        'requirements_nice': [],
        'keywords': {
            'hard': [kw.lower() for kw in hard_kws],
            'soft': soft_kws,
        },
    }
