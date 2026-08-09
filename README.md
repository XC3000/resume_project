# Incident Triage Agent

A multi-tenant incident triage platform. Ingests CI failures, retrieves similar historical failures from a vector index, and classifies incidents with that context.

## Plan Limits & Manual Billing Configuration

Plans are configured manually in the database by setting the `plan` field on the `Organization` record to either `FREE` or `PRO`. There are no payment gateway integrations.

### Plan Configuration Limits
| Limit Parameter | `FREE` Plan | `PRO` Plan |
| :--- | :--- | :--- |
| **Daily Token Cap** | 100,000 tokens | 5,000,000 tokens |
| **Max Connected Projects** | 3 projects | 50 projects |
| **Max Workspace Members** | 5 members | 100 members |
| **Max Active API Keys** | 3 keys | 50 keys |

---

## Demo Mode

To enable unauthenticated visitor sandbox simulations:
1. Set `DEMO_MODE=true` in your environment variables.
2. Unauthenticated visitors can view the pre-seeded read-only demo workspace at `/demo` with full stack traces and logs classification mocks.
3. No external LLM token calls are triggered when viewing or running simulations in the demo workspace context.
