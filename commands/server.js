/**
 * @since 2017-05-31 19:42:13
 * @author vivaxy
 */

/**
 * todo
 *  - open browser
 *  - use resolve instead of git submodule
 */

const path = require('path');

const ejs = require('ejs');
const Koa = require('koa');
const log = require('log-util');
const fse = require('fs-extra');
const send = require('koa-send');
const glob = require('glob-promise');
const chokidar = require('chokidar');
const createSocketIo = require('socket.io');

const projectRoot = process.cwd();
const revealRoot = path.join(__dirname, '..');
const templatePath = path.join(revealRoot, './template/index.ejs');

const socketSet = new Set();
let masterSocket = null;

const readFile = async(filePath) => {
    return await fse.readFile(filePath, 'utf8');
};

const renderIndexHtml = async({ theme, highlightTheme, transition }) => {
    const template = await readFile(templatePath);
    const render = ejs.compile(template);
    return render({ theme, highlightTheme, transition });
};

const responseIndex = async({ theme, highlightTheme, transition }) => {
    return {
        body: await renderIndexHtml({ theme, highlightTheme, transition }),
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
    '/socket.io-client/dist/socket.io.js': async() => {
        const filePath = require.resolve('socket.io-client');
        return {
            body: await readFile(path.join(filePath, '../../dist/socket.io.js')),
        };
    },
};

const createServer = ({ markdown, theme, highlightTheme, transition, port }) => {
    const server = new Koa();
    const markdownRelativePath = path.relative(projectRoot, path.dirname(markdown));

    server.use(async(ctx) => {
        const { path } = ctx.request;
        if (responses[path]) {
            const getResponse = responses[path];
            const { body } = await getResponse({ markdown, theme, highlightTheme, transition });
            ctx.response.status = 200;
            ctx.response.body = body;
        } else if (path.startsWith('/reveal.js') || path.startsWith('/highlight.js')) {
            await send(ctx, path, { root: revealRoot });
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

const startServer = ({ markdown, theme, highlightTheme, transition, port, watch }) => {
    const server = createServer({ markdown, theme, highlightTheme, transition, port });
    createSocket(server, { markdown });
    if (watch) {
        startWatch({ markdown });
    }
};

const getValidThemes = async(base) => {
    const files = await glob(base + '/*.css');
    return files.map((file) => {
        return path.basename(file, '.css');
    });
};

const argsFormats = {
    markdown: async(input) => {
        const markdownExists = await fse.pathExists(input);
        if (!markdownExists) {
            log.error('[reveal]', '`markdown` is required');
            process.exit(1);
        }
        return input;
    },
    theme: async(input) => {
        const validThemes = await getValidThemes(path.join(revealRoot, 'reveal.js', 'css', 'theme'));
        if (!validThemes.includes(input)) {
            log.error('[reveal]', 'Invalid theme.', 'Use:', validThemes.join('/'));
            process.exit(1);
        }
        return input;
    },
    highlightTheme: async(input) => {
        const validHighlightTheme = await getValidThemes(path.join(revealRoot, 'highlight.js', 'src', 'styles'));
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
    port: (input) => {
        return Number(input);
    },
    watch: (input = false) => {
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
};
exports.handler = async(args) => {
    const { markdown, theme, highlightTheme, transition, port, watch } = await parseArgs(args);
    startServer({ markdown, theme, highlightTheme, transition, port, watch });
};
