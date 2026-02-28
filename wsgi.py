"""WSGI entry point for gunicorn / Railway deployment.

Railway cannot parse `app:create_app()` parentheses in start commands.
This file instantiates the Flask app at import time so gunicorn can use
`wsgi:app` as the target without any shell quoting issues.
"""
from app import create_app

app = create_app()
