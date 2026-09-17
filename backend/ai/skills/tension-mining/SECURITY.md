# Security Policy

## Supported Versions

The Tension Mining project follows semantic versioning. Security patches are
applied to the latest stable release and, where feasible, to the two most
recent minor versions.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of the Tension Mining project and its community seriously.
If you discover a security vulnerability, please report it responsibly by
following the process below.

### How to Report

1. **Do not** open a public issue or discussion for the vulnerability.
2. Open a **GitHub Issue** at
   https://github.com/zbbsdsb/Tension-Mining/issues/new and select the
   appropriate template. Add the `security` label to the issue.
3. In the issue description, clearly describe:
   - The nature and scope of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Any suggested remediation (if known)

The issue will be treated as confidential until a fix is released.

### Response Timeline

- **Acknowledgment**: You will receive an acknowledgment within **48 hours**
  of submitting the report.
- **Validation**: The maintainer will triage and validate the report within
  72 hours of acknowledgment.
- **Fix**: A fix will be developed and released within **7 calendar days** of
  validation, depending on the severity and complexity of the issue.
- **Disclosure**: A public advisory will be published after the fix is
  released, with credit to the reporter unless they prefer to remain
  anonymous.

### What to Expect

- You will receive periodic status updates during the fix process.
- If the 7-day timeline cannot be met (e.g., due to the scope of the fix),
  you will be informed with a revised estimate.
- After the fix is released, you will be invited to verify the patch before
  public disclosure.

## Responsible Disclosure Guidelines

We ask that you:

- **Report first**: Always report vulnerabilities privately before disclosing
  them publicly.
- **Give us time**: Allow the 7-day fix window before any public discussion.
- **Act in good faith**: Do not exploit the vulnerability or access data
  beyond what is necessary to demonstrate the issue.
- **Avoid destructive testing**: Do not perform actions that could degrade,
  disrupt, or damage the project's infrastructure, data, or community.

We are committed to working with security researchers and community members to
protect the security of this project. Thank you for helping us keep Tension
Mining safe for everyone.

## Scope

This security policy covers:

- The source code in this repository (scripts, configurations, skill files)
- CI/CD workflows and automation scripts
- Documentation and atlas content

It does not cover:

- Third-party dependencies (report those to the respective maintainers)
- AI tools or platforms that consume the skill (e.g., Claude Code, TRAE,
  Cursor — report to those platforms directly)
- General methodology content that does not involve executable code