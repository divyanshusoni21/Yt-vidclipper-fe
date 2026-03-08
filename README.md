# YT Vidclipper (Frontend)
[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen.svg)](https://yt-vidclipper-fe.vercel.app/)
[![Frontend Repo](https://img.shields.io/badge/Frontend-Repository-blue.svg)](https://github.com/divyanshusoni21/Yt-vidclipper-fe)
[![Backend Repo](https://img.shields.io/badge/Backend-Repository-blue.svg)](https://github.com/divyanshusoni21/Yt-Vidclipper-be)

A sleek React application designed for content creators to easily extract clips from YouTube videos and adjust playback speed for social media platforms.

## ✨ Key Features

- **Smart Clipping**: Extract precise segments from any YouTube video (min 5s, max 5m). Handles timeouts gracefully if processing exceeds 5 minutes.
- **Speed Editor & Dual Input**: Adjust playback speed (e.g., 1.25x) for generated clips or uploaded local videos (max 50MB).
- **Dynamic Smart Polling**: Optimized polling system that adapts update intervals based on clip duration.
- **State Persistence**: Robust session management saves your progress (URL, times, processing status) across reloads and navigation.
- **Process Control**: Ability to cancel ongoing processing requests instantly.
- **Quality Options**: Choose between 720p and 480p resolutions for your clips.
- **Direct Delivery**: Download processed clips instantly or send them via email.
- **Responsive UI**: Fully responsive interface built with Tailwind CSS v4.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS 4
- **Routing**: React Router DOM 7
- **State/API**: Native Fetch API

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Backend API running (configure in `src/config.js`)

### Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd yt-helper-fe
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

## 📂 Project Structure

- `src/pages/GetClips.jsx` - Main interface for YouTube clipping.
- `src/pages/EditVideoSpeed.jsx` - Tool for adjusting video playback speed.
- `src/api/clipService.js` - API service for backend communication.
- `src/components/` - Reusable UI components (Header, Footer, TimePicker).
