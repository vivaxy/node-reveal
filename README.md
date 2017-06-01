# node-reveal

🎁 A reveal.js cli

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![MIT License][license-image]][license-url]
[![Standard Version][standard-version-image]][standard-version-url]

## Feature

- Easy to setup. No cloning repositories. No template files.
- Markdown files as slides content.
- Auto reload when markdown file changes.
- Master controls all clients.
- Theme config.
- Support inline html.

## Markdown Syntax

See [reveal.js](https://github.com/hakimel/reveal.js#markdown) for reference.

- Use `\r?\n----\r?\n` as horizontal slides separator.
- Use `\r?\n---\r?\n` as vertical slides separator.
- Use `^Note:` as speaker notes separator.
- Use `<!-- .slide: data-background="#ff0000" -->` to customize slide styles.
- Use `<!-- .element: class="fragment" -->` to create fragment.

## Support

node.js@v8

## Basic Usage

### Install

`yarn add @vivaxy/reveal`

`npm install @vivaxy/reveal`

### Configuration

Update `package.json`

```js
{
  // ...
  "scripts": {
    "start": "reveal server --markdown ./ppt/reveal.md"
  }
}
```

### Start server

`> npm start`

## Advanced Usage

### Commands

#### `start`

##### Basic Usage

`reveal start --markdown ./ppt/reveal.md --theme solarized --highlight-theme solarized-light --transition slide --port 8080 --watch`

##### Options

| name                      | type      | isRequired    | default               | description                   |
| ---                       | ---       | ---           | ---                   | ---                           |
| `--markdown`              | string    | ✔             | N/A                   | markdown file                 |
| `--theme`                 | string    | ✖             | `solarized`           | `reveal.js` theme             |
| `--highlight-theme`       | string    | ✖             | `solarized-light`     | `highlight.js` theme          |
| `--transition`            | string    | ✖             | `slide`               | `reveal.js` slide type        |
| `--port`                  | number    | ✖             | `8080`                | server port                   |
| `--watch`                 | boolean   | ✖             | `false`               | reload when markdown changed  |
| `--separator`             | string    | ✖             | `^\r?\n----\r?\n$`    | horizontal slides separator   |
| `--separator-vertical`    | string    | ✖             | `^\r?\n---\r?\n$`     | vertical slides separator     |
| `--separator-notes`       | string    | ✖             | `^Note:`              | speaker notes separator       |

## Prior Art

- [reveal.js](https://github.com/hakimel/reveal.js)
- [ksky521/nodePPT](https://github.com/ksky521/nodePPT)
- [int64ago/node-reveal](https://github.com/int64ago/node-reveal)

[npm-version-image]: http://img.shields.io/npm/v/@vivaxy/reveal.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/@vivaxy/reveal
[npm-downloads-image]: https://img.shields.io/npm/dt/@vivaxy/reveal.svg?style=flat-square
[license-image]: https://img.shields.io/npm/l/@vivaxy/reveal.svg?style=flat-square
[license-url]: LICENSE
[standard-version-image]: https://img.shields.io/badge/release-standard%20version-brightgreen.svg?style=flat-square
[standard-version-url]: https://github.com/conventional-changelog/standard-version
