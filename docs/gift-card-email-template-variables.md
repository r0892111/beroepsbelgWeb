# Gift Card Email Template Variables

This document describes the variables used in the gift card email templates.

## Template Variables

The email templates use the following variables that should be replaced when sending:

### Required Variables

- `{{recipientName}}` - Name of the person receiving the gift card
- `{{purchaserName}}` - Name of the person who purchased the gift card
- `{{giftCardCode}}` - The unique gift card code (format: XXXX-XXXX-XXXX-XXXX)
- `{{amount}}` - The gift card amount in euros (e.g., "25.00" or "100")
- `{{locale}}` - The locale code (nl, en, fr, de)

### Optional Variables

- `{{personalMessage}}` - Personal message from the purchaser (if provided)
- `{{expiresAt}}` - Expiration date of the gift card (formatted date string)
- `{{currentYear}}` - Current year (e.g., "2026")

## Example Usage

### N8N Webhook Payload

When the Stripe webhook calls the N8N gift card webhook, it sends:

```json
{
  "giftCardCode": "ABCD-1234-EFGH-5678",
  "amount": 50,
  "currency": "EUR",
  "recipientEmail": "recipient@example.com",
  "recipientName": "John Doe",
  "purchaserEmail": "purchaser@example.com",
  "purchaserName": "Jane Smith",
  "personalMessage": "",
  "orderId": "12345",
  "checkoutSessionId": "cs_live_..."
}
```

### Template Replacement Example

For a Dutch email:
- Replace `{{locale}}` with `nl`
- Replace `{{recipientName}}` with the recipient's name
- Replace `{{giftCardCode}}` with the actual code
- Replace `{{amount}}` with the amount (e.g., "50")
- Replace `{{currentYear}}` with "2026"

## Multi-language Support

The templates are provided in:
- **Dutch (NL)**: `gift-card-email-template.html`
- **English (EN)**: `gift-card-email-template-en.html`

For French and German, you can create similar templates by translating the content.

## Integration with N8N

In your N8N workflow:

1. Receive webhook payload from Stripe webhook
2. Extract variables from the payload
3. Load the appropriate template based on `locale` or `recipientEmail`
4. Replace all template variables
5. Send email using your email service (SendGrid, Mailgun, etc.)

## Email Service Integration

The templates are designed to work with:
- **SendGrid**
- **Mailgun**
- **Amazon SES**
- **Postmark**
- **Any HTML email service**

Make sure to:
- Set the `Content-Type` header to `text/html`
- Use inline CSS (already included in templates)
- Test email rendering across different email clients
