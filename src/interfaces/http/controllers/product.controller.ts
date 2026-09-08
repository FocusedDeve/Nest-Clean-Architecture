import { CreateProductUseCase, DeleteProductUseCase, GetProductUseCase, UpdateProductUseCase, UserProductUseCase } from "@application/use-cases/product";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { CreateProductRequestModel } from "../dto/requests/product/create-product.request";
import { CreateProductUseCaseInput, DeleteProductUseCaseInput, GetProductUseCaseOutput, UpdatedProductUseCaseInput, UserWithProductsOutput } from "@application/interfaces/product";
import { plainToInstance } from "class-transformer";
import { CoreResponse } from "@shared/core/response";
import { CreateProductResponseModel, GetProductOutputResponseModel, UpdatedProductResponseModel, UserWithProductsResponseModel } from "../dto/responses/product";
import { UpdateProductRequestModel } from "../dto/requests/product";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ApiCoreResponse, ApiInvalidIdResponse } from "../swagger";

@ApiTags('product')
@Controller('product')
export class ProductController {
    constructor(
        private readonly createProductCase: CreateProductUseCase,
        private readonly getProductCase: GetProductUseCase,
        private readonly updateProductCase: UpdateProductUseCase,
        private readonly deleteProductCase: DeleteProductUseCase,
        private readonly userWithProductCase: UserProductUseCase,
    ){}

    @Get()
    @ApiOperation({ summary: 'List every product' })
    @ApiCoreResponse(GetProductOutputResponseModel, {
        isArray: true,
        description: 'Returns all products.',
        codes: [
            { code: 400, meaning: 'the repository failed — note this route reports failures as 400, not 500' },
            { code: 204, meaning: 'no product in the database' },
        ],
    })
    async allProducts() : Promise<CoreResponse<GetProductOutputResponseModel[]>> {
        const results = await this.getProductCase.execute()
        const products: CoreResponse<GetProductUseCaseOutput[]> = CoreResponse.fromResult(results)

        if(products.data) {
            const responseData: GetProductOutputResponseModel[] = plainToInstance(GetProductOutputResponseModel, products.data)
            return CoreResponse.success(responseData)
        } else if (products.errors.length > 0) {
            return CoreResponse.fail(products.errors)
        } else {
            return CoreResponse.empty(204)
        }
        
    }

    @Get(':id')
    @ApiOperation({ summary: 'Fetch one product by id' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(GetProductOutputResponseModel, {
        isArray: true,
        description: 'The single product is still wrapped in an array, so the shape matches `GET /product`.',
        codes: [
            { code: 400, meaning: 'no product with that id, or the repository failed' },
            { code: 204, meaning: 'the use case returned neither data nor an error' },
        ],
    })
    @ApiInvalidIdResponse()
    async productById(
        @Param('id', ParseIntPipe) id: number
    ) : Promise<CoreResponse<GetProductOutputResponseModel[]>> {
        const result = await this.getProductCase.execute(id)
        const product: CoreResponse<GetProductUseCaseOutput[]> = CoreResponse.fromResult(result)

        if(product.data) {
            const responseData: GetProductOutputResponseModel[] = plainToInstance(GetProductOutputResponseModel, product.data)
            return CoreResponse.success(responseData)
        } else if (product.errors.length > 0) {
            return CoreResponse.fail(product.errors)
        } else {
            return CoreResponse.empty(204)
        }
    }

    @Post()
    @ApiOperation({ summary: 'Create a product' })
    @ApiCoreResponse(CreateProductResponseModel, {
        httpStatus: 201,
        successCode: 200,
        description: 'The body is not validated. Note the asymmetry with `POST /user`: the transport status is 201, but this route leaves `code` at its default 200.',
        codes: [
            { code: 400, meaning: 'creation failed' },
            { code: 204, meaning: 'the use case returned neither data nor an error' },
        ],
    })
    async create(@Body() requestModel: CreateProductRequestModel) : Promise<CoreResponse<CreateProductResponseModel>> {
        const productInput: CreateProductUseCaseInput = plainToInstance(CreateProductUseCaseInput, requestModel)
        const reuslt = await this.createProductCase.execute(productInput)
        const product: CoreResponse<GetProductUseCaseOutput> = CoreResponse.fromResult(reuslt)

        if(product.data) {
            const responseData: CreateProductResponseModel = plainToInstance(CreateProductResponseModel, product.data)
            return CoreResponse.success(responseData)
        }
        else if(product.errors.length > 0) {
            return CoreResponse.fail(product.errors)
        }
        else {
            return CoreResponse.empty(204)
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a product' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(UpdatedProductResponseModel, {
        description: 'The `id` in the body must equal the `id` in the path. Omitted fields are filled in by `UpdatedProductUseCaseInput.withDefaults()`, so this is a full replace, not a patch.',
        codes: [
            { code: 400, meaning: 'path and body `id` do not match, no product with that id, or the update failed' },
            { code: 204, meaning: 'the use case returned neither data nor an error' },
        ],
    })
    @ApiInvalidIdResponse()
    async updateProductById(
        @Param('id', ParseIntPipe) id: number,
        @Body() requestModel: UpdateProductRequestModel
    ):Promise<CoreResponse<UpdatedProductResponseModel>> {

        if(requestModel.id !== id) {
            return CoreResponse.fail(['Bad request'], 400)
        }

        const productInput: UpdatedProductUseCaseInput = plainToInstance(UpdatedProductUseCaseInput, requestModel).withDefaults()
        const result = await this.updateProductCase.execute(productInput)
        const resultProduct: CoreResponse<GetProductUseCaseOutput> = CoreResponse.fromResult(result)

        if(resultProduct.data) {
            const responseData: UpdatedProductResponseModel = plainToInstance(UpdatedProductResponseModel, resultProduct.data)
            return CoreResponse.success(responseData)
        } else if(resultProduct.errors.length > 0) {
            return CoreResponse.fail(resultProduct.errors)
        } else {
            return CoreResponse.empty(204)
        }
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a product' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(Boolean, {
        description: 'On success `data` is `true`.',
        codes: [
            { code: 400, meaning: '`id` is 0, or nothing was deleted' },
            { code: 404, meaning: 'the repository reported a failure' },
        ],
    })
    @ApiInvalidIdResponse()
    async deleteProductById(
        @Param('id', ParseIntPipe) id:number,
    ) : Promise<CoreResponse<Boolean>>{
        if(id === 0) return CoreResponse.fail(['Bad request'], 400)
        
        const deleteProductUseCaseInput: DeleteProductUseCaseInput = plainToInstance(DeleteProductUseCaseInput, { id })
        const deleteProduct = await this.deleteProductCase.execute(deleteProductUseCaseInput)

        if (deleteProduct.isSuccess && deleteProduct.getValue()) {
            return CoreResponse.success(true);
        } else if (deleteProduct.isFailure) {
            return CoreResponse.fail(deleteProduct.error || ["Deletion failed"], 404);
        } else {
            return CoreResponse.fail(["Product could not be deleted"], 400);
        }
    }

    @Get('/userwithproduct/:id')
    @ApiOperation({ summary: 'Fetch a user together with products' })
    @ApiParam({ name: 'id', type: 'integer', example: 1 })
    @ApiCoreResponse(UserWithProductsResponseModel, {
        isArray: true,
        description: 'Composes `GetUserUseCase` (exported by `UserModule`) with the product repository. Products are not filtered by owner: there is no relation between the two tables, so every product is attached to the user.',
        codes: [
            { code: 400, meaning: '`id` is 0, no user with that id, or the repository failed' },
            { code: 204, meaning: 'the use case returned neither data nor an error' },
        ],
    })
    @ApiInvalidIdResponse()
    async getUserWithProductByUserId(
        @Param('id', ParseIntPipe) id: number,
    ) : Promise<CoreResponse<UserWithProductsResponseModel[]>>{

        if(id === 0) return CoreResponse.fail(['Bad request'], 400)
        const exeResult = await this.userWithProductCase.executeUserWithProduct(id)
        const result:CoreResponse<UserWithProductsOutput[]> = CoreResponse.fromResult(exeResult)

        if(result.data) {
            const responseData: UserWithProductsResponseModel[] = plainToInstance(UserWithProductsResponseModel, result.data)
            return CoreResponse.success(responseData)
        }
        else if (result.errors.length > 0) {
            return CoreResponse.fail(result.errors)
        } else {
            return CoreResponse.empty(204)
        }
    }
}