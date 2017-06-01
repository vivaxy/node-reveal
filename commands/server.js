/**
 * @since 2017-05-31 19:42:13
 * @author vivaxy
 */

const ejs = require('ejs');
const Koa = require('koa');
const log = require('log-util');
const fse = require('fs-extra');
const send = require('koa-send');

const renderIndexHtml = async() => {
    const template = await fse.readFile('./template/index.ejs', 'utf8');
    const render = ejs.compile(template);
    return render({
        title: 'test',
        markdown: 'test/test.md',
    });
};

const responses = {
    '/': async() => {
        return {
            body: await renderIndexHtml(),
        };
    },
    '/node-reveal/reveal.md': async({ markdown }) => {
        return {
            body: await fse.readFile(markdown, 'uft9'),
        };
    },
};

const createServer = ({ markdown, port }) => {
    const server = new Koa();
    server.use(async(ctx) => {
        const { path } = ctx.request;
        if (responses[path]) {
            const getResponse = responses[path];
            const { body } = await getResponse({ markdown });
            ctx.response.status = 200;
            ctx.response.body = body;
        } else {
            await send(ctx, path);
        }
    });
    server.listen(port);
    log.debug('[reveal]', 'server started on', port);
};

const checkParameters = async({ markdown, port }) => {
    const markdownExists = await fse.pathExists(markdown);
    if (!markdownExists) {
        log.error('[reveal]', 'markdown is required');
        process.exit(1);
    }
};

exports.command = 'server';
exports.describe = 'Start a nodejs server to display presentation';
exports.builder = {};
exports.handler = async({ markdown, port = 8080 }) => {
    await checkParameters({ markdown, port });
    createServer({ markdown, port });
};
