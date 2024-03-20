import FastifyPlugin from 'fastify-plugin';
import FormidableNamespace from 'formidable';
import * as fs from 'fs';
export const kIsMultipart = Symbol.for('[FastifyMultipart.isMultipart]');
export const kIsMultipartParsed = Symbol.for('[FastifyMultipart.isMultipartParsed]');
export const kFileSavedPaths = Symbol.for('[FastifyMultipart.fileSavedPaths]');
const { IncomingForm } = FormidableNamespace;
function promisify(func) {
    return async function (request) {
        return await new Promise(function (resolve, reject) {
            func(request, function (err, fields, files) {
                if (err)
                    reject(err);
                resolve({ fields, files });
            });
        });
    };
}
function buildIncomingForm(options) {
    if (options instanceof IncomingForm)
        return options;
    return new IncomingForm(options);
}
function buildRequestParser(formidable) {
    const parse = promisify(formidable.parse.bind(formidable));
    return async function (request, options) {
        if (request[kIsMultipartParsed]) {
            request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.');
            return { body: request.body, files: request.files };
        }
        const { fields, files } = await parse(request.raw);
        request[kFileSavedPaths] = [];
        const body = Object.assign({}, fields);
        for (const key of Object.keys(files)) {
            let paths;
            if (Array.isArray(files[key])) {
                paths = [];
                for (const file of files[key]) {
                    paths.push(file.filepath);
                    request[kFileSavedPaths].push(file.filepath);
                }
            }
            else {
                paths = files[key].filepath;
                request[kFileSavedPaths].push(paths);
            }
            if ((options === null || options === void 0 ? void 0 : options.removeFilesFromBody) !== true)
                (body)[key] = paths;
        }
        request[kIsMultipartParsed] = true;
        return { body, files };
    };
}
const plugin = async function (fastify, options) {
    var _a;
    if (typeof ((_a = options.formidable) === null || _a === void 0 ? void 0 : _a.uploadDir) === 'string') {
        await fs.promises.mkdir(options.formidable.uploadDir, { recursive: true });
    }
    const formidableOptions = options.formidable;
    fastify.decorateRequest(kIsMultipart, false);
    fastify.decorateRequest(kIsMultipartParsed, false);
    fastify.decorateRequest(kFileSavedPaths, null);
    fastify.decorateRequest('files', null);
    fastify.decorateRequest('parseMultipart', async function (decoratorOptions) {
        const request = this;
        const requestFormidable = buildIncomingForm(decoratorOptions !== null && decoratorOptions !== void 0 ? decoratorOptions : formidableOptions);
        const parser = buildRequestParser(requestFormidable);
        const { body, files } = await parser(request, { removeFilesFromBody: options.removeFilesFromBody });
        request.body = body;
        request.files = files;
        return body;
    });
    if (options.addContentTypeParser === true && options.addHooks === true) {
        throw new Error('Cannot enable `addContentTypeParser` togather with `addHooks`');
    }
    if (options.addContentTypeParser === true) {
        fastify.addContentTypeParser('multipart', async function (request, _payload) {
            request[kIsMultipart] = true;
            const requestFormidable = buildIncomingForm(formidableOptions);
            const parse = buildRequestParser(requestFormidable);
            const { body, files } = await parse(request);
            request.files = files;
            return body;
        });
    }
    else {
        fastify.addContentTypeParser('multipart', function (request, _, done) {
            request[kIsMultipart] = true;
            done(null);
        });
    }
    if (options.addHooks === true) {
        fastify.addHook('preValidation', async function (request) {
            if (!request[kIsMultipart])
                return;
            const requestFormidable = buildIncomingForm(formidableOptions);
            const parse = buildRequestParser(requestFormidable);
            const { body, files } = await parse(request);
            request.body = body;
            request.files = files;
        });
    }
    if (options.removeFilesFromBody === true && (options.addHooks === true || options.addContentTypeParser === true)) {
        fastify.addHook('preHandler', function (request, _reply, done) {
            if (request.files !== null) {
                const keys = Object.keys(request.files);
                keys.forEach(function (key) {
                    delete request.body[key];
                });
            }
            done();
        });
    }
};
export const ajvBinaryFormat = function (ajv) {
    ajv.addFormat('binary', {
        type: 'string',
        validate(o) {
            return typeof o === 'string';
        }
    });
};
export const FastifyFormidable = FastifyPlugin(plugin, {
    fastify: '4.x',
    name: 'fastify-formidable',
    dependencies: []
});
export default FastifyFormidable;
//# sourceMappingURL=index.js.map