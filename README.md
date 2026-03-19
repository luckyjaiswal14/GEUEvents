# GEUClubs 🎓✨

**GEUClubs** is the official digital hub for Graphic Era University (GEU), designed to centralize club activities, events, and student engagement. It empowers students to discover their community, stay updated with campus events, and manage their club memberships seamlessly.

## 🚀 Features

- **Club Directory:** Search and filter through all active clubs at GEU (Technical, Cultural, Sports, etc.).
- **Events Calendar:** Stay updated with workshops, fests, and competitions across the university.
- **Student Dashboard:** Personalized space to track memberships, pending requests, and upcoming events.
- **Club Admin Tools:** Dedicated interface for club leads to manage profiles and post events.
- **Secure Authentication:** Seamless Google Login using university accounts.
- **Real-time Updates:** Powered by Firebase Firestore for instant data synchronization.
- **Modern UI:** Responsive design built with React, Tailwind CSS, and Framer Motion.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Backend:** Firebase Authentication, Cloud Firestore
- **Deployment:** Optimized for Vercel and Cloud Run

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/luckyjaiswal14/GEUEvents.git
   cd GEUEvents
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   VITE_FIREBASE_FIRESTORE_DATABASE_ID=(default)
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🚀 Deployment on Vercel

1. Push your code to your GitHub repository.
2. Connect your repository to Vercel.
3. Add the environment variables listed above in the Vercel Project Settings.
4. Deploy!

**Note:** Ensure you add your Vercel URL to the "Authorized Domains" in your Firebase Authentication settings.

## 📄 License

This project is built for Graphic Era University. All rights reserved.

---
Built with ❤️ for GEU Students.
