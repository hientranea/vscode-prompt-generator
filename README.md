
#### This project is archived since it will be moved under the East Agile AiDD Tools repo soon.

----

# AiDD Prompt Generator

[![License](https://img.shields.io/github/license/hientranea/vscode-prompt-generator.svg)](https://github.com/hientranea/vscode-prompt-generator/blob/main/LICENSE)

**Streamline Your Content Merging for AI-Driven Development**

Effortlessly combine multiple files into a single file with customizable templates. Perfect for developers applying AI-driven development techniques.

[![Install in VS Code](https://img.shields.io/badge/Install%20in-VS%20Code-blue?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=HienTran.prompt-generator)

## Features

- **Intuitive File Selection**: Choose files easily using a visual file picker.
- **Customizable Templates**: Create and edit templates to structure your concatenated content.
- **User-Friendly Template Editor**: Manage your templates with a built-in, easy-to-use editor.
- **Ignore Rules**: Respect .gitignore by default and allow customization of ignore rules.
- **Hot-key Support**: Quickly open Prompt Generator with Cmd + M (customizable).

## Requirements

- Visual Studio Code version 1.86.0 or higher

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (Cmd+Shift+X)
3. Search for "AiDD Prompt Generator"
4. Click Install

## Usage

### Generate Prompt

1. Open a workspace containing the files you want to select
2. Press `Cmd+Shift+P` to open the Command Palette
3. Type "Prompt Generator" and select the command
4. In the file picker that appears, select the files you want to include in your prompt
5. Choose a template from the list of available templates
6. A new document will open with the concatenated content

### Managing Templates

1. Press `Cmd+Shift+P` to open the Command Palette
2. Type "Edit Prompt Templates" and select the command
3. The template editor will open, allowing you to add, edit, or delete templates

### Keybindings

By default, you can use the following keybinding to trigger the Prompt Generator:

- macOS: `Cmd+M`

You can customize this keybinding in VS Code:

1. Open the Keyboard Shortcuts editor (Code > Settings > Keyboard Shortcuts)
2. Search for "Prompt Generator"
3. Click on the pencil icon next to the command and enter your preferred keybinding

## Project Setup for Development

If you want to contribute to the Prompt Generator or set it up for development, follow these steps:

1. Clone the repository
2. Install dependencies: `npm install`
3. To run the extension in debug mode:

- Press F5 or select "Run and Debug" from the sidebar
- Choose "Run Extension" from the dropdown

4. To package the extension: `npm run package`

## Contributing

We welcome contributions to the Prompt Generator!

## Known Issues

- Currently, there are no known issues. If you encounter any problems, please file an issue on our [GitHub repository](https://github.com/hientranea/vscode-prompt-generator/issues).

## License

This project is licensed under the Apache-2.0 license - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have any questions, please file an issue on our [GitHub repository](https://github.com/hientranea/vscode-prompt-generator/issues).

**Happy coding with AI-driven development!**
