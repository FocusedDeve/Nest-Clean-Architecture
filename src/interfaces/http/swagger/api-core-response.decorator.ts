import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { CoreResponseSchema } from './core-response.schema';

type PayloadType = Type<unknown> | BooleanConstructor | StringConstructor | NumberConstructor;

/** A `code` value the route can put in the body, and what it means. */
export interface CoreResponseCode {
    code: number;
    meaning: string;
}

export interface ApiCoreResponseOptions {
    /** Transport status Nest actually sends. 200 everywhere except POST, which is 201. */
    httpStatus?: number;
    /** Value of the body's `code` on success. Defaults to `httpStatus`. */
    successCode?: number;
    /** `true` when `data` is an array of `model`. */
    isArray?: boolean;
    /** What the route does. */
    description?: string;
    /** Failure / empty outcomes, each still delivered with `httpStatus`. */
    codes?: CoreResponseCode[];
}

const isPrimitive = (model: PayloadType): boolean =>
    model === Boolean || model === String || model === Number;

const dataSchemaFor = (model: PayloadType, isArray: boolean): Record<string, unknown> => {
    const item =
        model === Boolean
            ? { type: 'boolean' }
            : model === String
              ? { type: 'string' }
              : model === Number
                ? { type: 'number' }
                : { $ref: getSchemaPath(model as Type<unknown>) };

    return isArray ? { type: 'array', items: item } : item;
};

/**
 * Documents a route that returns `CoreResponse<T>`.
 *
 * Controllers here never throw and never set the transport status: they always
 * resolve with a `CoreResponse` body, so Nest sends 200 (201 on POST) whatever
 * the outcome. A plain `@ApiResponse({ status: 404 })` would therefore be a
 * lie. This decorator declares the single status the route really emits and
 * lists the possible body `code` values in the description instead.
 */
export const ApiCoreResponse = (
    model: PayloadType,
    options: ApiCoreResponseOptions = {},
): MethodDecorator & ClassDecorator => {
    const { httpStatus = 200, successCode = httpStatus, isArray = false, description, codes = [] } = options;

    const outcomes = [{ code: successCode, meaning: 'success' }, ...codes]
        .map(({ code, meaning }) => `- \`code: ${code}\` — ${meaning}`)
        .join('\n');

    const fullDescription = [
        description,
        `Transport status is always \`${httpStatus}\`; read \`code\` in the body for the outcome.`,
        `Possible \`code\` values:\n\n${outcomes}`,
    ]
        .filter(Boolean)
        .join('\n\n');

    const extraModels: Type<unknown>[] = [CoreResponseSchema];
    if (!isPrimitive(model)) {
        extraModels.push(model as Type<unknown>);
    }

    return applyDecorators(
        ApiExtraModels(...extraModels),
        ApiResponse({
            status: httpStatus,
            description: fullDescription,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(CoreResponseSchema) },
                    {
                        properties: {
                            code: { type: 'integer', example: successCode },
                            data: dataSchemaFor(model, isArray),
                        },
                    },
                ],
            },
        }),
    );
};

/**
 * The one status these controllers do NOT produce themselves: `ParseIntPipe`
 * rejects a non-numeric `:id` before the handler runs, so the client gets a
 * real HTTP 400 carrying Nest's own error shape, not a `CoreResponse`.
 */
export const ApiInvalidIdResponse = (): MethodDecorator & ClassDecorator =>
    ApiResponse({
        status: 400,
        description:
            '`:id` is not an integer. Rejected by `ParseIntPipe` before the handler, so the body is Nest\'s standard error shape (`{ statusCode, message, error }`), not a `CoreResponse`.',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'integer', example: 400 },
                message: { type: 'string', example: 'Validation failed (numeric string is expected)' },
                error: { type: 'string', example: 'Bad Request' },
            },
        },
    });
