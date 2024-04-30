# LangChain Chatbot UI

Welcome to the Angular Langchain.js Chatbot UI, an open-source project that provides a user-friendly interface for interacting with various language models (LLMs) from different providers such as OpenAI, Anthropic, Mistral, and Ollama. This application is currently in beta, and we welcome contributions and collaborations from the community.

## Features

- **Multiple LLMs**: Easily switch between different Large Language Models (LLMs) such as OpenAI, Anthropic, Mistral, and Ollama.
- **Model Selection**: Choose the specific model you wish to use for each LLM.
- **Temperature Settings**: Adjust the temperature to fine-tune the responses from your chosen LLM.
- **Chatbot UI**: Engage with a chatbot interface that remembers the conversation context.
- **Notebook**: Utilize a notebook feature to send prompts to the LLM and receive responses without prior context or memory.
- **Templates**: Define and save reusable prompts for specific use cases. Pass a "contextual" prompt alongside your saved template for dynamic interaction. Create as many templates as needed.

## Running the Application

The application runs entirely in the browser, providing a seamless user experience. Please note that the actual LLMs are not hosted within the application.

To run the LangChain Chatbot UI on your local machine, follow these steps:

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Run `npm install` to install all the necessary dependencies.
4. Once the installation is complete, run `ng serve` to start the development server.
5. Open your browser and go to `http://localhost:4200/` to view the application.

## Roadmap

- Expand the list of available LLMs supported by LangChain.js.
- Enhance the Chat Conversation Memory feature by adding an option for summarization, reducing the need to pass the entire chat history.
- Introduce the ability to create custom tools and agents.

## Contributing

We encourage the community to contribute to the development of LangChain Chatbot UI. Whether it's feature enhancements, bug fixes, or documentation improvements, your pull requests are welcome.

## License

This project is open-sourced under the MIT License. 

---

**Note**: As this project is in beta, we are actively working on improvements and new features. We appreciate your support and contributions during this phase.