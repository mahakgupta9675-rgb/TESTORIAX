# Testoriax 🚀
> **Next-Generation AI-Proctored Online Assessment & Code Execution Platform**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

# 🚀 TESTORIAX — AI-Powered Test & Assessment Platform

> **Create. Compete. Analyze. Improve.**

TESTORIAX is a full-stack online test and assessment platform designed to simplify assessment creation, question generation, and online testing. It brings AI-assisted test creation, manual assessment building, practice tests, and competition-oriented challenges into a unified platform.

The project combines modern web technologies, relational database integration, and generative AI to explore a more flexible and accessible approach to online assessments.

**Project Status:** Active Development & Testing

---

## 🎯 Vision

TESTORIAX aims to provide a unified platform where students, educators, and individuals can create assessments, practice different skills, participate in challenges, and evaluate their knowledge.

The platform focuses on:

- 📝 Simplifying test creation and management.
- 🤖 Using AI to assist with question generation.
- 🧠 Supporting different assessment categories.
- 🌐 Making tests accessible through publishing and sharing workflows.
- 🏆 Enabling practice-oriented and competitive assessments.
- 📊 Building a foundation for performance analysis.
- 🔐 Applying secure development practices.
- 🚀 Creating an extensible architecture for future assessment features.

---

## 💡 Problem Statement

Traditional assessment workflows can involve time-consuming question preparation, disconnected testing tools, and limited flexibility when creating different types of assessments.

TESTORIAX addresses these challenges by bringing test creation, AI-assisted question generation, publishing, and participation into one platform.

### Proposed Solution

- A centralized test creation and assessment platform.
- AI-assisted question generation through an integrated AI service.
- A manual builder for customized assessments.
- Separate workflows for public practice and competition challenges.
- A foundation for assessment evaluation and performance tracking.
- An architecture that can be extended with coding execution and advanced analytics.

---

# ✨ Key Features

## 🤖 1. AI-Powered Question Generation

TESTORIAX integrates Google Gemini to support AI-assisted question generation.

The backend provides an API endpoint for AI-generation requests, allowing the application to integrate generative AI into the assessment creation process.

Key goals include:

- Reducing manual question preparation.
- Generating assessment content through an AI service.
- Integrating generated content into test creation.
- Supporting future improvements in question customization and validation.

## 📝 2. Manual Test Builder

The manual builder is designed to give users control over the assessments they create.

It complements AI-assisted generation by supporting customized question creation and assessment configuration.

## 🌐 3. Public Practice Tests

The platform supports a practice-oriented assessment concept for users who want to test their knowledge and strengthen their understanding.

Potential applications include academic revision, aptitude preparation, and technical knowledge assessment.

## 🏆 4. Competition Challenges

TESTORIAX includes a competition-oriented publishing concept for assessments intended to challenge participants.

The goal is to provide a foundation for challenge creation, participation, and result evaluation.

## 📚 5. Multiple Assessment Categories

The platform is designed to accommodate assessment types such as:

| Category | Purpose |
|---|---|
| Multiple-choice questions | Test conceptual understanding |
| Fill-in-the-blank | Evaluate recall |
| Aptitude | Assess quantitative and logical reasoning |
| Subject-based assessments | Evaluate domain knowledge |
| Coding assessments | Extend the platform toward programming evaluation |

The availability and evaluation behavior of individual question types depend on the current implementation.

## 📊 6. Assessment Results and Analysis

Assessment evaluation is an important part of the platform's direction.

The project provides a foundation for reviewing assessment outcomes and can be extended with detailed analytics, topic-wise accuracy, and performance comparisons.

## 🧩 7. Modular Application Design

The project combines a component-based frontend, backend APIs, database services, and AI integration. This separation helps organize application responsibilities and provides a foundation for future development.

---

# 🛠️ Technology Stack

### 🎨 Frontend

- **React** — Component-based user interface.
- **Tailwind CSS** — Styling and responsive layouts.
- **React Router** — Client-side navigation.
- **Framer Motion** — Animations and transitions.

### ⚙️ Backend

- **Node.js** — JavaScript runtime.
- **Express.js** — Backend API framework.
- **REST APIs** — Communication between application components.

### 🗄️ Database and Authentication

- **PostgreSQL** — Relational database.
- **Supabase** — Database and authentication services where configured.
- **JWT** — Token-based authentication support where implemented.

### 🧠 AI Integration

- **Google Gemini API** — Generative AI integration for question generation.
- **Server-side API endpoint** — Backend integration for AI-generation requests.

### 🧪 Development and Version Control

- **Git** — Version control.
- **GitHub** — Repository hosting and source-code management.

---

# 🏗️ High-Level System Architecture

TESTORIAX follows a frontend-backend architecture that connects the user interface with application APIs, data services, and AI functionality.

```text
                  ┌──────────────────────┐
                  │        Users         │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │    React Frontend    │
                  │ Tailwind / Router    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │    Express Backend   │
                  │      REST APIs       │
                  └──────────┬───────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
       ┌──────────────────┐    ┌──────────────────┐
       │ PostgreSQL /     │    │   Gemini API     │
       │ Supabase Services│    │ AI Generation    │
       └──────────────────┘    └──────────────────┘
```

### Architecture Components

**Frontend Layer:** Provides the interface for assessment creation, navigation, and user interactions.

**Backend Layer:** Handles application API requests and provides the server-side integration layer.

**Database Layer:** Supports persistent application data through the configured relational database services.

**AI Layer:** Connects the application to Gemini through a backend endpoint for AI-assisted question generation.

**Authentication Layer:** Integrates configured authentication and access-control mechanisms.

---

# 🔄 Assessment Workflow

The platform is organized around the following assessment lifecycle:

```text
          Create Assessment
                 |
          ┌──────┴──────┐
          ▼             ▼
     AI Generation   Manual Builder
          |             |
          └──────┬──────┘
                 ▼
        Configure Assessment
                 |
                 ▼
        Publish Assessment
                 |
          ┌──────┴──────┐
          ▼             ▼
        Practice    Competition
          |             |
          └──────┬──────┘
                 ▼
          Attempt the Test
                 |
                 ▼
          Evaluate Results
```

This diagram represents the intended assessment workflow; individual steps depend on the functionality available in the current build.

---

# 📁 Major Platform Modules

```text
TESTORIAX
│
├── AI Question Generation
├── Manual Test Builder
├── Assessment Configuration
├── Question Management
├── Public Practice Tests
├── Competition Challenges
├── Assessment Interface
├── Result Evaluation
├── Authentication
└── Future Analytics and Administration
```

The module structure describes the platform's functional organization and development direction rather than a claim that every module is complete.

---

# 🔐 Security Engineering

Security is an important part of TESTORIAX's development process.

### Security Areas

- Environment-variable and secret-management practices.
- Git ignore rules for sensitive environment files.
- Git history review for accidentally committed credentials.
- Server-side handling of AI API requests.
- Authentication and authorization review.
- Database access-policy review.
- API endpoint validation and access control.
- Continued security testing and remediation.

### Repository Security

The development workflow includes checks for sensitive files and repository history before publishing code to GitHub.

Security reviews should be treated as an ongoing process. Production readiness requires validating actual endpoint behavior, database policies, authentication flows, and deployment configuration.

---

# 🧠 AI Integration

The Gemini integration adds generative AI capabilities to the assessment creation workflow.

### Request Flow

```text
User Requests Question Generation
               |
               ▼
       Frontend API Request
               |
               ▼
       Backend AI Endpoint
               |
               ▼
          Gemini API
               |
               ▼
       Generated Response
               |
               ▼
     Application Processing
```

The backend AI-generation endpoint is implemented in the project. The complete behavior, response validation, error handling, and supported generation options should be evaluated against the current source code.

---

# 🧩 Technical Challenges and Engineering Focus

The project provides opportunities to address practical full-stack engineering challenges.

| Engineering Area | Technical Focus |
|---|---|
| Frontend-backend integration | Reliable API communication |
| AI integration | Managing external AI requests and responses |
| Database design | Organizing assessment-related data |
| Authentication | Protecting user-specific operations |
| Authorization | Enforcing access rules |
| Repository security | Preventing accidental exposure of secrets |
| Feature development | Maintaining modular, extensible application code |
| Testing | Validating application workflows and integrations |

These areas are useful discussion topics during technical interviews. Specific solutions and results should be explained using the corresponding implementation in the repository.

---

# 🗺️ Development Roadmap

### 🚧 Current Development Focus

- Refining test creation and assessment workflows.
- Improving AI-generation reliability.
- Reviewing database structure and access policies.
- Strengthening authentication and authorization.
- Improving error handling and API validation.
- Testing frontend-backend integration.
- Continuing repository and application security reviews.

### 🔮 Future Enhancements

- Secure coding execution integration using a service such as Judge0.
- Advanced assessment analytics and reporting.
- Expanded competition functionality.
- More comprehensive administrative controls and audit logging.
- Improved question validation and management.
- Automated testing and continuous integration.
- Performance monitoring and optimization.
- Enhanced accessibility and responsive design.

Future enhancements are not necessarily available in the current version.

---

# 🎓 Learning Outcomes

Developing TESTORIAX provides practical experience in:

- Full-stack web application development.
- Building interfaces with React and Tailwind CSS.
- Creating backend APIs using Node.js and Express.
- Integrating PostgreSQL and Supabase services.
- Integrating a generative AI API.
- Understanding authentication and authorization.
- Debugging application integration issues.
- Using Git and GitHub for version control.
- Reviewing repository security and configuration.
- Planning modular architecture and future enhancements.

---

# 👨‍💻 Developer

**Mahak Gupta**

B.Tech — Artificial Intelligence and Machine Learning

GitHub: [mahakgupta9675-rgb](https://github.com/mahakgupta9675-rgb)

Project Repository: [TESTORIAX](https://github.com/mahakgupta9675-rgb/TESTORIAX)

---

# ⭐ Project Status

| Area | Status |
|---|---|
| Full-stack application | Under active development |
| Gemini integration | Backend endpoint implemented |
| Database integration | Configured services under development and validation |
| Assessment workflows | Verify against current build |
| Advanced analytics | Future enhancement |
| Coding execution | Future integration |
| Security hardening | Ongoing review |
| Production readiness | Requires further validation |

---

# 🎯 Long-Term Goal

TESTORIAX aims to provide a unified assessment experience through which users can:

**Create → Publish → Participate → Evaluate → Improve**

By combining AI-assisted question generation with flexible assessment workflows, the project explores how modern web technologies and generative AI can improve online testing.

---

> 🚀 **TESTORIAX — Create. Compete. Analyze. Improve.**
>
> A full-stack AI-powered assessment platform focused on practical software engineering, AI integration, and secure application development.


This project is licensed under the [MIT License](LICENSE).
