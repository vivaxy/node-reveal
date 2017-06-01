/**
 * @since 2017-05-31 19:42:13
 * @author vivaxy
 */

const ejs = require('ejs');
const Koa = require('koa');
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
};

const createServer = ({ port }) => {
    const server = new Koa();
    server.use(async(ctx) => {
        const { path } = ctx.request;
        if (responses[path]) {
            const getResponse = responses[path];
            const { body } = await getResponse();
            ctx.response.status = 200;
            ctx.response.body = body;
        } else {
            await send(ctx, path);
        }
    });
    server.listen(port);
};

exports.command = 'server';
exports.describe = 'Start a nodejs server to display presentation';
exports.builder = {};
exports.handler = async({ port = 8080 }) => {
    createServer({ port });
};
