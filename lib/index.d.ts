import { type FastifyPluginAsync } from 'fastify';
import type { Fields, Files, Options } from 'formidable';
import type Formidable from 'formidable/Formidable';
export declare const kIsMultipart: unique symbol;
export declare const kIsMultipartParsed: unique symbol;
export declare const kFileSavedPaths: unique symbol;
declare module 'fastify' {
    interface FastifyRequest {
        files: Files | null;
        parseMultipart: <Payload = Fields>(this: FastifyRequest, options?: Formidable | Options) => Promise<Payload>;
        [kIsMultipart]: boolean;
        [kIsMultipartParsed]: boolean;
        [kFileSavedPaths]: string[];
    }
}
export interface FastifyFormidableOptions {
    addContentTypeParser?: boolean;
    addHooks?: boolean;
    removeFilesFromBody?: boolean;
    formidable?: Formidable | Options;
}
export type { Fields, File, Files } from 'formidable';
export declare const ajvBinaryFormat: (ajv: any) => void;
export declare const FastifyFormidable: FastifyPluginAsync<FastifyFormidableOptions>;
export default FastifyFormidable;
