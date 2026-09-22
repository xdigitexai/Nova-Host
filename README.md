# Nova Host

Nova Host is a full-stack bot-hosting storefront and control centre. It provides customer authentication, country-aware billing, verified wallet deposits, hosting subscriptions, catalogue and custom bot deployments, real deployment progress, lifecycle controls, and an administrator view.

## Local setup

1. Copy `.env.example` to `.env` and configure PostgreSQL plus a strong `AUTH_SECRET`.
2. Run `npm install`, `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
3. Start with `npm run dev`.

Ghana is routed exclusively to Paystack. Other seeded countries use Xdigitex Pay. Payment and deployment credentials remain on the server. Wallet funds are credited only after signed webhook receipt and a provider-side verification, with an idempotent ledger reference.

## Production

Run migrations before starting the app. Configure the public callback URL and register the two webhook endpoints with the providers:

- `/api/webhooks/paystack`
- `/api/webhooks/xdigitex`

Use `npm run build` followed by `npm start`. The deployment environment must supply every secret listed in `.env.example`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
