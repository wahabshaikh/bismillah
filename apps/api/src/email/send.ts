/** A rendered email, ready to hand to the queue. The sender comes from `EMAIL_FROM`. */
export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends through Cloudflare Email Service, or logs the email when `EMAIL_FROM` is empty
 * (local development, or a deploy without a sending domain yet), so links in it can
 * still be followed from the terminal.
 *
 * Call this from a job (`enqueue(env, { type: "email.send", email })`), not a request:
 * the queue retries failed sends and keeps them off the request's latency.
 */
export async function sendEmail(env: Env, email: Email): Promise<void> {
  const from: string = env.EMAIL_FROM;
  if (!from) {
    console.log("email not sent (EMAIL_FROM is not set)", {
      to: email.to,
      subject: email.subject,
      text: email.text,
    });
    return;
  }
  await env.EMAIL.send({
    from: { email: from, name: env.APP_NAME },
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
}
