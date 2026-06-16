# Nirmana Constructions

> A blazing-fast, completely serverless web application built for Nirmana Constructions. Fully hosted and powered by Cloudflare's modern edge infrastructure.

🔗 **Production URL:** [https://nirmanaconstructions.com/](https://nirmanaconstructions.com/)

[![Framework: Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Backend: Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Database: Cloudflare D1/Hyperdrive](https://img.shields.io/badge/Database-Serverless-blue?style=flat-square&logo=sqlite&logoColor=white)](https://developers.cloudflare.com/d1/)
[![Deploy: CI/CD](https://img.shields.io/badge/Deploy-GitHub_Actions_/_Wrangler-black?style=flat-square&logo=github&logoColor=white)](https://github.com/)

---

## ⚡ Architecture Overview

Unlike traditional web applications that rely on centralized servers, this entire platform runs directly on Cloudflare's global edge network (250+ data centers), ensuring near-zero latency worldwide.

<img width="1408" height="768" alt="Gemini_Generated_Image_4hzbu84hzbu84hzb" src="https://github.com/user-attachments/assets/6d4e0ecf-5b07-4c11-a45c-1a8cfd43d831" />


*   **Frontend:** Hosted on **Cloudflare Pages** for lightning-fast static asset delivery and automatic edge caching.
*   **Backend API:** Powered by **Cloudflare Workers**, executing serverless operations globally with zero cold-starts.
*   **Database Layers:** Fully integrated serverless data layer utilized for dynamic content management, contact submissions, and internal workflows.
*   **CI/CD Pipeline:** Fully integrated with **GitHub**. Every push to `main` automatically builds and deploys to production via Cloudflare's git integration.

---

## 🛠️ Tech Stack

*   **Hosting & Deployment:** Cloudflare Pages & Workers
*   **CLI Management:** Wrangler (Cloudflare Developer CLI)
*   **Backend Runtime:** V8 Engine (Isolate-based serverless execution)
*   **Version Control:** Git & GitHub
