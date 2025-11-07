# Obsidian GitHub Discussions Plugin

A plugin that allows you to view and edit GitHub Discussions directly within Obsidian.

## Features

- 📖 View and edit GitHub Discussions as clean Obsidian notes
- 🔄 Two-way sync between GitHub and your vault
- 💬 Display comments inline with discussion content
- 🏷️ Filter and organize discussions by category

## Installation

### Manual Installation

1. Clone or download this repository
```bash
git clone https://github.com/your-username/obsidian-github-discussions.git
```

2. Install dependencies and build
```bash
npm install
npm run build
```

3. Copy the built files (`main.js`, `manifest.json`, `styles.css`) to your vault's plugins folder:
   - `[YOUR_VAULT]/.obsidian/plugins/obsidian-github-discussions/`

4. Restart Obsidian and enable the plugin in Settings

## Configuration

Before using the plugin, you need to configure the following:

1. **GitHub Personal Access Token**
   - Generate a token at [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Required scopes: `repo` (for private repositories) or `public_repo` (for public repositories)

2. **Repository Information**
   - **Repository Owner**: Repository owner (username or organization name)
   - **Repository Name**: Repository name

3. **Other Settings**
   - **Discussions Folder**: Folder name to save Discussions (default: `Discussions`)
   - **Sync on Start**: Auto-sync on Obsidian startup (default: enabled)
   - **Auto Save**: Auto-save edits (default: disabled)

## Usage

### Viewing Discussions

1. Click the ribbon icon (💬) in the sidebar, or
2. Run "Open Discussion List" from the Command Palette (`Ctrl/Cmd + P`)

### Editing Discussions

1. Click the "Open" button on a Discussion in the list
2. Edit the opened Markdown file as a regular Obsidian note
3. After editing, click "Push Changes" button then the local file will be synced to GitHub

### File Structure

Discussions are saved in the following format:
```
VaultRoot/
└── Discussions/
    ├── How to use this feature.md
    ├── Bug report about login.md
    └── ...
```
Files are named using the discussion title and contain metadata in the frontmatter (which is hidden from view).

## Development

### Development Setup

```bash
# Install dependencies
npm install

# Run in development mode (watches for file changes)
npm run dev

# Production build
npm run build
```

### Updating GraphQL Schema

When the GitHub API schema is updated:
```bash
npm run codegen
```

## License

MIT License
See [LICENSE](LICENSE) for more information.