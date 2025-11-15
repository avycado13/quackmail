# Project Brief: QuackMail Real Email Integration

## Goal
Replace all mock email data in the QuackMail webmail client with real IMAP and SMTP integration using `imapflow` for fetching emails and `nodemailer` for sending emails.

## Requirements
- Incoming Mail (IMAP): Use imapflow to connect to user's mail server, fetch folders and email metadata, support pagination and background sync, parse HTML/plaintext content using mailparser, reactive UI updates.
- Outgoing Mail (SMTP): Use nodemailer to send emails through user's configured SMTP server, handle attachments, CC/BCC, reply/forward functionality.
- Architecture: Abstract IMAP/SMTP logic into service layer, expose REST/WebSocket endpoints, secure session handling, support multiple accounts.
- Environment Setup: Add .env variables for IMAP/SMTP configuration.
- Testing: Add mock account for integration testing, verify sent emails appear in Sent and received ones sync correctly.

## Output
A working implementation where QuackMail's UI now fetches and sends real emails through IMAP/SMTP using imapflow and nodemailer, fully replacing mock data.
