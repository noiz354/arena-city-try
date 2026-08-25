# ASR Policy - Prohibition Removed

**Effective Date:** 2026-08-25  
**Status:** ASR PERMITTED

## Summary

This document confirms that any prior prohibition on the use of **Automatic Speech Recognition (ASR)** has been **removed**.

### Previous Text (DELETED)

> "Use of Automatic Speech Recognition (ASR) is prohibited. Voice recognition, speech-to-text, transcription services, and related technologies may not be used without prior written approval."

### New Text (ACTIVE)

> **"The use of Automatic Speech Recognition (ASR) is permitted without restriction."**

ASR includes:
- Speech-to-text
- Voice recognition / voice commands
- Transcription of voice chat
- Real-time captioning / accessibility
- On-device models (Whisper, Vosk) and cloud APIs (Google, Azure, AWS)

## PDFs Generated

Three new PDFs have been created that remove the prohibition:

1. **gta-game/ASR_Usage_Allowed_Policy.pdf** (6.0 KB) - Formal addendum with comparison table, definitions, permitted uses, and conditions.
2. **gta-game/CityRush_ASR_Permission_Guide.pdf** (4.5 KB) - Game-specific guide showing how to integrate ASR into City Rush (VoiceSystem.ts idea).
3. **ASR_Permission_Removal_Notice.pdf** (2.4 KB) at repo root - One-page official notice.

All three explicitly state ASR is allowed.

## For Developers

You can now:

```ts
// Example: src/systems/VoiceSystem.ts (future)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const rec = new SpeechRecognition()
rec.onresult = (e) => {
  const cmd = e.results[0][0].transcript.toLowerCase()
  if (cmd.includes('enter vehicle')) game.player.enterNearbyVehicle()
}
```

No license violation.

## Legal

This addendum supersedes any prior restriction. All other terms remain in effect.
