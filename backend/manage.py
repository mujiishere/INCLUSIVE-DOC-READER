#!/usr/bin/env python
"""Django command-line utility for administrative tasks."""

import os
import sys


def main():
    """Set default settings module and run Django command."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
