# Wellora Deployment Guide

This guide outlines the steps required to deploy the Wellora platform to a production environment (e.g., Vercel, AWS, or Railway).

## 1. Environment Variables

Ensure the following variables are set in your production environment:

### Database
- `DATABASE_URL`: Production PostgreSQL connection string.

### Better Auth
- `BETTER_AUTH_SECRET`: A random 32-character string.
- `BETTER_AUTH_URL`: The base URL of your production app (e.g., `https://wellora.com`).

### Stripe
- `STRIPE_SECRET_KEY`: Your Stripe secret key (`sk_live_...`).
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret (`whsec_...`).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (`pk_live_...`).

### OpenAI
- `OPENAI_API_KEY`: Your OpenAI API key for the Chat Assistant.

### Application
- `NEXT_PUBLIC_APP_URL`: The base URL of your production app (e.g., `https://wellora.com`).

## 2. Database Setup

1.  **Migrations:** Run the following command to push your schema to the production database:
    ```bash
    npx prisma db push
    ```
2.  **Seeding:** Seed the initial plans and trust content:
    ```bash
    npm run prisma:seed
    ```

## 3. Stripe Production Setup

1.  **Products & Prices:** Create your products (Semaglutide, Tirzepatide) in the Stripe Dashboard.
2.  **Price IDs:** Update the `stripePriceId` values in `lib/plans.ts` to match your live Stripe Price IDs.
3.  **Webhooks:** 
    - Go to Stripe Dashboard -> Developers -> Webhooks.
    - Add an endpoint: `https://your-domain.com/api/webhooks/stripe`.
    - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`.
    - Copy the Webhook Secret and add it to your environment variables.

## 4. Admin Access

To access the `/admin` dashboard in production:
1.  Sign up as a normal user.
2.  Manually update your user's role to `admin` in the database:
    ```sql
    UPDATE "user" SET role = 'admin' WHERE email = 'your-email@example.com';
    ```

## 5. HIPAA Compliance Note

- **Encryption:** Ensure your PostgreSQL provider (e.g., Neon, Supabase, RDS) has encryption at rest enabled.
- **Audit Logs:** The application is already configured to log PHI access to the `AuditLog` table.
- **BAA:** Ensure you have a Business Associate Agreement (BAA) with your hosting and database providers.

## 6. Build & Deploy

Run the final build to verify:
```bash
npm run build
```
Once verified, push your code to your deployment provider.
