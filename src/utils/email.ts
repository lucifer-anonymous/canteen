import nodemailer from 'nodemailer';
import logger from '@/utils/logger';
import config from '@/config/config';

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  try {
    if (!config.smtp.host || !config.smtp.user || !config.smtp.pass || !config.smtp.port) {
      // Dev fallback: log to console if SMTP is not configured
      logger.warn(`SMTP not configured. Simulating email to ${to}. Subject: ${subject}`);
      logger.info(`MAIL TEXT: ${text || ''}`);
      logger.info(`MAIL HTML: ${html}`);
      return { simulated: true } as const;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465, // true for 465, false for other ports
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });

    const info = await transporter.sendMail({ from: config.smtp.from, to, subject, html, text });
    logger.info(`Email sent: ${info.messageId} to ${to}`);
    return { messageId: info.messageId } as const;
  } catch (err) {
    logger.error(`Email send error: ${(err as Error).message}`);
    throw err;
  }
}
