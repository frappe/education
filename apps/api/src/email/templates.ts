import type { EmailMessage } from "./provider";

/**
 * All emails are plain English (level A2-B1): short sentences, one clear action.
 * Every link opens a page in the app that asks for one click, so a mail scanner that
 * "opens" the link cannot use it up.
 */

export const verifyEmailMessage = (to: string, name: string, link: string): EmailMessage => ({
  kind: "verify_email",
  to,
  subject: "Please confirm your email",
  text: [
    `Hi ${name},`,
    "",
    "Thanks for joining. Please confirm your email address:",
    link,
    "",
    "This link works for 24 hours. If you did not sign up, you can ignore this email.",
  ].join("\n"),
});

export const alreadyHaveAccountMessage = (
  to: string,
  name: string,
  signInLink: string,
  resetLink: string,
): EmailMessage => ({
  kind: "account_exists",
  to,
  subject: "You already have an account",
  text: [
    `Hi ${name},`,
    "",
    "Someone tried to sign up with this email, but you already have an account.",
    `Sign in here: ${signInLink}`,
    `Forgot your password? ${resetLink}`,
    "",
    "If this was not you, you can ignore this email.",
  ].join("\n"),
});

export const resetPasswordMessage = (to: string, name: string, link: string): EmailMessage => ({
  kind: "password_reset",
  to,
  subject: "Reset your password",
  text: [
    `Hi ${name},`,
    "",
    "We got a request to reset your password. Choose a new one here:",
    link,
    "",
    "This link works for 1 hour and only once. If you did not ask for this, you can ignore this email. Your password will not change.",
  ].join("\n"),
});

export const magicLinkMessage = (to: string, name: string, link: string): EmailMessage => ({
  kind: "magic_link",
  to,
  subject: "Your sign in link",
  text: [
    `Hi ${name},`,
    "",
    "Use this link to sign in. You do not need a password:",
    link,
    "",
    "This link works for 15 minutes and only once. If you did not ask for it, you can ignore this email.",
  ].join("\n"),
});

export const inviteMessage = (
  to: string,
  studentName: string,
  teacherName: string,
  link: string,
): EmailMessage => ({
  kind: "invite",
  to,
  subject: `${teacherName} invited you`,
  text: [
    `Hi ${studentName},`,
    "",
    `${teacherName} invited you to join their class. Accept the invite here:`,
    link,
    "",
    "This link works for 7 days. If you do not know this person, you can ignore this email.",
  ].join("\n"),
});
