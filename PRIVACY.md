# Privacy Policy

**Last updated:** August 7, 2026

This Privacy Policy explains what information the Dani Server Utilities bot ("the bot") collects, why it collects it, and how that information is stored and handled.

By using the bot's features in the Dani Discord server, you agree to the practices described in this policy.

## What data we collect

The bot stores data in a MongoDB database in order to provide its features:

- **Discord identifiers** — user IDs, guild (server) IDs, channel IDs, role IDs, and message IDs. These are required by almost every feature (permissions, settings, cooldowns, and tracking).
- **Message content** — only in specific cases:
  - Suggestions submitted through the suggestion system are stored, along with the author's user ID and approval status.
  - Custom commands, triggers, and phrases configured by server staff are stored so they can be matched against future messages.
  - Messages are processed in-memory for features such as link detection, invite detection, chain detection, emoji suggestions, and text commands; this content is generally not persisted.
- **XP / activity data** — user ID, message count, and XP amounts per guild, used for the XP/leveling system.
- **Custom names** — user ID and any custom name assigned via the name commands.
- **Command usage data** — command identifiers, user IDs, and timestamps, used for cooldowns and permission checks.
- **Link access configuration** — user IDs granted or denied link access, including the reason and who granted it.
- **Emoji usage statistics** — emoji names and usage counts.
- **Server configuration** — configured prefixes, channels, roles, poll settings, anchor/auto-archive/auto-slow/auto-ping settings, mentor configuration, and similar per-server settings.
- **Webhook data** — the bot may run an HTTP webhook receiver (e.g. for Vikunja task events). Task data sent to this endpoint is processed and forwarded to Discord channels; it is not stored by the bot itself.

We do not collect email addresses, phone numbers, or payment information. We do not sell, trade, or rent your personal information to anyone.

## How we use your data

Your data is used to operate the bot's features: handling commands and interactions, enforcing permissions and cooldowns, providing XP and levels, storing suggestions, applying server configuration, and detecting prohibited content such as links and invites.

## Where and how data is stored

Data is stored on infrastructure operated by the bot owner(s). Access to the data is limited to the bot itself and its operators. Your data may also pass through third-party infrastructure used to run the bot, such as the hosting provider and Discord's API, which are each subject to their own policies.

## Logs

The bot does not write persistent log files. Error and status messages are printed to the console, which may be captured by the hosting provider's container or host logging. These logs are not used for analytics and are not deliberately retained beyond the hosting provider's default retention.

## Retention and deletion

We retain data for as long as it is needed to provide the bot's features. There is no automatic expiry.

To request deletion of data associated with your user account, contact the bot owner (see below). We will remove the data we can identify as yours.

Records used to enforce server rules — such as link access restrictions — may be retained even after a deletion request, so that those restrictions remain enforceable. This does not affect your other data, which will be removed as requested.

## Your rights (GDPR / CCPA)

Depending on your jurisdiction, you may have the right to:

- Access the personal data we hold about you
- Correct inaccurate or incomplete data
- Request erasure of your personal data, under certain conditions
- Restrict or object to processing, under certain conditions
- Data portability
- Know whether your personal information is sold or shared, and to opt out

To exercise any of these rights, contact us (see below). We will respond within one month.

## Changes to this policy

We may update this policy from time to time. The effective date at the top of this document reflects the latest revision. Continued use of the bot after changes constitutes acceptance of the updated policy.

## Contact

For privacy-related questions or data deletion requests, contact the bot owner via the [Dani Discord server](https://discord.gg/danii) or by email at contact@3vil.net.

---

*This privacy policy was drafted with the assistance of AI and reviewed by the bot's maintainers.*
