# 🧪 StarLIMS AI Engine

> **An enterprise AI platform built with Spring Boot that enables laboratory users to generate reports and create laboratory samples using natural language while maintaining secure, human-in-the-loop approval workflows.**

StarLIMS AI Engine combines **Advanced RAG**, **PGVector**, **LLM Tool Calling**, and **Redis Semantic Caching** to simplify enterprise laboratory workflows. The platform allows users to interact with StarLIMS through natural language instead of manually writing SQL queries or filling lengthy forms.

---

# 🚀 Overview

StarLIMS AI Engine is an AI-powered platform designed to simplify laboratory operations through natural language interactions.

The platform currently supports two primary AI-powered workflows:

- 📊 **Natural Language Report Generation**
- 🧪 **AI-Assisted Sample Creation**

For report generation, the application retrieves relevant database schema using **Advanced RAG** over **300+ enterprise database tables**, generates optimized SQL using **LLM Tool Calling**, executes the query, and displays the results in a structured tabular format with Excel export support.

For sample creation, users simply describe the sample through voice or chat. The AI extracts the required information, automatically fills the StarLIMS sample creation form using **LLM Tool Calling**, and saves it as a draft for verification before submission.

The platform follows a role-based workflow where **Lab Admins** initiate AI-powered operations and **LIMS Admins** review and approve AI-generated SQL before execution.

---

# 📸 Landing Page

<p align="center">
    <img src="StarlimsA.png" width="1000"/>
</p>

---

# ✨ Features

## 📊 AI-Powered Report Generation

Lab Admins can generate reports simply by describing their requirements in natural language.

Example:

> *Generate a report showing stability samples pending approval for more than 7 days.*

The AI automatically:

- Understands user intent
- Retrieves relevant schema using **Advanced RAG**
- Searches across **300+ enterprise database tables**
- Generates optimized SQL using **LLM Tool Calling**
- Executes the query
- Displays structured tabular results
- Exports reports directly to Excel

### Report Generation

<p align="center">
    <img src="StarlimsB.png" width="1000"/>
</p>

---

## 👥 Human-in-the-Loop Approval Workflow

### 🧪 Lab Admin

Lab Admins can:

- Generate reports using natural language
- View generated reports
- Export reports to Excel
- Create laboratory samples using voice or chat
- Submit generated SQL for review

### Report Submitted for Review

<p align="center">
    <img src="StarlimsC.png" width="700"/>
</p>

---

### ⚙️ LIMS Admin

LIMS Admins can:

- Review AI-generated SQL
- Approve or reject report requests
- Validate generated queries before execution
- Maintain governance and accuracy

### LIMS Admin Review

<p align="center">
    <img src="StarlimsE.png" width="1000"/>
</p>

---

## 🎙️ AI-Assisted Sample Creation

Instead of manually filling lengthy laboratory forms, Lab Admins simply describe the sample they want to create.

Example:

> *Create a blood sample for patient John Doe collected today with high priority.*

The AI:

- Understands user intent
- Extracts structured information
- Uses **LLM Tool Calling**
- Automatically populates the StarLIMS sample creation form
- Saves the request as a draft
- Allows users to verify every field before submission

The application never submits records automatically, ensuring users remain in complete control.

### Sample Creation using Natural Language

<p align="center">
    <img src="StarlimsD.png" width="1000"/>
</p>

---

# 🏗️ Application Workflow

```text
                    Lab Admin
                        │
        Natural Language / Voice Input
                        │
                        ▼
               Spring Boot Backend
                        │
                Intent Analysis
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
  Advanced RAG (PGVector)      LLM Tool Calling
          │                           │
          ▼                           ▼
 Relevant Database Schema     SQL Generation /
      Retrieval               Sample Draft Creation
          │                           │
          └─────────────┬─────────────┘
                        ▼
               StarLIMS Application
                        │
                        ▼
             LIMS Admin Review & Approval
                        │
                        ▼
        Reports / Sample Creation / Excel Export
```

---

# 📈 Report Dashboard

Generated reports can be viewed as structured tables and visualized through interactive charts before exporting.

<p align="center">
    <img src="StarlimsF.png" width="1000"/>
</p>

---

# 🧠 AI Capabilities

- Advanced RAG over **300+ enterprise database tables**
- Natural Language → SQL Generation
- LLM Tool Calling
- Voice & Chat-based Sample Creation
- Semantic Schema Retrieval using **PGVector**
- Redis Semantic Caching
- Human-in-the-Loop Approval Workflow
- Excel Report Export

---

# ⚡ Technology Stack

### Backend

- Spring Boot
- Java

### AI

- AWS Bedrock
- Advanced RAG
- LLM Tool Calling
- Natural Language Understanding (NLU)

### Databases

- Oracle (StarLIMS)
- PostgreSQL

### Vector Search

- PGVector

### Cache

- Redis

### Other Technologies

- Apache POI (Excel Export)
- REST APIs

---

# 🚀 Getting Started

Clone the repository

```bash
git clone https://github.com/Oishik07/Starlims_AI_ReportGenerator.git
```

Navigate into the project

```bash
cd Starlims_AI_ReportGenerator
```

Configure the required environment variables.

```properties
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
BEDROCK_MODEL=
DATABASE_URL=
REDIS_URL=
```

Run the Spring Boot application.

```bash
./mvnw spring-boot:run
```

or

```bash
mvn spring-boot:run
```

---

# 👨‍💻 Author

**Oishik Bandyopadhyay**

**AI Engineer | Applied AI | Agentic AI | LLM Engineering | Advanced RAG | Spring Boot**

- 💼 LinkedIn
- 💻 GitHub
