import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { CoreResponse } from "@shared/core/response";
import { CreateUserUseCase, DeleteUserUseCase, GetUserUseCase, UpdateUserUseCase } from "@application/use-cases/user";
import { Result } from "@domain/core/result";
import { CreateUserResponseModel, GetUserOutputResponseModel, UpdatedUserResponseModel } from "../dto/responses/user";
import { CreateUserUseCaseInput, DeleteUserUseCaseInput, GetUserUseCaseOutput, UpdatedUserUseCaseInput } from "@application/interfaces/user";
import { CreateUserRequestModel, UpdateUserRequestModel } from "../dto/requests/user";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiCoreResponse, ApiInvalidIdResponse } from "../swagger";

@ApiTags('user')
@Controller('user')
export class UserController {
    constructor(
        private readonly createUserCase: CreateUserUseCase,
        private readonly getUserCase: GetUserUseCase,
        private readonly updateUserCase: UpdateUserUseCase,
        private readonly deleteUserCase: DeleteUserUseCase
    ){}

    @Get()
    @ApiOperation({ summary: 'List every user' })
    @ApiCoreResponse(GetUserOutputResponseModel, {
        isArray: true,
        description: 'Returns all users.',
        codes: [
            { code: 204, meaning: 'no user in the database — `data` is `null`, not an empty array' },
            { code: 500, meaning: 'the repository failed' },
        ],
    })
    async allUser() : Promise<CoreResponse<GetUserOutputResponseModel[]>> {
        // Assuming GetUserUseCase.execute() now returns Result<GetUserUseCaseOutput[]>
        const usersResult: Result<GetUserUseCaseOutput[]> = await this.getUserCase.execute();

        if (usersResult.isSuccess) {
            const usersData = usersResult.getValue();
            if (!usersData || usersData.length === 0) {
                return CoreResponse.empty(204);
            }
            const responseData: GetUserOutputResponseModel[] = plainToInstance(GetUserOutputResponseModel, usersData);
            return CoreResponse.success(responseData, 200);
        } else {
            const errorMessages = usersResult.error || ['An unknown error occurred while fetching users'];
            
            return CoreResponse.fail(errorMessages, 500);
        }
    }

    @Get(':id')
    @ApiOperation({ summary: 'Fetch one user by id' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(GetUserOutputResponseModel, {
        isArray: true,
        description: 'The single user is still wrapped in an array, so the shape matches `GET /user`.',
        codes: [
            { code: 404, meaning: 'no user with that id' },
            { code: 500, meaning: 'the repository failed' },
        ],
    })
    @ApiInvalidIdResponse()
    async userById(
        @Param('id', ParseIntPipe) id: number
    ) : Promise<CoreResponse<GetUserOutputResponseModel[]>> 
    {
        // Assuming GetUserUseCase.execute(id) now returns Result<GetUserUseCaseOutput[]>
        const userResult: Result<GetUserUseCaseOutput[]> = await this.getUserCase.execute(id);

        if (userResult.isSuccess) {
            const userData = userResult.getValue();
            if (!userData || userData.length === 0) {
                return CoreResponse.empty(204); // No content
            }
            const responseData: GetUserOutputResponseModel[] = plainToInstance(GetUserOutputResponseModel, userData);
            return CoreResponse.success(responseData, 200);
        } else {
            const errorMessages = userResult.error || [`An unknown error occurred while fetching user with ID ${id}`];
            if (errorMessages.some(msg => msg.includes('not found'))) {
                return CoreResponse.fail(errorMessages, 404);
            }
            return CoreResponse.fail(errorMessages, 500);
        }
    }

    @Post()
    @ApiOperation({ summary: 'Create a user' })
    @ApiCoreResponse(CreateUserResponseModel, {
        httpStatus: 201,
        successCode: 201,
        description: 'The body is not validated: there is no global `ValidationPipe` and the request model carries no constraints.',
        codes: [
            { code: 409, meaning: 'the repository reported the user already exists' },
            { code: 400, meaning: 'any other creation failure' },
            { code: 500, meaning: 'creation reported success but returned no data' },
        ],
    })
    async create(@Body() requestModel: CreateUserRequestModel) : Promise<CoreResponse<CreateUserResponseModel>> {
        const userInput: CreateUserUseCaseInput = plainToInstance(CreateUserUseCaseInput, requestModel);
        
        const result = await this.createUserCase.execute(userInput); // result is Result<GetUserUseCaseOutput>

        if (result.isSuccess) {
            const userData = result.getValue();
            if (!userData) {
                return CoreResponse.fail(['User creation succeeded but returned no data'], 500);
            }
            const responseData: CreateUserResponseModel = plainToInstance(CreateUserResponseModel, userData);
            return CoreResponse.success(responseData, 201);
        } else {
            const errorMessages = result.error || ['An unknown error occurred'];
            if (errorMessages.some(msg => msg.includes('already exists'))) { // Example of specific error handling
                return CoreResponse.fail(errorMessages, 409);
            }
            return CoreResponse.fail(errorMessages, 400);
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a user' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(UpdatedUserResponseModel, {
        description: 'The `id` in the body must equal the `id` in the path.',
        codes: [
            { code: 400, meaning: 'path and body `id` do not match, or the update failed' },
            { code: 404, meaning: 'no user with that id' },
            { code: 500, meaning: 'the update reported success but returned no data' },
        ],
    })
    @ApiInvalidIdResponse()
    async updateUserById(
        @Param('id', ParseIntPipe) id:number,
        @Body() requestModel: UpdateUserRequestModel
    ) : Promise<CoreResponse<UpdatedUserResponseModel>> {

        if(requestModel.id !== id) {
            return CoreResponse.fail(['Bad request: ID in path and body do not match'], 400);
        }

        const userInput: UpdatedUserUseCaseInput = plainToInstance(UpdatedUserUseCaseInput, requestModel);
        // Assuming UpdateUserUseCase.execute() now returns Result<GetUserUseCaseOutput>
        const resultUser: Result<GetUserUseCaseOutput> = await this.updateUserCase.execute(userInput);

        if (resultUser.isSuccess) {
            const userData = resultUser.getValue();
            if (!userData) {
                return CoreResponse.fail(['User update succeeded but returned no data'], 500);
            }
            const responseData: UpdatedUserResponseModel = plainToInstance(UpdatedUserResponseModel, userData);
            return CoreResponse.success(responseData, 200);
        } else {
            const errorMessages = resultUser.error || ['An unknown error occurred during user update'];
            if (errorMessages.some(msg => msg.includes('not found'))) {
                return CoreResponse.fail(errorMessages, 404); // Not Found
            }
            return CoreResponse.fail(errorMessages, 400);
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(Boolean, {
        description: 'On success `data` is `true`.',
        codes: [
            { code: 400, meaning: '`id` is 0' },
            { code: 404, meaning: 'nothing was deleted — most likely no user with that id' },
            { code: 500, meaning: 'the repository failed' },
        ],
    })
    @ApiInvalidIdResponse()
    async deleteUserById(
        @Param('id', ParseIntPipe) id:number,
    ):Promise<CoreResponse<Boolean>> {
        if(id === 0 ) return CoreResponse.fail(['Bad request: ID cannot be 0'], 400);

        const deleteUserUseCaseInput: DeleteUserUseCaseInput = plainToInstance(DeleteUserUseCaseInput, {id});
        
        const deleteUserResult: Result<boolean> = await this.deleteUserCase.execute(deleteUserUseCaseInput);

        if (deleteUserResult.isSuccess) {
            const isDeleted = deleteUserResult.getValue();
            if (isDeleted) {
                return CoreResponse.success(true, 200);
            } else {
                // If isDeleted is false, it might mean user not found or some other issue
                return CoreResponse.fail(['User could not be deleted, possibly not found'], 404);
            }
        } else {
            const errorMessages = deleteUserResult.error || ['An unknown error occurred during user deletion'];
            if (errorMessages.some(msg => msg.includes('not found'))) {
                return CoreResponse.fail(errorMessages, 404); 
            }
            return CoreResponse.fail(errorMessages, 500);
        }
    }
}