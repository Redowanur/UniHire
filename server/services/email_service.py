import logging
import os
import smtplib
from datetime import datetime, timedelta, timezone
from html import escape
from email.message import EmailMessage

from anyio import to_thread

logger = logging.getLogger("email_service")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Job Portal <no-reply@jobportal.local>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class EmailDeliveryError(Exception):
    """The SMTP server couldn't be reached or refused the message."""


def build_verification_email(name: str, user_type: str, verify_link: str) -> str:
    return f"""
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h2 style="color: #0d1526; margin: 0 0 8px;">Verify your email</h2>
      <p style="color: #667085; font-size: 15px; line-height: 1.6;">
        Hi {name},<br/><br/>
        Thanks for signing up as a <strong>{user_type}</strong> on Job Portal.
        Please confirm your email address to activate your account:
      </p>
      <p style="text-align: center; margin: 28px 0;">
        <a href="{verify_link}"
           style="background-color: #2cb18a; color: #ffffff; text-decoration: none;
                  font-weight: bold; font-size: 15px; padding: 12px 28px; border-radius: 10px;
                  display: inline-block;">
          Verify Email
        </a>
      </p>
      <p style="color: #667085; font-size: 13px; line-height: 1.6;">
        This link expires in 48 hours. If the button doesn't work, paste this URL into your browser:<br/>
        <a href="{verify_link}" style="color: #219a75; word-break: break-all;">{verify_link}</a>
      </p>
      <p style="color: #98a2b3; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    """


def build_password_reset_email(name: str, code: str, expire_minutes: int) -> str:
    return f"""
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h2 style="color: #0d1526; margin: 0 0 8px;">Reset your password</h2>
      <p style="color: #667085; font-size: 15px; line-height: 1.6;">
        Hi {name},<br/><br/>
        Use the code below to reset your UniHire password. It expires in
        {expire_minutes} minutes.
      </p>
      <p style="text-align: center; margin: 28px 0;">
        <span style="display: inline-block; font-size: 28px; font-weight: bold;
                     letter-spacing: 8px; background-color: #f6f4fb; color: #15152b;
                     padding: 14px 28px; border-radius: 12px;">
          {code}
        </span>
      </p>
      <p style="color: #98a2b3; font-size: 12px;">
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    """


async def send_email(to: str, subject: str, html: str) -> None:
    message = EmailMessage()
    message["From"] = EMAIL_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content("Please view this email in an HTML client.")
    message.add_alternative(html, subtype="html")

    if not SMTP_HOST:
        # Dev mode: no SMTP configured — dump the email content to the logs
        body = message.get_body(preferencelist=("html", "plain")) or message
        logger.warning(
            "SMTP_HOST not configured — email not sent. To: %s | Subject: %s | Body: %s",
            to,
            subject,
            body.get_content(),
        )
        return

    try:
        await to_thread.run_sync(_send_smtp, message)
    except Exception as exc:
        # Log the real cause (blocked port, bad credentials, timeout...) for the server logs
        logger.exception("SMTP delivery to %s failed via %s:%s", to, SMTP_HOST, SMTP_PORT)
        raise EmailDeliveryError(str(exc)) from exc


def _send_smtp(message: EmailMessage) -> None:
    # Runs in a worker thread: stdlib smtplib is blocking
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        if SMTP_USERNAME and SMTP_PASSWORD:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)


async def send_verification_email(to: str, name: str, user_type: str, token: str) -> None:
    verify_link = f"{FRONTEND_URL}/verify?token={token}"
    await send_email(
        to,
        "Verify your Job Portal account",
        build_verification_email(name, user_type, verify_link),
    )


async def send_password_reset_email(to: str, name: str, code: str, expire_minutes: int) -> None:
    await send_email(
        to,
        "Your UniHire password reset code",
        build_password_reset_email(name, code, expire_minutes),
    )


_BDT = timezone(timedelta(hours=6))


def _fmt_time(dt: datetime) -> str:
    local = dt.astimezone(_BDT)
    return local.strftime("%A, %d %B %Y, %I:%M %p") + " (BST, UTC+6)"


def build_exam_email(
    name: str,
    company: str,
    title: str,
    description: str | None,
    start: datetime,
    end: datetime,
    duration_minutes: int,
    question_count: int,
    link: str,
    updated: bool = False,
) -> str:
    desc = f'<p style="color:#667085;font-size:14px;line-height:1.6;">{escape(description)}</p>' if description else ""
    return f"""
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
      <h2 style="color: #0d1526; margin: 0 0 8px;">{escape(title)}</h2>
      <p style="color: #667085; font-size: 15px; line-height: 1.6;">
        Hi {escape(name)},<br/><br/>
        <strong>{escape(company)}</strong> has {"updated the details of a" if updated else "scheduled a"} screening test for your cohort.{" Please note the new details below." if updated else ""}
      </p>
      {desc}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;color:#15152b;">
        <tr><td style="padding:6px 0;color:#667085;">Starts</td><td style="padding:6px 0;"><strong>{_fmt_time(start)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#667085;">Closes</td><td style="padding:6px 0;"><strong>{_fmt_time(end)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#667085;">Duration</td><td style="padding:6px 0;"><strong>{duration_minutes} minutes</strong></td></tr>
        <tr><td style="padding:6px 0;color:#667085;">Questions</td><td style="padding:6px 0;"><strong>{question_count}</strong></td></tr>
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{link}"
           style="background-color: #6d4fe0; color: #ffffff; text-decoration: none;
                  font-weight: bold; font-size: 15px; padding: 12px 28px; border-radius: 10px;
                  display: inline-block;">
          Open the exam
        </a>
      </p>
      <p style="color: #15152b; font-size: 13px; font-weight: bold; margin-bottom: 4px;">Exam rules</p>
      <ul style="color: #667085; font-size: 13px; line-height: 1.7; padding-left: 18px; margin-top: 0;">
        <li>You must take the test between the start and close times above. The link stops working once the exam closes.</li>
        <li>Your camera and microphone must be on for the whole exam. Your browser will ask for permission.</li>
        <li>The recruiter can watch and hear you live while you sit the exam. UniHire does not record it.</li>
        <li>Do not switch tabs or windows. Every switch is recorded, and repeated switching ends your exam.</li>
        <li>Only one monitor is allowed. Disconnect extra displays before you start.</li>
        <li>Use a recent Chrome or Edge on a laptop or desktop.</li>
      </ul>
      <p style="color: #98a2b3; font-size: 12px;">If the button doesn't work, paste this URL into your browser:<br/>
        <a href="{link}" style="color: #6d4fe0; word-break: break-all;">{link}</a></p>
    </div>
    """


async def send_exam_email(
    to: str,
    name: str,
    company: str,
    title: str,
    description: str | None,
    start: datetime,
    end: datetime,
    duration_minutes: int,
    question_count: int,
    test_id: str,
    updated: bool = False,
) -> None:
    link = f"{FRONTEND_URL}/tests/{test_id}"
    await send_email(
        to,
        f"{'Exam updated' if updated else 'Exam scheduled'}: {title}",
        build_exam_email(
            name, company, title, description, start, end, duration_minutes, question_count, link, updated
        ),
    )
