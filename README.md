# 🎬 AI Video Dubber

Free AI-powered video dubbing app for Android. Upload any video in any language and get it dubbed into 25+ languages with automatic character detection.

## ✨ Features

- 🎤 Auto speech recognition (any language)
- 👥 Detects Male, Female, Child, Old Man, Old Woman voices
- 🌍 Translates to 25+ languages
- 🔊 AI voice generation per character
- ⏱ Perfect audio-video sync
- 📥 Download dubbed videos
- 💯 100% FREE with fallback systems

## 🚀 Build APK via GitHub Actions

### Step 1: Fork this repository

### Step 2: Get Free Expo Token
1. Go to https://expo.dev → Sign up free
2. Account Settings → Access Tokens → Create token
3. In your GitHub repo: Settings → Secrets → Actions
4. Add secret: `EXPO_TOKEN` = your token

### Step 3: Push code to main branch
GitHub Actions will automatically build the APK!

### Step 4: Download APK
Go to: Actions tab → Latest workflow → Artifacts → Download `app-release-apk`

## 🆓 Free APIs Used

| Service | Purpose | Free Limit |
|---------|---------|------------|
| MyMemory | Translation | 5000 words/day |
| LibreTranslate | Translation | Unlimited (open source) |
| Lingva | Translation | Unlimited |
| Whisper (HuggingFace) | Speech-to-text | Free tier |
| AssemblyAI | Speaker detection | 5 hrs/month free |
| Google TTS | Voice synthesis | Free endpoint |
| VoiceRSS | Voice synthesis | 350 req/day free |

## 🔧 Optional: Add Free API Keys

Create `.env` file:
