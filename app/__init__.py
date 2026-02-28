from flask import Flask
from dotenv import load_dotenv
import os

from .routes.health import bp as health_bp
from .routes.credits import bp as credits_bp
from .routes.stripe_webhook import bp as stripe_bp
from .routes.attestation import bp as attest_bp
from .routes.kit import bp as kit_bp
from .routes.profile import bp as profile_bp
from .routes.job import bp as job_bp
from .routes.ats import bp as ats_bp
from .routes.interview import bp as interview_bp
from .routes.outreach import bp as outreach_bp
from .db.store import init_db


def create_app() -> Flask:
    load_dotenv()

    app = Flask(__name__)
    app.config['APP_ENV'] = os.getenv('APP_ENV', 'development')
    app.config['DATABASE_URL'] = os.getenv('DATABASE_URL', 'sqlite:///careerforge.db')

    init_db(app.config['DATABASE_URL'])

    app.register_blueprint(health_bp)
    app.register_blueprint(credits_bp)
    app.register_blueprint(stripe_bp)
    app.register_blueprint(attest_bp)
    app.register_blueprint(kit_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(job_bp)
    app.register_blueprint(ats_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(outreach_bp)

    return app
