# MarkdownUp

[![npm](https://img.shields.io/npm/v/markdown-up)](https://www.npmjs.com/package/markdown-up)
[![GitHub](https://img.shields.io/github/license/craigahobbs/markdown-up)](https://github.com/craigahobbs/markdown-up/blob/main/LICENSE)

[MarkdownUp](https://craigahobbs.github.io/markdown-up/)
is a Markdown viewer.


## View Local Markdown Files

To view local Markdown files, use the
[MarkdownUp launcher](https://pypi.org/project/markdown-up/)
from a terminal prompt:

~~~
pip install markdown-up
markdown-up
~~~


## Host Markdown Web Pages

To host a Markdown resource, download the MarkdownUp application stub to the directory containing
your Markdown files:

~~~
curl -O https://craigahobbs.github.io/markdown-up/extra/index.html
~~~

To test your Markdown page, start a local static web server:

~~~
python3 -m http.server
~~~

By default, MarkdownUp fetches the "README.md" resource. To change the default resource, update the
application stub file, index.html. For example:

~~~
    ...
    <script type="module">
        import {MarkdownUp} from 'https://craigahobbs.github.io/markdown-up/lib/app.js';
        const app = new MarkdownUp(window, {'url': 'other.md'});
        app.run();
    </script>
    ...
~~~

To view a different Markdown resource, set the application's
["url" hash parameter](https://craigahobbs.github.io/markdown-up/#cmd.help=1)
(i.e., "http://127.0.0.1:8000#url=other.md").


## Dynamic Markdown Applications

Using MarkdownUp's "markdown-script" fenced code blocks, you can dynamically generate Markdown,
allowing you to build lightweight, client-rendered web applications with no HTML, no CSS, and a
single dependency (MarkdownUp). The "markdown-script" fenced code blocks are interpreted as the
[CalcScript programming language](https://craigahobbs.github.io/calc-script/language/).
In addition to generating Markdown, you can fetch text and JSON resources, create SVG drawings,
parse CSV, render data tables, draw line charts, and more. For more information, see the
[MarkdownUp Library](https://craigahobbs.github.io/markdown-up/library/) and the
[CalcScript Library](https://craigahobbs.github.io/calc-script/library/).

For example:

```
# MarkdownUp Dynamic Markdown Example

~~~ markdown-script
# Variable arguments
helloCount = if(vCount != null, vCount, 5)

# Constants
width = 140
height = 40
borderSize = 5
borderColor = 'blue'

# Render the more/less menu
markdownPrint( \
    '', \
    if(helloCount <= 1, 'Less', '[Less](#var.vCount=' + (helloCount - 1) + ')') + ' | ', \
    '[More](#var.vCount=' + (helloCount + 1) + ')' \
)

# Render many hellos
ixHello = 0
helloLoop:
    # Render the hello title
    helloTitle = 'Hello #' + (ixHello + 1)
    markdownPrint('', '## ' + helloTitle)

    # Render the hello drawing
    setDrawingSize(width, height)
    drawStyle(borderColor, borderSize)
    drawRect(0.5 * borderSize, 0.5 * borderSize, width - borderSize, height - borderSize)
    drawTextStyle(0.67 * height, null, true)
    drawText(helloTitle, 0.5 * width, 0.55 * height)

    ixHello = ixHello + 1
jumpif (ixHello < helloCount) helloLoop
~~~
```

Click here to [see the example in action](https://craigahobbs.github.io/markdown-up/#url=DynamicMarkdownExample.md).


### Links

- [MarkdownUp Application Examples](https://craigahobbs.github.io/#url=MarkdownUpApplications.md)
- [The CalcScript Language](https://craigahobbs.github.io/calc-script/language/)
- [The CalcScript Library](https://craigahobbs.github.io/calc-script/library/)
- [The MarkdownUp Library](https://craigahobbs.github.io/markdown-up/library/)


## The MarkdownUp Package

The [markdown-up package](https://www.npmjs.com/package/markdown-up) contains functions for parsing
CSV, manipulating data, and rendering tables and charts. For more information, refer to the
[MarkdownUp package documentation](https://craigahobbs.github.io/markdown-up/doc/).


## Development

MarkdownUp is developed using [javascript-build](https://github.com/craigahobbs/javascript-build#readme)
and it was started using [javascript-template](https://github.com/craigahobbs/javascript-template#readme):

~~~
template-specialize javascript-template/template/ markdown-up/ -k package markdown-up -k name 'Craig A. Hobbs' -k email 'craigahobbs@gmail.com' -k github 'craigahobbs'
~~~
