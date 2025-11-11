# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-11-11

### Added
- Initial release of Prefix service including `/v1/scan`, `/v1/scan/url`, `/v1/scan/rfc822`, `/v1/scan/schema`, `/v1/metrics`, and `/v1/health`.
- Token scanning engine with severity policy, context-aware advice, and HTML text sanitization.
- LRU caching for URL scans and Idempotency-Key response caching.
- Schema cross-check, RFC822 parser, and Prometheus metrics support.
- Dockerfile, docker-compose, OpenAPI spec, Postman collection, monitoring dashboard, and CI workflow.
- Comprehensive test suite covering scanners, API routes, caching, and idempotency behavior.
