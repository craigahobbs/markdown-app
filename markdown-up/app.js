// Licensed under the MIT License
// https://github.com/craigahobbs/markdown-up/blob/main/LICENSE

import * as smd from '../schema-markdown/index.js';
import {getMarkdownTitle, markdownElements, parseMarkdown} from '../markdown-model/index.js';
import {UserTypeElements} from '../schema-markdown-doc/index.js';
import {renderElements} from '../element-model/index.js';


// The application's hash parameter type model
const appHashTypes = (new smd.SchemaMarkdownParser(`\
# The MarkdownUp application hash parameters struct
struct MarkdownUp

    # The Markdown resource URL
    optional string(len > 0) url

    # Optional command
    optional Command cmd

# Application command union
union Command

    # Render the application's hash parameter documentation
    int(==1) help
`).types);


/**
 * The MarkdownUp application
 *
 * @property {Object} window - The web browser window object
 * @property {string} defaultMarkdownURL - The default Markdown resource URL
 * @property {Object} params - The validated hash parameters object
 */
export class MarkdownUp {
    /**
     * Create an application instance
     *
     * @property {Object} window - The web browser window object
     * @property {string} defaultMarkdownURL - The default Markdown resource URL
     */
    constructor(window, defaultMarkdownURL) {
        this.window = window;
        this.defaultMarkdownURL = defaultMarkdownURL;
        this.params = null;
    }

    /**
     * Run the application
     *
     * @property {Object} window - The web browser window object
     * @property {string} defaultMarkdownURL - The default Markdown resource URL
     * @returns {MarkdownUp}
     */
    static async run(window, defaultMarkdownURL) {
        const app = new MarkdownUp(window, defaultMarkdownURL);
        await app.render();
        window.addEventListener('hashchange', () => app.render(), false);
        return app;
    }

    // Helper function to parse and validate the hash parameters
    updateParams(paramStr = null) {
        // Clear, then validate the hash parameters (may throw)
        this.params = null;

        // Decode the params string
        const paramStrActual = paramStr !== null ? paramStr : this.window.location.hash.substring(1);
        const params = smd.decodeQueryString(paramStrActual);

        // Validate the params
        this.params = smd.validateType(appHashTypes, 'MarkdownUp', params);
    }

    // Render the Markdown application
    async render() {
        let appTitle = 'MarkdownUp';
        let appElements = null;
        try {
            // Validate hash parameters
            const paramsPrev = this.params;
            this.updateParams();

            // Skip the render if the page params haven't changed
            if (paramsPrev !== null && JSON.stringify(paramsPrev) === JSON.stringify(this.params)) {
                return;
            }

            // Render the application elements
            [appTitle, appElements] = await this.appElements(appTitle);
        } catch ({message}) {
            appElements = {'html': 'p', 'elem': {'text': `Error: ${message}`}};
        }

        // Render the application
        this.window.document.title = appTitle;
        renderElements(this.window.document.body, appElements);
    }

    // Generate the Markdown application's element model
    async appElements(appTitle) {
        // Application command?
        if ('cmd' in this.params) {
            // 'help' in this.params.cmd
            return [appTitle, (new UserTypeElements(this.params)).getElements(appHashTypes, 'MarkdownUp')];
        }

        // Load the Markdown resource
        const markdownURL = 'url' in this.params ? this.params.url : this.defaultMarkdownURL;
        const response = await this.window.fetch(markdownURL);
        if (!response.ok) {
            throw new Error(`Could not fetch '${markdownURL}', '${response.statusText}'`);
        }

        // Render the Markdown
        const markdownText = await response.text();
        const markdownModel = parseMarkdown(markdownText);
        const markdownTitle = getMarkdownTitle(markdownModel);
        return [markdownTitle !== null ? markdownTitle : appTitle, markdownElements(markdownModel, markdownURL)];
    }
}
