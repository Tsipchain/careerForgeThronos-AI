"""WSGI entry point for gunicorn / Railway deployment.

Railway's Railpack cannot parse parentheses in start commands —
`app:create_app()` causes "Failed to parse start command".
This file instantiates the Flask app at import time so gunicorn can
use `wsgi:app` as the target with no shell-parsing issues.
"""
from app import create_app

app = create_app()
