# Prompto

Welcome to Prompto, an open-source Angular application designed to provide a user-friendly interface for interacting with a variety of Language Models (LLMs) via LangChain.js. Prompto, a blend of the word 'Prompt' and the Italian word 'Pronto' (meaning ready and quick), is aptly named as it allows for the quick and easy switching between different LLMs, directly from your browser.

## Technology Stack

- **Frontend**: Angular ^17
- **UI Framework**: TailwindCSS
- **Markdown Processing**: Marked with syntax highlighting via highlight.js
- **LLM Integration**: LangChain.js
- **PWA Support**: Service Worker

## Features

- **Multiple LLMs**: Effortlessly switch between a range of Large Language Models (LLMs) supported by LangChain Js.
- **Temperature Settings**: Adjust the temperature to fine-tune the responses from your chosen LLM.
- **Chatbot UI**: Engage with a chatbot interface that remembers the conversation context.
- **Notebook**: Utilize a notebook feature to send prompts to the LLM and receive responses without prior context or memory.
- **Templates**: Create, save, and reuse prompts for specific use cases. Incorporate a "contextual" prompt alongside your saved template for dynamic interaction.
- **Arena**: Engage in a conversation with multiple LLMs simultaneously, comparing their responses side by side.
- **Discussion**: Create dynamic conversations between multiple AI personas to explore topics from different perspectives.

## Data Storage and Security

**Important Note:** Prompto saves your chat history, prompt templates, and settings on your browser for easy access. This is convenient, but there's a small catch: information saved on your local storage can be accessed by others in some situations.

Prompto provides a button on the settings page that allows you to clear all saved data, including chat conversations, prompt templates, and settings. 

## Live Example
You can view a live example of Prompto by visiting the following link: [Prompto](https://prompto.asanchez.dev/).
The application can be installed as a PWA on your device.

## Installation

1. Clone the repository to your local machine
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   ng serve
   ```
5. Open your browser and navigate to `http://localhost:4200`

### Production Build

To create a production build:

```bash
ng build --configuration=production
```

The build artifacts will be stored in the `dist/prompto` directory.

## Development

The project uses Angular's latest features including:
- Standalone components
- Lazy loading for all routes
- Service workers for PWA support
- TypeScript strict mode enabled

## Ollama
If you are running Ollama and you want to connect it to Prompto from a different domain than localhost, you will need to add the domain to the CORS configuration in the Ollama server. To do this, read the following blog post: [How to Handle CORS Settings in OLLAMA: A Comprehensive Guide](https://medium.com/dcoderai/how-to-handle-cors-settings-in-ollama-a-comprehensive-guide-ee2a5a1beef0) or the official documentation: [How do I configure Ollama server?](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server).

## Roadmap

- Broaden the spectrum of LLMs supported by LangChain.js.
- Enhance the Chat Conversation Memory feature by adding an option for summarization, reducing the need to pass the entire chat history.
- Introduce the ability to create custom tools and agents.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Follow the existing code style (2 spaces for indentation as per .editorconfig)
4. Submit a pull request

Whether it's feature enhancements, bug fixes, or documentation improvements, all contributions are greatly appreciated.

## License

This project is open-sourced under the MIT License. 

---

**Note**: 
As this project is in beta, I am actively working on improvements and new features. I appreciate your support and contributions during this phase.

This project is not affiliated with OpenAI, LangChain or any other provider. It is an independent project designed to provide a user-friendly interface for interacting with LLMs.

This project is not associated with the french trademark Prompto registered in the field of AI.