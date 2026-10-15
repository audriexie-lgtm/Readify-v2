# Readify

A responsive HTML/CSS/JavaScript reading-platform prototype.

## Files
- index.html — UI, five navigation pages, login/register screen and reader modal.
- styles.css — responsive aesthetic styling and accessible typography.
- app.js — book catalogue, age filtering, reader, points, profile, discussions and Firebase logic.
- firebase-config.js — Firebase configuration placeholders.

## Real books
The sample catalogue uses public-domain classics available through Project Gutenberg:
- Alice's Adventures in Wonderland
- The Wonderful Wizard of Oz
- The Secret Garden
- Anne of Green Gables
- Little Women

The "Read sample" button shows a short real excerpt. "Full book" opens the complete online edition at Project Gutenberg.

## Firebase setup
1. Create a Firebase project.
2. Enable Authentication > Sign-in method > Email/Password.
3. Create a Firestore database.
4. Put your Firebase web-app values into firebase-config.js.
5. Host the folder from a web server (not file://) because the app uses ES modules.
6. Add Firestore Security Rules before production use.

Suggested Firestore structure:
users/{uid}
  name
  email
  age
  genres
  points
  createdAt
  updatedAt

discussions/{discussionId}
  userId
  name
  text
  likes
  createdAt

For a production app, validate age/profile data server-side and use rules so users can only edit their own profile. Do not store unnecessary sensitive information.
