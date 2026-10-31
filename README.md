# Translate extension

Simply displays the MyMemory Translate form in the extension's pop-up.

## Why?

I wasn't finding any simple extension that just allowed me to use the translator on any page. All the ones I tested translated some selected text or didn't open the popup. So here we are with this extension.

## Project Description

This is a lightweight browser extension that provides quick access to translation functionality directly from your browser. Type or paste any text you want to translate, select your source and target languages, and get instant translations without leaving the current page.

### Key Features

- **Simple UI**: Clean and intuitive interface for easy translation
- **Language Swapping**: Quickly exchange source and target languages with one click
- **Auto-Detection**: Automatically detect the language of your input text
- **Translation Caching**: Recent translations are cached for faster retrieval
- **Copy to Clipboard**: Easily copy translated text with a single click
- **Theme Support**: Respects your system's light/dark mode preference
- **Multi-Language**: Full localization support for English, Spanish, and Portuguese

### User Interface Functions

The extension includes the following interface capabilities:

- **Source Text Input**: Enter or paste text to be translated with a visual textarea
- **Language Selection**: Dropdown selectors for both source and target languages, with auto-detection option
- **Language Swap**: Button to quickly reverse the translation direction
- **Translation Display**: Real-time display of translation results with loading feedback
- **Copy Button**: Copy translated text to clipboard with visual confirmation
- **Clear Button**: Clear input and reset the translation
- **Status Feedback**: Real-time status messages for errors and interactions
- **Theme Adaptation**: Automatically adjusts to system dark/light mode

## External Dependencies

This project uses the following external libraries and services:

- **Bootstrap CSS Framework**: Provides responsive design and UI components (bootstrap.min.css)
- **MyMemory Translation API**: Powers the translation functionality via `api.mymemory.translated.net`
- **Browser Extension APIs**: Uses native browser i18n and clipboard APIs

## Icon

The extension icon (`assets/icon.svg`) is original artwork made for this project from basic geometric shapes, with no fonts or third-party images, and is distributed under the same MIT License as the code. The PNG files in `assets/icons/` are exported from that SVG at 16, 32, 48 and 128 px.

## Privacy & Security

- **No Data Collection**: This extension does not read, store, or transmit any data from web pages you visit
- **Limited External Calls**: Only calls the MyMemory Translation API to perform translations—no other external APIs are used
- **No Background Activity**: The extension does not run any background processes or services
- **Open Source**: All code is available on GitHub for full transparency and community review

## Repository

All source code is available on GitHub. Visit the repository to contribute, report issues, or review the implementation.

[GitHub Repository: olliveiragusttavo/translate-extension](https://github.com/olliveiragusttavo/translate-extension)
