# Disco Et Emergo — Landing Page

Interactive adult learning & team coaching landing page (*"Host productive meetings that don't suck!"*).

## Project Structure

- `html/index.html` — Main landing page
- `html/images/` — Brand logo assets (`logo.jpeg`, `logo-transparent.png`, `logo-mark.png`)
- `html/js/main.js` — Mobile navigation and plug-and-play static contact form handler
- `tests/site.test.js` — Node.js unit and DOM verification test suite
- `.github/workflows/pages.yml` — GitHub Actions workflow that runs tests and deploys `./html` to GitHub Pages

## Running Tests Locally

```bash
npm test
npm run build
```

## Contact Form Setup (GitHub Pages)

By default, submitting the contact form uses a pre-filled `mailto:` + clipboard fallback. To enable direct serverless email delivery on GitHub Pages:

1. Generate a free access key at [Web3Forms](https://web3forms.com/) (or a [Formspree](https://formspree.io/) endpoint).
2. Set `accessKey` in `DEFAULT_CONTACT_CONFIG` inside `html/js/main.js`.
3. Commit and push to `main`.
