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
const glob = require('glob-promise');
const chokidar = require('chokidar');
const createSocketIo = require('socket.io');
const openBrowser = require('react-dev-utils/openBrowser');

const projectRoot = process.cwd();
const nodeRevealRoot = path.join(__dirname, '..');
const revealJsRoot = path.join(require.resolve('reveal.js'), '..', '..');
const highlightJsRoot = path.join(require.resolve('highlight.js'), '..', '..');
const socketIoClientRoot = path.join(require.resolve('socket.io-client'), '..', '..');
const templatePath = path.join(nodeRevealRoot, './template/index.ejs');

const socketSet = new Set();

const readTextFile = async(filePath) => {
    return await fse.readFile(filePath, 'utf8');
};

const getResponseType = (filename) => {
    return path.extname(filename);
};

const renderIndexHtml = async({ theme, highlightTheme, transition, separator, separatorVertical, separatorNotes }) => {
    const template = await readTextFile(templatePath);
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

const createKoaSpecificPathMiddleware = ({ markdown, theme, highlightTheme, transition, separator, separatorVertical, separatorNotes }) => {
    const responses = {
        '/': responseIndex,
        '/index.html': responseIndex,
        '/node-reveal/reveal.md': async({ markdown }) => {
            return {
                body: await readTextFile(markdown),
            };
        },
    };

    return async(ctx, next) => {
        const { path } = ctx.request;
        const getResponse = responses[path];
        if (getResponse) {
            const { body } = await getResponse({
                markdown,
                theme,
                highlightTheme,
                transition,
                separator,
                separatorVertical,
                separatorNotes,
            });
            ctx.response.body = body;
            ctx.response.type = getResponseType(path);
        } else {
            await next();
        }
    };
};

const createKoaBeginningPathMiddleware = ({ markdown }) => {
    const send = async(ctx, relativePath, root) => {
        ctx.response.body = await fse.readFile((path.join(root, relativePath)));
        ctx.response.type = getResponseType(relativePath);
    };

    const responsesForBeginningPath = {
        '/reveal.js': async(ctx, path) => {
            await send(ctx, path, revealJsRoot);
        },
        '/highlight.js': async(ctx, path) => {
            await send(ctx, path, highlightJsRoot);
        },
        '/socket.io-client': async(ctx, path) => {
            await send(ctx, path, socketIoClientRoot);
        },
    };

    const markdownRelativePath = path.relative(projectRoot, path.dirname(markdown));

    return async(ctx) => {
        const { path } = ctx.request;

        const [_1, beginningPath, ...restPath] = path.split('/');
        const getResponseForBeginningPath = responsesForBeginningPath[`/${beginningPath}`];
        if (getResponseForBeginningPath) {
            await getResponseForBeginningPath(ctx, `/${restPath.join('/')}`);
        } else {
            // to resolve images and links relative to markdown
            await send(ctx, path, markdownRelativePath);
        }
    };
};

const createServer = ({ markdown, theme, highlightTheme, transition, port, separator, separatorVertical, separatorNotes }) => {
    const server = new Koa();

    server.use(createKoaSpecificPathMiddleware({
        markdown,
        theme,
        highlightTheme,
        transition,
        separator,
        separatorVertical,
        separatorNotes,
    }));
    server.use(createKoaBeginningPathMiddleware({ markdown }));
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
    openBrowser(`http://${ip.address()}:${port}/`);
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
exports.describe = 'Start a local server';
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
