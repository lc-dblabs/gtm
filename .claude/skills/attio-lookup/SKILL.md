---
name: attio-lookup
description: Look up contacts, companies, deals, or other records in Attio CRM. Use when asked about customers, prospects, deal status, or CRM data.
---

# Attio Lookup

Query Attio CRM for contacts, companies, deals, and other records.

## Prerequisites

Requires `ATTIO_API_KEY` environment variable to be set.

## Capabilities

- Search for contacts by name or email
- Look up company information
- Check deal/opportunity status
- View recent activities and notes

## Usage

When a user asks about CRM data:

1. Identify what they're looking for (contact, company, deal, etc.)
2. Use the `attio_search` or `attio_get_record` tools
3. Format the response clearly with relevant fields

## Example Queries

- "What's the status of the Acme deal?"
- "Find contact info for John Smith"
- "Show me all deals in negotiation stage"
- "What companies have we talked to this week?"

## Note

This skill requires Attio API integration to be configured in Oracle.
See `oracle/src/attio.ts` for implementation (TODO).
