from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import sys

from .routes.health import bp as health_bp
from .routes.auth import bp as auth_bp
from .routes.credits import bp as credits_bp
from .routes.stripe_webhook import bp as stripe_bp
from .routes.attestation import bp as attest_bp
from .routes.kit import bp as kit_bp
from .routes.profile import bp as profile_bp
from .routes.job import bp as job_bp
from .routes.ats import bp as ats_bp
from .routes.interview import bp as interview_bp
from .routes.outreach import bp as outreach_bp
from .routes.verifyid_webhook import bp as verifyid_bp
from .routes.kyc import bp as kyc_bp
from .routes.n8n import bp as n8n_bp
from .routes.cv import bp as cv_bp
from .routes.candidates import bp as candidates_bp
from .routes.verify_session import bp as verify_bp
from .routes.manager import bp as manager_bp
from .routes.psychology import bp as psychology_bp
from .routes.guarantee import bp as guarantee_bp
from .db.store import init_db


# SECURITY: Fail-fast on missing critical secrets — Phase 0 hardening
_REQUIRED_SECRETS = [
    'JWT_SECRET_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'ATTESTOR_PRIVKEY_HEX',
]


def _check_required_secrets() -> None:
    """Abort startup if any critical secret is missing from the environment."""
    missing = [name for name in _REQUIRED_SECRETS if not os.getenv(name, '').strip()]
    if missing:
        print(
            f"FATAL: missing required secret(s): {', '.join(missing)}. "
            "Set them as environment variables before starting the app.",
            file=sys.stderr,
        )
        sys.exit(1)


def create_app() -> Flask:
    load_dotenv()

    # SECURITY: Fail-fast on missing critical secrets — Phase 0 hardening
    _check_required_secrets()

    app = Flask(__name__)
    app.config['APP_ENV'] = os.getenv('APP_ENV', 'development')
    app.config['DATABASE_URL'] = os.getenv('DATABASE_URL', 'sqlite:///careerforge.db')

    # SECURITY: CORS restricted to known origins — Phase 0 hardening
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://thronoschain.org,https://careerforge-ai.thronoschain.org,https://api.thronoschain.org").split(",")
    CORS(app, origins=CORS_ORIGINS, supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

    init_db(app.config['DATABASE_URL'])

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(credits_bp)
    app.register_blueprint(stripe_bp)
    app.register_blueprint(attest_bp)
    app.register_blueprint(kit_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(job_bp)
    app.register_blueprint(ats_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(outreach_bp)
    app.register_blueprint(verifyid_bp)
    app.register_blueprint(kyc_bp)
    app.register_blueprint(n8n_bp)
    app.register_blueprint(cv_bp)
    app.register_blueprint(candidates_bp)
    app.register_blueprint(verify_bp)
    app.register_blueprint(manager_bp)
    app.register_blueprint(psychology_bp)
    app.register_blueprint(guarantee_bp)

    return app
