/**
 * Utility functions for sending webhook notifications to n8n
 */

const WEBHOOKS = {
  CONTACT_FORM: 'https://alexfinit.app.n8n.cloud/webhook/617bcaab-3a6c-4a7b-a1dd-cf362459e846',
  NEWSLETTER: 'https://alexfinit.app.n8n.cloud/webhook/88179477-d18b-4bb3-a692-8c4b05ed5259',
  JOB_APPLICATION: 'https://alexfinit.app.n8n.cloud/webhook/77fde435-f8f1-4044-88d0-86c29fc449fa',
} as const;

/**
 * Send a webhook notification (fire-and-forget, non-blocking)
 */
export async function sendWebhook(url: string, data: Record<string, any>): Promise<void> {
  try {
    // Fire and forget - don't await, don't block
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }).catch((error) => {
      // Silently log errors but don't throw
      console.error('Webhook error (non-blocking):', error);
    });
  } catch (error) {
    // Silently log errors but don't throw
    console.error('Webhook error (non-blocking):', error);
  }
}

/**
 * Send contact form submission to webhook
 */
export function sendContactFormWebhook(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
  consent: boolean;
}): void {
  sendWebhook(WEBHOOKS.CONTACT_FORM, {
    type: 'contact_form',
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Send newsletter subscription to webhook
 */
export function sendNewsletterWebhook(data: {
  email: string;
  first_name?: string;
  last_name?: string;
  consent_given: boolean;
}): void {
  sendWebhook(WEBHOOKS.NEWSLETTER, {
    type: 'newsletter_subscription',
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Send job application to webhook
 */
export function sendJobApplicationWebhook(data: {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  motivation: string;
  cv_url?: string;
  photo_url?: string;
  consent: boolean;
}): void {
  sendWebhook(WEBHOOKS.JOB_APPLICATION, {
    type: 'job_application',
    timestamp: new Date().toISOString(),
    ...data,
  });
}

