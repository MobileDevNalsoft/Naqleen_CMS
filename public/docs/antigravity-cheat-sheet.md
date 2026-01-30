Perfect — below is the **complete content in ONE single Markdown file**, cleanly structured and ready to drop straight into your workspace.

Just copy **everything inside the code block** and save it as:

```
antigravity-cheat-sheet.md
```

---

```markdown
# 🚀 Antigravity IDE – End-to-End Workflow  
## Recommended Models & Prompt Templates

This document serves as a **quick-reference cheat sheet** for power users in **Antigravity IDE**.  
It maps each major stage of the development lifecycle to:

- **Task** – The specific goal of that stage
- **Recommended Model** – The AI model best suited for the task
- **Best Prompting Template** – Copy-paste-ready, production-grade prompts

Use this file as a living reference throughout your project lifecycle.

---

## 🔧 Global Usage Rules (Mandatory)

- Always use **Planning mode** (avoid Fast mode except for trivial fixes)
- Explicitly select the **recommended model** in the agent dropdown
- Add the following constraints to **every production prompt**:

```

* Output clean, production-ready code
* Enforce TypeScript strict typing (React)
* Enforce null-safety (Flutter)
* Follow secure PL/SQL practices
* Include unit and integration tests where applicable
* Think step-by-step before acting
* Verify assumptions
* Challenge poor decisions and suggest better abstractions

```

---

## 1️⃣ Requirement Analysis

**Task**  
Break down business requirements into prioritized user stories, edge cases, non-functional requirements, and initial technology decisions.

**Recommended Model**  
**Gemini 3 Pro (high)** – Best for long-context understanding and multimodal inputs (documents, screenshots, diagrams).

**Prompt Template**
```

You are a senior product architect with 15+ years of experience building
enterprise-grade React, Flutter, and Oracle systems.

Analyze the following requirements in detail:

[paste full requirements, Figma links, email threads, screenshots here]

Output in this exact structure:

1. Prioritized User Stories

   * Use MoSCoW method: Must-have, Should-have, Could-have, Won’t-have
2. Key Edge Cases & Error Scenarios
3. Non-Functional Requirements

   * Scalability targets
   * Performance SLAs
   * Security posture
   * Accessibility (WCAG 2.2 AA)
   * Offline support
   * Internationalization (i18n)
4. Initial Technology Decisions & Trade-offs

   * Frontend: React patterns (hooks, context vs Redux/Zustand, folder structure)
   * Mobile: Flutter state management (Riverpod / BLoC / Provider)
   * Backend: Oracle schema style, PL-SQL vs pure SQL
   * API style: REST vs GraphQL
   * Cross-cutting concerns: Auth (JWT/OAuth), caching, logging, monitoring

Be brutally honest about feasibility, complexity, risks, and missing information.
Ask clarifying questions if anything is ambiguous.

```

---

## 2️⃣ UI / UX Planning

**Task**  
Design responsive, accessible UI with flows, wireframes, and mockups.

**Recommended Model**  
**Gemini 3 Pro (high)** + Image generation enabled

**Prompt Template**
```

You are a senior UI/UX designer specializing in enterprise React web
and Flutter mobile applications.

Design a complete UI/UX solution for the following feature:

[describe feature clearly and in detail]

Output structure:

1. User Flow Diagram (ASCII or Mermaid)
2. Component Breakdown

   * Screens
   * Reusable components
   * Navigation structure
3. Responsive Breakpoints & Layout Strategy
4. Accessibility Checklist

   * Keyboard navigation
   * ARIA roles
   * Color contrast
   * Screen reader support
5. Dark Mode & Theme Strategy
6. Wireframe Descriptions (text-based)
7. Generate mockup images for key screens (desktop + mobile)

Ensure consistency with Material Design (Flutter) and modern React UX patterns.

```

---

## 3️⃣ Frontend Architecture (React)

**Task**  
Define scalable React architecture, state management, routing, and API integration.

**Recommended Model**  
**Gemini 3 Pro (high)**

**Prompt Template**
```

You are a principal React architect designing scalable enterprise applications.

Architect the frontend structure for this React application:

[paste requirements summary or user stories]

Output:

* Recommended folder structure (feature-based or domain-driven)
* State management choice with justification
  (Zustand / Redux Toolkit / Context + hooks)
* Component design patterns
  (atomic design, compound components, custom hooks)
* Routing strategy (React Router v6+, protected routes)
* API integration layer
  (Axios or Fetch + TanStack Query)
* Error handling and global loading strategy
* TypeScript strict mode configuration
* Performance and bundle-size optimization strategies

Include example folder trees and key file snippets.

```

---

## 4️⃣ Mobile Architecture (Flutter)

**Task**  
Design Flutter app architecture mirroring React web behavior.

**Recommended Model**  
**Claude Sonnet 4.5**

**Prompt Template**
```

You are a lead Flutter architect ensuring parity with a React web application.

Design the Flutter architecture based on the following inputs:

[paste React architecture summary or shared requirements]

Output:

* Folder structure (lib/features, core, shared)
* State management choice with justification
  (Riverpod 2.x / BLoC / Provider)
* Navigation approach
  (GoRouter or Navigator 2.0 with deep linking)
* Shared business logic
  (entities, repositories, use cases)
* Theming and responsive layout strategy
  (Material 3, adaptive widgets)
* Offline support and caching
  (Hive / Drift / shared_preferences)
* Platform channels if native integration is required

Ensure null safety, testability, and Flutter best practices.
Provide example file structures and code snippets.

```

---

## 5️⃣ Database & PL/SQL Design

**Task**  
Design Oracle schema, indexing, PL/SQL APIs, and security.

**Recommended Model**  
**Claude Opus 4.5 (thinking)**

**Prompt Template**
```

You are a senior Oracle DBA and PL/SQL architect specializing in
high-concurrency enterprise systems.

Design the Oracle database and PL/SQL layer for the following domain:

[paste domain model, entities, relationships, performance constraints]

Output:

* Entity-Relationship Diagram (text or Mermaid)
* Table definitions with constraints
* Index strategy
  (B-tree, bitmap, function-based, partitioning if required)
* PL/SQL packages, procedures, and functions

  * API signatures
  * Exception handling
* Security

  * Bind variables
  * Row-level security
  * Fine-grained access control
* Performance strategies

  * Bulk operations
  * Materialized views
  * Statistics and execution plans

Include sample data scripts and explain design trade-offs.

```

---

## 6️⃣ API Contracts

**Task**  
Define REST or GraphQL APIs with strong contracts.

**Recommended Model**  
**Gemini 3 Pro (high)**

**Prompt Template**
```

You are an API design expert following modern REST and GraphQL best practices.

Define API contracts between React/Flutter clients and an Oracle backend.

Inputs:

[paste requirements and database summary]

Output:

* API style decision (REST or GraphQL) with reasoning
* Endpoints or schema definition
* Full OpenAPI 3.1 specification (YAML)
* Request and response examples
* Error handling strategy
* Pagination, filtering, and sorting
* Authentication and authorization headers
* Versioning and backward compatibility plan

Ensure idempotency and consistency across endpoints.

```

---

## 7️⃣ Performance Optimization

**Task**  
Identify and fix performance bottlenecks across stack.

**Recommended Model**  
**Claude Sonnet 4.5**

**Prompt Template**
```

You are a performance engineer specializing in
React, Flutter, and Oracle systems.

Audit and optimize the following:

[paste code, profiler output, slow query logs]

Output:

* Identified bottlenecks

  * React re-renders
  * Flutter rebuild costs
  * SQL execution plans
* Concrete fixes with examples
* Before vs after comparison
* Monitoring recommendations
  (Lighthouse, Flutter DevTools, Oracle AWR)

Prioritize high-impact, low-effort improvements first.

```

---

## 8️⃣ Debugging & Refactoring

**Task**  
Find root causes, refactor safely, and improve test coverage.

**Recommended Model**  
**Claude Opus 4.5**

**Prompt Template**
```

You are a master debugger and refactoring expert.

Debug and refactor the following issue:

[paste code, error message, stack trace, reproduction steps]

Output:

1. Root cause analysis (step-by-step)
2. Fixed and refactored code (use diff format if possible)
3. Added unit and integration tests

   * Jest (React)
   * flutter_test (Flutter)
4. Edge cases addressed
5. Alternative approaches considered

Focus on clarity, maintainability, and robustness.

```

---

## 9️⃣ Code Reviews

**Task**  
Perform senior-level architectural code review.

**Recommended Model**  
**Claude Sonnet 4.5**

**Prompt Template**
```

Act as a senior architect performing a formal code review.

Review the following code or pull request:

[paste code or link]

Evaluate:

* Security vulnerabilities
* Performance and scalability
* Maintainability and readability
* Framework best practices
* Test coverage
* Error handling and logging

Output sections:

* High Priority Issues
* Medium Priority Issues
* Low Priority Suggestions
* Praise and strengths

Be direct, constructive, and evidence-based.

```

---

## 🔐 1️⃣0️⃣ Security & Edge Case Hardening

**Task**  
Audit for vulnerabilities and extreme edge cases.

**Recommended Model**  
**Gemini 3 Pro (high)**

**Prompt Template**
```

You are a security consultant specializing in
web, mobile, and enterprise backend systems.

Perform a security and edge-case audit on:

[paste code, API contracts, UI flows]

Check for:

* SQL injection, XSS, command injection
* Authentication and authorization flaws
* Data exposure risks
* Flutter secure storage practices
* Oracle row-level security and audit trails
* Rate limiting, CSRF, CORS
* Edge cases (nulls, large payloads, concurrency)

Output:

* Prioritized findings
* Remediation steps
* Code-level fixes where applicable

```

---

## 📌 Usage Tip

You can reference this file directly in your prompts, for example:

> “Follow **antigravity-cheat-sheet.md – Section 3 (Frontend Architecture)** and apply it to my project.”

Perfect addition 👍 — this is a **very practical, real-world task** and fits nicely between **UI/UX Planning** and **Architecture**.

Below is a **ready-to-paste Markdown section** you can **drop directly into the same file** (recommended as **Section 2.5 or 3 depending on your flow**).
I’ll number it **2️⃣.5️⃣ Reference-Based Redesign & Feature Replication** so it doesn’t break your existing numbering.

---

```markdown
## 2️⃣.5️⃣ Reference-Based Redesign & Feature Replication

**Task**  
Use an existing **reference website or mobile app** (live URL, GitHub repo, screenshots, or app store link) to:
- Replicate **specific features**
- Redesign selected UI/UX patterns
- Improve interaction, performance, or usability
- Integrate those improvements into the **current application** (without cloning blindly)

This task focuses on **learning from proven products** while applying **original implementation and better abstractions**.

---

**Recommended Model**  
**Gemini 3 Pro (high)** – Best for:
- Understanding external references (URLs, screenshots, videos)
- UI/UX comparison
- Feature gap analysis  
(Optional: enable image analysis if screenshots are provided)

---

**Best Prompting Template**
```

You are a senior product engineer and UI/UX architect.

I will provide a reference application (website or mobile app) and my current application.
Your goal is NOT to clone, but to analyze, extract patterns, and improve my app.

Reference:

* Website / App name:
* URL / App Store link / GitHub repo:
* Screenshots or screen recordings (if available):

My Current Application:

* Tech stack (React / Flutter / Backend):
* Current features:
* Screenshots or repo link:

Tasks to perform:

1. Reference Analysis

   * Core features worth replicating
   * UX/UI patterns that improve usability
   * Performance or interaction highlights
   * What problems the reference app solves well

2. Feature Mapping

   * Map reference features → my current app features
   * Identify:

     * Can reuse as-is
     * Needs redesign
     * Should NOT be copied (with reasons)

3. Redesign Proposal

   * Improved UI/UX adapted to my app
   * Wireframe-level descriptions
   * Component-level breakdown (React / Flutter)
   * Accessibility and responsiveness considerations

4. Implementation Plan

   * Step-by-step feature integration plan
   * Required backend/API changes (if any)
   * State management and data flow changes
   * Migration strategy (non-breaking)

5. Code-Level Guidance

   * Suggested folder structure updates
   * Component/widget responsibilities
   * Example code snippets (production-ready)
   * Reusable abstractions

6. Risks & Improvements

   * Legal / UX / performance risks
   * Better alternatives than the reference
   * Opportunities to outperform the reference app

Constraints:

* Do NOT blindly copy UI or logic
* Respect best practices and originality
* Optimize for maintainability and scalability
* Match my existing design system and architecture

```

---

**When to Use This Task**
- Redesigning dashboards inspired by tools like Notion, Linear, Stripe, Zoho, etc.
- Improving onboarding, forms, tables, or navigation
- Migrating from a basic UI to a **premium, product-grade experience**
- Reverse-engineering UX patterns from top SaaS or mobile apps

---

**Example Usage**
> “Follow **Antigravity_Workflow_Cheat_Sheet.md – Section 2.5**  
> Reference app: Stripe Dashboard  
> Redesign and integrate the filtering, tables, and empty states into my React + Flutter app.”
```


Nice, that’s an important one 👌
Here’s a **clean, drop-in Markdown section** for **UI Corrections** that fits perfectly into your cheat sheet. You can place it after UI/UX Planning or after Reference-Based Redesign.

I’ll number it **2️⃣.6️⃣ UI Corrections & Visual Refinement** so it stays consistent.

---

```markdown
## 2️⃣.6️⃣ UI Corrections & Visual Refinement

**Task**  
Review existing UI screens and apply **precise UI corrections** to improve:
- Visual consistency
- Spacing, alignment, and layout
- Typography hierarchy
- Color usage and contrast
- Responsiveness across screen sizes
- Accessibility and usability

This task is **not a redesign from scratch**.  
It focuses on **fixing what feels “off”** in an otherwise working UI.

---

**Recommended Model**  
**Gemini 3 Pro (high)** – Best for:
- Visual analysis using screenshots
- Spotting UI/UX inconsistencies
- Accessibility and design-system enforcement

---

**Best Prompting Template**
```

You are a senior UI/UX auditor and frontend engineer.

I will provide screenshots, Figma frames, or live URLs of my current UI.
Your goal is to identify and fix visual and usability issues
without changing core functionality.

Inputs:

* Screenshots / screen recordings / Figma links:
* Platform: React Web / Flutter Mobile
* Design system (if any): Material / Custom / Tailwind / MUI
* Known pain points (optional):

Tasks:

1. UI Issue Identification

   * Spacing and alignment inconsistencies
   * Typography issues (font size, weight, line height)
   * Color and contrast problems
   * Component inconsistency across screens
   * Responsiveness issues (overflow, clipping, scaling)
   * Accessibility violations (WCAG 2.2 AA)

2. Correction Recommendations

   * Specific fixes with clear reasoning
   * Before vs After explanation
   * Design-system-aligned improvements
   * Platform-specific considerations (Web vs Mobile)

3. Component-Level Fixes

   * Which components need adjustment
   * Reusable spacing / typography tokens
   * Layout fixes (Flex/Grid for React, Row/Column for Flutter)

4. Code-Level Changes

   * Exact CSS / Tailwind / MUI fixes (React)
   * Widget tree refinements (Flutter)
   * Theme-level improvements
   * Example corrected code snippets

5. Responsiveness & Accessibility Validation

   * Breakpoint behavior
   * Keyboard navigation
   * Screen reader compatibility
   * Touch target sizing (mobile)

Constraints:

* Do NOT redesign the entire UI
* Keep existing layout structure unless necessary
* Follow my current design system
* Optimize for clarity, consistency, and polish

```

---

**When to Use This Task**
- UI looks “almost right” but not professional
- Inconsistent spacing or typography across screens
- Mobile layouts feel cramped or broken
- Accessibility or contrast issues
- Preparing UI for **production or client review**

---

**Example Usage**
> “Follow **antigravity-cheat-sheet.md – Section 2.6**  
> Analyze these dashboard screens and correct spacing, typography, and responsiveness issues for my React app.”
```

