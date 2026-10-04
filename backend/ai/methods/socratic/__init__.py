"""The Socratic plugin.

One directory = one method. The registry (`ai/methods/__init__.py`) discovers
these the way `ai/skills/registry.py` discovers skills: by directory, with the
name required to match the directory name, and validated at startup. Adding a
method means adding a directory — nothing in the core changes.
"""

from ai.methods.socratic.method import SocraticMethod

__all__ = ["SocraticMethod"]
