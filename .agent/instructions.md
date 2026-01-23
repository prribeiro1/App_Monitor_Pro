# Project Context: Inner Aphelion / Monitor Pro

This project is a school transport management platform. It includes features for route management, attendance, student tracking, and financial management with automated billing via Asaas.

## Technology Stack
- **Frontend**: React, Vite, Tailwind CSS (Vanilla CSS in some parts), TypeScript.
- **Mobile**: Capacitor (targeting Android/iOS).
- **Backend/Database**: Supabase (Postgres, Auth, Edge Functions).
- **Payments**: Asaas API (Sub-accounts, Split Payments, Webhooks).

## Core Principles
1.  **Safety First**: Ensure data privacy and secure API communication.
2.  **User Experience**: The app is used by drivers/monitors in the field. UI must be clean, responsive, and easy to use.
3.  **Revenue Model**: 1% split to the platform on all transactions processed via Asaas.
4.  **Backend Logic**: Business logic for payments/sensitive operations MUST stay in Supabase Edge Functions.

## Coordination Rules
- **Language**: Use English for code (variables, functions, filenames) and internal documentation. Use Portuguese for user-facing strings and communication with the user.
- **Components**: reuse components from the `components/` directory.
- **Styles**: Follow the existing design system established in `index.css`.
- **Modifications**: When modifying existing code, maintain the coding style and structure.
