"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyFormidable = exports.ajvBinaryFormat = exports.kFileSavedPaths = exports.kIsMultipartParsed = exports.kIsMultipart = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const formidable_1 = __importDefault(require("formidable"));
const fs = __importStar(require("fs"));
exports.kIsMultipart = Symbol.for('[FastifyMultipart.isMultipart]');
exports.kIsMultipartParsed = Symbol.for('[FastifyMultipart.isMultipartParsed]');
exports.kFileSavedPaths = Symbol.for('[FastifyMultipart.fileSavedPaths]');
const { IncomingForm } = formidable_1.default;
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
        if (request[exports.kIsMultipartParsed]) {
            request.log.warn('multipart already parsed, you probably need to check your code why it is parsed twice.');
            return { body: request.body, files: request.files };
        }
        const { fields, files } = await parse(request.raw);
        request[exports.kFileSavedPaths] = [];
        const body = Object.assign({}, fields);
        for (const key of Object.keys(files)) {
            let paths;
            if (Array.isArray(files[key])) {
                paths = [];
                for (const file of files[key]) {
                    paths.push(file.filepath);
                    request[exports.kFileSavedPaths].push(file.filepath);
                }
            }
            else {
                paths = files[key].filepath;
                request[exports.kFileSavedPaths].push(paths);
            }
            if ((options === null || options === void 0 ? void 0 : options.removeFilesFromBody) !== true)
                (body)[key] = paths;
        }
        request[exports.kIsMultipartParsed] = true;
        return { body, files };
    };
}
const plugin = async function (fastify, options) {
    var _a;
    if (typeof ((_a = options.formidable) === null || _a === void 0 ? void 0 : _a.uploadDir) === 'string') {
        await fs.promises.mkdir(options.formidable.uploadDir, { recursive: true });
    }
    const formidableOptions = options.formidable;
    fastify.decorateRequest(exports.kIsMultipart, false);
    fastify.decorateRequest(exports.kIsMultipartParsed, false);
    fastify.decorateRequest(exports.kFileSavedPaths, null);
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
            request[exports.kIsMultipart] = true;
            const requestFormidable = buildIncomingForm(formidableOptions);
            const parse = buildRequestParser(requestFormidable);
            const { body, files } = await parse(request);
            request.files = files;
            return body;
        });
    }
    else {
        fastify.addContentTypeParser('multipart', function (request, _, done) {
            request[exports.kIsMultipart] = true;
            done(null);
        });
    }
    if (options.addHooks === true) {
        fastify.addHook('preValidation', async function (request) {
            if (!request[exports.kIsMultipart])
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
const ajvBinaryFormat = function (ajv) {
    ajv.addFormat('binary', {
        type: 'string',
        validate(o) {
            return typeof o === 'string';
        }
    });
};
exports.ajvBinaryFormat = ajvBinaryFormat;
exports.FastifyFormidable = (0, fastify_plugin_1.default)(plugin, {
    fastify: '4.x',
    name: 'fastify-formidable',
    dependencies: []
});
exports.default = exports.FastifyFormidable;
//# sourceMappingURL=index.js.map