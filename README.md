# Prompto

Welcome to Prompto, an open-source project designed to provide a user-friendly interface for interacting with a variety of Language Models (LLMs) via LangChain Js. Prompto, a blend of the word 'Prompt' and the Italian word 'Pronto' (meaning ready and quick), is aptly named as it allows for the quick and easy switching between different LLMs, directly from your browser.

## Features

- **Multiple LLMs**: Effortlessly switch between a range of Large Language Models (LLMs) supported by LangChain Js.
- **Temperature Settings**: Adjust the temperature to fine-tune the responses from your chosen LLM.
- **Chatbot UI**: Engage with a chatbot interface that remembers the conversation context.
- **Notebook**: Utilize a notebook feature to send prompts to the LLM and receive responses without prior context or memory.
- **Templates**: Create, save, and reuse prompts for specific use cases. Incorporate a "contextual" prompt alongside your saved template for dynamic interaction.

## Data Storage and Security

**Important Note:** Prompto saves your chat history, prompt templates, and settings on your browser for easy access. This is convenient, but there's a small catch: information saved on your local storage can be accessed by others in some situations.

Prompto provides a button on the settings page that allows you to clear all saved data, including chat conversations, prompt templates, and settings. 

## Live Example
You can view a live example of Prompto by visiting the following link: [Prompto](https://prompto.asanchez.dev/).
The application can be installed as a PWA on your device.

## Running the Application

The application runs entirely in the browser, providing a seamless user experience. Please note that the actual LLMs are not hosted within the application.

To run the Prompto on your local machine, follow these steps:

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `npm install` to install all the necessary dependencies.
4. Once the installation is complete, run `ng serve` to start the development server.
5. Open your browser and go to `http://localhost:4200/` to view the application.

## Ollama
If you are running Ollama and you want to connect it to Prompto from a different domain than localhost, you will need to add the domain to the CORS configuration in the Ollama server. To do this, read the following blog post: [How to Handle CORS Settings in OLLAMA: A Comprehensive Guide](https://medium.com/dcoderai/how-to-handle-cors-settings-in-ollama-a-comprehensive-guide-ee2a5a1beef0) or the official documentation: [How do I configure Ollama server?](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server).

## Roadmap

- Broaden the spectrum of LLMs supported by LangChain.js.
- Enhance the Chat Conversation Memory feature by adding an option for summarization, reducing the need to pass the entire chat history.
- Introduce the ability to create custom tools and agents.

## Contributing

If you're interested in contributing, please fork the repository and submit a pull request with your proposed changes. Whether it's feature enhancements, bug fixes, or documentation improvements, all contributions are greatly appreciated.

## License

This project is open-sourced under the MIT License. 

---

**Note**: As this project is in beta, I am actively working on improvements and new features. I appreciate your support and contributions during this phase.