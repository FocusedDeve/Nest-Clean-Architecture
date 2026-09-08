import { ApiProperty } from '@nestjs/swagger';

/**
 * OpenAPI shape of `CoreResponse<T>` (`@shared/core/response`).
 *
 * `CoreResponse` itself stays free of Swagger decorators: it is a shared
 * primitive, while documenting HTTP is a concern of the delivery layer only.
 * This class mirrors it for the generator, and `ApiCoreResponse` swaps `data`
 * for the real payload schema through an `allOf`.
 */
export class CoreResponseSchema {
    @ApiProperty({
        type: 'integer',
        example: 200,
        description:
            'Business status code. This is the value to branch on — the transport status is always 200 (or 201 on POST).',
    })
    code: number;

    @ApiProperty({
        nullable: true,
        description: 'Payload. `null` on failure and on an empty result (`code: 204`).',
    })
    data: unknown;

    @ApiProperty({
        type: [String],
        example: [],
        description: 'Error messages. Empty on success.',
    })
    errors: string[];
}
