# Legal Document Analyzer

A modern web application for analyzing legal documents, identifying key clauses, and providing relevant legal references.

## Features

- **Document Upload & Paste**
  - Support for PDF, DOCX, and TXT files
  - Direct text pasting from clipboard
  - Responsive drag-and-drop interface

- **Smart Clause Detection**
  - Automatic identification of key legal clauses
  - Pattern-based matching for common clauses
  - Optional LLM-powered analysis for complex cases

- **Interactive Analysis**
  - Highlighted risk clauses
  - Hover tooltips with explanations
  - Links to relevant legal references

- **Legal Reference Database**
  - Built-in legal reference library
  - Searchable law database
  - Category-based filtering

## Tech Stack

- **Frontend**
  - Next.js
  - TypeScript
  - Tailwind CSS
  - React Dropzone
  - PDF.js
  - Mammoth.js

- **Backend**
  - Next.js API Routes
  - Fuse.js for fuzzy search
  - OpenAI API (optional)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/legal-doc-analyzer.git
   cd legal-doc-analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file:
   ```
   OPENAI_API_KEY=your_api_key_here  # Optional, for LLM features
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
legaldoc-next/
├── pages/
│   ├── index.tsx               # Main contract analysis page
│   ├── api/
│   │   ├── parse.ts           # Clause parsing endpoint
│   │   └── laws.ts            # Legal reference endpoint
├── components/
│   ├── ClauseHighlighter.tsx  # Text highlighting component
│   ├── TooltipCard.tsx        # Explanation tooltip
│   ├── FileUploader.tsx       # Document upload component
├── lib/
│   ├── clauseMatcher.ts       # Clause detection logic
├── public/
│   └── data/laws.json         # Legal reference database
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js)
