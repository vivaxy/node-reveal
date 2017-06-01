/**
 * @since 2017-05-31 19:42:13
 * @author vivaxy
 */

const path = require('path');

const ip = require('ip');
const ejs = require('ejs');
const Koa = require('koa');
const log = require('log-util');
const fse = require('fs-extra');
const send = require('koa-send');
const glob = require('glob-promise');
const chokidar = require('chokidar');
const createSocketIo = require('socket.io');
const openBrowser = require('react-dev-utils/openBrowser');

const projectRoot = process.cwd();
const nodeRevealRoot = path.join(__dirname, '..');
const revealJsRoot = path.join(require.resolve('reveal.js'), '..', '..');
const highlightJsRoot = path.join(require.resolve('highlight.js'), '..', '..');
const socketIoClientRoot = path.join(require.resolve('socket.io-client'), '..', '..');
const jsPolyfillsRoot = path.join(require.resolve('js-polyfills'), '..');
const templatePath = path.join(nodeRevealRoot, './template/index.ejs');

const socketSet = new Set();
let masterSocket = null;

const readFile = async(filePath) => {
    return await fse.readFile(filePath, 'utf8');
};

const renderIndexHtml = async({ theme, highlightTheme, transition, separator, separatorVertical, separatorNotes }) => {
    const template = await readFile(templatePath);
    const render = ejs.compile(template);
    return render({ theme, highlightTheme, transition, separator, separatorVertical, separatorNotes });
};

const responseIndex = async({ theme, highlightTheme, transition, separator, separatorVertical, separatorNotes }) => {
    return {
        body: await renderIndexHtml({
            theme,
            highlightTheme,
            transition,
            separator,
            separatorVertical,
            separatorNotes,
        }),
    };
};

const responses = {
    '/': responseIndex,
    '/index.html': responseIndex,
    '/node-reveal/reveal.md': async({ markdown }) => {
        return {
            body: await readFile(markdown),
        };
    },
};

const createServer = ({ markdown, theme, highlightTheme, transition, port, separator, separatorVertical, separatorNotes }) => {
    const server = new Koa();
    const markdownRelativePath = path.relative(projectRoot, path.dirname(markdown));

    server.use(async(ctx) => {
        const { path } = ctx.request;
        if (responses[path]) {
            const getResponse = responses[path];
            const { body } = await getResponse({
                markdown,
                theme,
                highlightTheme,
                transition,
                separator,
                separatorVertical,
                separatorNotes,
            });
            ctx.response.status = 200;
            ctx.response.body = body;
        } else if (path.startsWith('/reveal.js')) {
            await send(ctx, path.substr(10), { root: revealJsRoot });
        } else if (path.startsWith('/highlight.js')) {
            await send(ctx, path.substr(13), { root: highlightJsRoot });
        } else if (path.startsWith('/socket.io-client')) {
            await send(ctx, path.substr(17), { root: socketIoClientRoot });
        } else if (path.startsWith('/js-polyfills')) {
            await send(ctx, path.substr(13), { root: jsPolyfillsRoot });
        } else {
            // to resolve images and links relative to markdown
            await send(ctx, path, { root: markdownRelativePath });
        }
    });
    const nativeServer = server.listen(port);
    log.debug('[reveal]', 'server started on', port);
    return nativeServer;
};

const createSocket = (server, { markdown }) => {
    const markdownFilename = path.basename(markdown, '.md');

    const io = createSocketIo(server);
    io.on('connection', (socket) => {
        socket.on('disconnect', () => {
            socketSet.delete(socket);
            socket.emit('disconnected');
            log.debug('[reveal]', 'user disconnected', socketSet.size);
        });
        socketSet.add(socket);
        socket.emit('connected', { title: markdownFilename });
        log.debug('[reveal]', 'user connected', socketSet.size);

        socket.on('role-update', (role) => {
            if (role === 'master') {
                if (masterSocket) {
                    masterSocket.emit('role-tick');
                }
                masterSocket = socket;
            }
        });

        socket.on('slidechanged', (state) => {
            socketSet.forEach((sock) => {
                if (sock !== masterSocket) {
                    sock.emit('slidechanged', state);
                }
            });
        });
    });
};

const startWatch = ({ markdown }) => {
    const watcher = chokidar.watch(markdown);
    watcher.on('change', () => {
        socketSet.forEach((socket) => {
            socket.emit('reload');
        });
    });
};

const startServer = ({ markdown, theme, highlightTheme, transition, port, watch, separator, separatorVertical, separatorNotes }) => {
    const server = createServer({
        markdown,
        theme,
        highlightTheme,
        transition,
        port,
        separator,
        separatorVertical,
        separatorNotes,
    });
    createSocket(server, { markdown });
    if (watch) {
        startWatch({ markdown });
    }
    openBrowser(`http://${ip.address()}:${port}/?role=#/`);
};

const getValidThemes = async(matching, ext) => {
    const files = await glob(matching);
    return files.map((file) => {
        return path.basename(file, ext);
    });
};

const argsFormats = {
    markdown: async(input) => {
        const markdownExists = await fse.pathExists(input);
        if (!markdownExists) {
            log.error('[reveal]', 'Invalid markdown file');
            process.exit(1);
        }
        return input;
    },
    theme: async(input) => {
        const validThemes = await getValidThemes(path.join(revealJsRoot, 'css', 'theme', '*.css'), '.css');
        if (!validThemes.includes(input)) {
            log.error('[reveal]', 'Invalid theme.', 'Use:', validThemes.join('/'));
            process.exit(1);
        }
        return input;
    },
    highlightTheme: async(input) => {
        const validHighlightTheme = await getValidThemes(path.join(highlightJsRoot, 'styles', '*.css'), '.css');
        if (!validHighlightTheme.includes(input)) {
            log.error('[reveal]', 'Invalid highlight theme.', 'Use:', validHighlightTheme.join('/'));
            process.exit(1);
        }
        return input;
    },
    transition: async(input) => {
        const validTransitions = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'];
        if (!validTransitions.includes(input)) {
            log.error('[reveal]', 'Invalid transition.' + 'Use:', validTransitions.join('/'));
            process.exit(1);
        }
        return input;
    },
};

const parseArgs = async(args) => {
    const formattedArgs = {};
    const formatArgument = async(key) => {
        const format = argsFormats[key];
        const value = args[key];
        if (format) {
            return await format(value);
        }
        return value;
    };
    const formatJobs = Object.keys(args).map(async(key) => {
        return formattedArgs[key] = await formatArgument(key);
    });
    await Promise.all(formatJobs);
    return formattedArgs;
};

exports.command = 'server';
exports.describe = 'Start a nodejs server to display presentation';
exports.builder = {
    markdown: {
        demandOption: true,
        describe: 'markdown file',
        type: 'string',
    },
    theme: {
        default: 'solarized',
        type: 'string',
        describe: 'reveal.js theme',
    },
    highlightTheme: {
        default: 'solarized-light',
        type: 'string',
        describe: 'highlight.js theme',
    },
    transition: {
        default: 'slide',
        type: 'string',
        describe: 'reveal.js transition',
    },
    port: {
        default: 8080,
        describe: 'server port',
        type: 'number',
    },
    watch: {
        default: false,
        describe: 'watch markdown change',
        type: 'boolean',
    },
    separator: {
        default: '^\r?\n----\r?\n$',
        describe: 'horizontal slides separator',
        type: 'string',
    },
    separatorVertical: {
        default: '^\r?\n---\r?\n$',
        describe: 'vertical slides separator',
        type: 'string',
    },
    separatorNotes: {
        default: '^Note:',
        describe: 'speaker notes separator',
        type: 'string',
    },
};
exports.handler = async(args) => {
    const {
        markdown,
        theme,
        highlightTheme,
        transition,
        port,
        watch,
        separator,
        separatorVertical,
        separatorNotes,
    } = await parseArgs(args);
    startServer({
        markdown,
        theme,
        highlightTheme,
        transition,
        port,
        watch,
        separator,
        separatorVertical,
        separatorNotes,
    });
};
